---
title: "Java 对话历史落盘：程序崩溃后，半轮记录怎么办？"
description: "校验追加日志、142种截断前缀和三个真实异常退出子进程，明确本地提交与远端幂等的边界。"
slug: "/ai-apps/java-durable-turns"
status: "published"
published_at: "2026-10-07"
updated: 2026-11-13
reading_minutes: 9
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:java-durable-turns", "project:hohoo-ai-lab", "doc:ai-apps/java-context-wire-budget"]
---

<span id="published-correction"></span>

> **2026-11-13 修订代码已发布。** [固定版本与运行说明](https://github.com/VirtualSelect/hohoo-ai-lab/tree/fdea0d8cc8c0a986deee47718cddbe1288afabed/demos/14-turn-flow)现可获取。下文“本地分支／尚未发布”的说明保留为2026-11-12复核时的状态；历史固定命令仍用于原实验归档，不能用于查找新修订。使用修订时，在配套仓库根目录执行`git checkout fdea0d8cc8c0a986deee47718cddbe1288afabed`，再按对应目录README运行，输出使用新目录。历史结果与AI辅助披露不变。

[固定版本代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant) · [原始证据](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant/evidence/20261007) · [实验档案](/labs/java-durable-turns)

内存里的整轮提交只在进程活着时有意义。把历史每次覆盖写成一个JSON文件，也会引入新问题：写到一半退出后，整个文件可能不能解析。本文把已经验收的问答作为追加记录，并明确说明哪些损坏能恢复、哪些必须拒绝打开。

范围是单写者、本地小文件。没有数据库、多用户服务或在线模型调用；测试刻意让子进程用 Runtime.halt(23) 退出，再由另一个JVM重开文件。

## 一轮是一条记录，不是两次独立写入

~~~text
JSON {id, question, answer}
        ↓ UTF-8
Base64(payload) + 空格 + SHA256(payload) + 换行
        ↓ 写完全部字节
FileChannel.force(true)
        ↓
更新内存历史、向调用者确认
~~~

换行是完成记录的边界；Base64让正文内的换行不会混淆边界，代价是文件变大。SHA256帮助发现意外损坏，不是鉴权：能修改文件的人也能重算校验和。本例不能防御恶意本地篡改。

写入先于内存更新，force先于成功返回。在系统允许的范围内，这减少“告诉调用者成功但内容仍仅在程序缓冲区”的窗口。[Java8 FileChannel文档](https://docs.oracle.com/javase/8/docs/api/java/nio/channels/FileChannel.html)也说明该保证与存储设备类型相关；本轮没有断电试验或网络文件系统验证。

## 恢复规则必须保守

打开时按完整行逐条验证格式、校验和与重复ID。如果最后还有没有换行的尾巴，截回最后一条完整记录；如果一条已经完整的记录校验失败，则拒绝打开。不能为了“修复成功”跳过中间坏行继续拼接历史，否则会掩盖数据丢失。

本例限制文件4MiB，并持有排他FileLock；第二写者被拒绝。同步程序只在一个拥有者线程使用它，不声称提供数据库隔离级别。

| 故障位置 | 重启后完整轮数 | 解释 |
| --- | --- | --- |
| 第二轮写入之前退出 | 1 | 没有新提交 |
| 第二条记录写入一半后退出 | 1 | 清除未完成尾部 |
| 第二轮提交并force后退出 | 2 | 完整记录被恢复 |

这三个案例真的启动并异常结束了子JVM，不是把“失败”字符串写进结果。除此之外，第二条142字节记录的每个未完成前缀都检查过；完整记录的损坏另行测试为拒绝打开。

## 去重能解决什么

同一ID、同一问题再次提交会返回原答案；相同ID用于另一问题则拒绝。调用远端前可先 find(id)，避免把已有本地结果重复生成。

但有一个无法靠此日志消除的窗口：

~~~text
远端已生成答案 → 本地尚未落盘 → 进程退出
~~~

重启后没有记录，不代表远端没执行。本例既没有事务性远端API，也没有提供商幂等凭证，因此不承诺“模型恰好调用一次”。日志中的去重，只是本地已提交回合的去重。

## 复现与练习

跑完 Suite 后，再看 before.log、partial.log、committed.log 与 crashes.json。前两个文件只有一轮，第三个有两轮；turns.log则是刻意破坏的负例，不能拿它当健康样本。

练习：把完整记录的一个Base64字符改掉但不改校验和，预期打开失败。然后只把最后一行截短，预期旧完整轮仍可恢复。不要在真实聊天文件上练习，使用新目录。

若遇到“journal already open”，先查第二个进程或尚未关闭的实例；若遇到完整记录损坏，保留原文件并排查存储与写入链，不应自动清空。写入异常后应结束本次使用并重新打开恢复，不在同一个可能含部分写入的实例上继续追加。

三个部件可以按“读取已提交历史 → 选择请求上下文 → 执行有预算的操作 → 验收回答 → 提交完整轮”组合。2026-10-07这一版只交付这些可验证部件，完整在线助手仍需请求语义、模型边界和真实端到端验证。

## 从干净目录复现

需要 Java 8、Python 3、Gson 2.10.1。请将两个路径替换为自己的 JDK 和 jar；既有工程可复用 Maven 缓存。

~~~sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 02a2660e22c969e70e3a6f095003614a7dfa448e
python demos/11-bounded-assistant/run.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out outputs/my-run
python demos/11-bounded-assistant/audit.py outputs/my-run
~~~

输出目录必须不存在。本机验证环境为 Windows，Linux/macOS尚未复测。不需要模型密钥或付费服务。manifest中的代码冻结提交早于上方含证据的归档提交，源码哈希对应实际执行文件。

## 一轮对话的整合参考

前面的日志解决“已经提交的问答怎样恢复”，却没有决定HTTP返回后是否应该提交。把这些部件串起来，最容易犯的错，是先保存用户问题，再等回复；或者收到文本就落盘，忘记用户已经取消。

本地补充实现 `demos/14-turn-flow` 把这条路径放进一个协调器。它复用上面固定版本中的 `ContextBudget` 和 `TurnJournal`，没有修改旧实验。**本节是AI辅助实现与运行的离线参考，尚未由作者人工复现；整合代码仍在本地分支，尚无已发布的固定提交。** 它不在上方的2026-10-07检出版本中。

~~~text
读取完整历史 → 投影本次请求 → 单次发送 → 验收完整回答 → 提交整轮
    ↑ 同ID已提交则复用             ↓ 失败、观察到取消或期限耗尽
    └─────────────────────       保留旧历史，丢弃候选
~~~

### 两次检查之间，哪些事已经发生？

`TurnFlow.ask`先核对请求ID。同ID、同问题在重开日志后可返回原答案；同ID却换了问题则拒绝，不能只因为ID相同就返回另一问题的答案。没有已提交结果时，才选择请求窗口并调用回复适配器。

下面是协调器内的关键顺序摘录，不是独立可编译文件；参数检查、拥有者线程限制及重开要求见完整本地实现。

~~~java
ContextBudget.Selection selected = ContextBudget.select(
    system, journal.history(), question, maxRequestBytes);
String answer = source.generateOnce(
    selected.payload, remaining(deadline, cancelled));
remaining(deadline, cancelled);
if (answer == null || answer.trim().isEmpty()
    || answer.getBytes(StandardCharsets.UTF_8).length > maxAnswerBytes) {
    throw new IOException("answer rejected by the plain-text contract");
}
remaining(deadline, cancelled);
try {
    answer = journal.commit(id, question, answer);
} catch (IOException failedCommit) {
    unusable = true; // 写入可能只完成一部分，不能在此实例上接着追加。
    throw failedCommit;
}
~~~

这里的回答契约只有非空纯文本及512个UTF-8字节，不是事实核验。171个“中”已经有513字节：按字符数检查会漏过这组输入。需要结构化输出时，应接入[输出验收](/docs/ai-apps/java-structured-output)，而不是把“非空”当成业务可用。

取消与期限也是检查点语义。测试在回复到达后、提交检查前设置取消，候选确实没有写入；但若取消与最后检查之后的写盘竞争，不能声称它撤销了已经提交的轮。这里只限制同一协调器的拥有者线程，不能让多个协调器共享日志来绕过约定。

### 接收请求数，和新增问答数分开看

回复来自真实回环HTTP服务的固定规则，不是模型。下表只摘出16个固定场景中的几项；“旧历史”是事先写入的测试问答，不计作新增成果。重开一行只统计同一JVM中关闭并重开日志后的复用阶段，首次写入已在此前完成。

| 本地阶段 | 该阶段收到请求 | 该阶段新增完整轮 | 应理解成什么 |
| --- | --- | --- | --- |
| 正常连续两轮 | 2 | 2 | 第二次请求带上第一轮问答 |
| 请求窗口裁掉最早一轮 | 1 | 1 | 请求只带最近一轮，磁盘仍保留三轮 |
| 回复后、提交检查前取消 | 1 | 0 | 不接纳候选，不代表远端没处理 |
| 服务端读完请求后不回复 | 1 | 0 | 本地没有结果，远端状态仍不能靠它判断 |
| 重开后复用同ID结果 | 新增0次 | 新增0轮 | 复用已有提交；同ID不同问题仍拒绝 |

空白回答、503、期限检查失败、畸形UTF-8和超出体积限制的响应也保留原来的完整问答。提交IO错误使用真实的关闭通道触发，验证协调器要求重开；它不是新的断电或崩溃实验。期限案例使用受控单调时钟，不用于报告网络延迟。

`generateOnce`没有应用层重试循环，测试适配器也关闭自动跳转并启用[固定长度流式写入](https://docs.oracle.com/javase/8/docs/api/java/net/HttpURLConnection.html#setFixedLengthStreamingMode-int-)。丢失回复的本次运行中，接收端只记录一份POST。此前的`RetryBudget`用于明确可安全重试的读取，不能直接套在生成请求上；更完整的重试身份问题见[幂等重试](/docs/ai-apps/java-idempotent-retry)。

### 本地补充代码怎样运行

**先取得本轮整合代码。** 当前只在本地配套仓库的`codex/bounded-turn-flow-20261112`分支，尚未推送；如果只有上方固定提交，请运行原Demo 11，不要在那个提交中寻找Demo 14。正式归档前不补造固定版本链接。

~~~sh
python demos/14-turn-flow/run.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out demos/14-turn-flow/out/my-run
python demos/14-turn-flow/audit.py demos/14-turn-flow/out/my-run --verify-sources
~~~

查看`lost.log`和`requests.json`：前者只剩旧完整轮，后者仍有服务端已读到的请求。再比较`project-not-delete.log`与该场景的请求，确认“没发出去”不等于“被删除”。输出目录已存在会停止，避免覆盖自己的结果。

运行没有读取密钥、调用模型或接入新服务。回环 Socket 的可中断读取现有[连接取消整合补充](/docs/ai-apps/java-transport-cancellation#把连接取消接到整轮落盘)。真实提供商适配和并发提交协议仍待处理；本地整合通过不等于完整在线助手已经交付。
