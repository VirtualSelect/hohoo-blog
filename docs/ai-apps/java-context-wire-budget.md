---
title: "Java 会话历史与请求窗口：裁掉的旧事实还能回来吗？"
description: "通过裁剪、提交、重启和扩窗的连续实验，分离可回看的完整历史与一次模型请求的上下文。"
slug: "/ai-apps/java-context-wire-budget"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:java-context-wire-budget", "project:hohoo-ai-lab", "doc:ai-apps/java-transactional-history"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant) · [原始证据](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant/evidence/20261007) · [实验档案](/labs/java-context-wire-budget)

[事务式会话历史](/docs/ai-apps/java-transactional-history)已经实现完整轮裁剪、UTF-8请求预算和失败回滚。这篇不重新发明这些规则，而是追问一个产品问题：当裁剪后的候选历史被提交后，用户还能回看被裁掉的旧轮吗？

旧方案把有界候选作为下一轮历史，适合只需要短期会话窗口的应用。本篇选择另一种语义：追加日志保存完整已确认问答，ContextBudget每次只生成请求投影。**“本次不发送”与“从记录中删除”不再是同一个动作。** 这不是后篇修复前篇，而是可回看需求改变了存储边界。

本篇实现一个可以直接阅读的 ContextBudget：**保存完整历史，只为本次请求选取连续的最近若干整轮。** 它约束的是序列化后 UTF-8 字节，不宣称知道 Agnes 的 Token 数。本轮没有调用模型；模型字段预留 agnes-3.0-flash。

## 从一个失败的裁剪方式开始

~~~text
保存：  U1 A1 | U2 A2 | U3 A3
当前：  U4
逐消息：      A2 | U3 A3 | U4  ← A2失去所属问题
整轮：           U3 A3 | U4
请求：  SYSTEM + 选中的完整轮 + 当前问题
~~~

历史是一份可回看的记录，请求上下文则是针对当前任务的投影。两者不能共用一个会被 remove 操作破坏的列表。当前问题与系统约束是必需输入：连它们都放不下时应明确拒绝，而不是悄悄切掉用户的问题或安全约束。

## 预算必须量最终发出的东西

配套实现把 model 和 messages 一起构造为 Gson JSON，再编码为 UTF-8。中文常常占多个字节，换行和双引号还涉及 JSON 转义，Java String.length() 计数的是 UTF-16 单元，不能代替传输体积。

核心选择器只有一个方向：从完整历史开始，依次丢弃最早一轮，找到第一个可放下的连续后缀。这样保留顺序，且不会为了塞入较短旧轮而跳过较新的大轮。

~~~java
for (int start = 0; start <= history.size(); start++) {
    byte[] payload = request(system,
        history.subList(start, history.size()), current);
    if (payload.length <= maxBytes) {
        return new Selection(payload, history.size() - start, start);
    }
}
throw new IllegalArgumentException("mandatory input exceeds budget");
~~~

这里仍是教学规模算法：多次序列化会重复工作。长历史可以维护每轮的编码贡献或二分搜索，但必须包含 JSON 分隔符及框架字段，不能拿“每条文字的字节数之和”冒充完整请求长度。本轮优先把边界写清楚，没有测量这些优化。

## 实际得到什么

固定材料包含英文、中文、引号、换行和 Emoji；原始用例在 Suite.java，结果在 results.json。

| 请求预算（字节） | 保留历史轮 | 丢弃历史轮 | 最终请求字节 |
| --- | --- | --- | --- |
| 140 | 0 | 2 | 140 |
| 235 | 1 | 1 | 235 |
| 308 | 2 | 0 | 308 |
| 408 | 2 | 0 | 308 |

139 字节的预算被拒绝，因为必需输入已经需要140字节。原历史仍是两轮。这些数字属于固定序列化样本，不是平台上下文容量，也不是建议给所有应用设置308字节。

## 连续实验：裁剪后提交，再重启扩窗

ProjectionScenario.java把两个组件接起来。首先持久保存两轮：第一轮给出虚构项目代号ORCHID-17，第二轮说明Java 8。随后把请求预算缩到只够最近一轮，并用固定本地回答提交第三轮。关闭日志、重新打开，再扩大请求预算。

| 阶段 | 实际请求 / 保存结果 | 能说明什么 |
| --- | --- | --- |
| 缩小窗口 | 264字节，只带最近1轮，没有ORCHID-17 | 旧事实确实没有被发送 |
| 提交固定回答 | 磁盘保留完整3轮 | 不用裁剪结果覆盖完整记录 |
| 重开并扩窗 | 480字节，带3轮，ORCHID-17重新出现 | 早期事实能从保存记录重新构造 |
| 必需输入超限 | 拒绝请求，日志字节前后相同 | 失败的投影不污染已确认历史 |

原始projection.json与conversation.log见[集成实验记录](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant/evidence/projection-20261007-verified)。这是本地固定材料，**只证明请求数据恢复，不证明模型在缺少旧事实的那轮仍能回答项目代号**。

~~~text
完整日志 U1 A1 | U2 A2
          ↓ 投影（不改日志）
本次请求 SYSTEM | U2 A2 | U3
          ↓ 完整回答提交
完整日志 U1 A1 | U2 A2 | U3 A3
          ↓ 重开 + 扩窗
下次请求 SYSTEM | U1 A1 | U2 A2 | U3 A3 | U4
~~~

这个拆分也有代价：完整日志占磁盘，且“用户删除历史”必须删除保存记录，不能仅把它藏出请求。示例限4MiB并拒绝超限；压缩、保留期限、用户删除与跨设备同步都尚未实现，不称为完整助手产品。

首次集成验证曾在Windows持有独占文件锁时另开读取句柄，核对程序因此失败。修正为关闭拥有者后核对文件字节，再重新打开继续验证，未通过绕开锁改变日志实现。

## 产品取舍：少传不等于少保存

最近轮优先适合普通聊天，但未必保住用户早期给出的重要事实。固定系统约束、长期记忆和检索证据应有独立来源与预算；本例没有自动摘要，也没有实验支持“裁剪后模型仍记得关键事实”。

如果服务提供 Tokenizer 或明确的 Token 计数接口，应另做模型级检查，并为输出预留空间。传输预算解决请求大小，Token 预算解决上下文窗口，不能互相代替。

## 动手检验

把第二轮改成长段中文，并把预算设成“必需输入加第一轮刚好能放下”的大小。预期：最新一轮放不下时，选择器会最终只保留必需输入，不回头拼接第一轮。然后把当前问题改长，观察必需输入超限的显式失败。

排错时先打印 payload.length 和保留/丢弃轮数，别在正式日志输出完整聊天或 API Key。若顺序出错，检查是否把答案作为独立消息裁剪；若字节不符，检查是否测量了实际 JSON 编码。

本篇是请求构造组件，尚无登录、跨设备记忆或线上质量结论。下一篇讨论预算之外的另一个边界：[一次请求最多能等多久](/docs/ai-apps/java-retry-deadline)。

## 从干净目录复现

需要 Java 8、Python 3、Gson 2.10.1。请将两个路径替换为自己的 JDK 和 jar；既有工程可复用 Maven 缓存。

~~~sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 02a2660e22c969e70e3a6f095003614a7dfa448e
python demos/11-bounded-assistant/run.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out outputs/my-run
python demos/11-bounded-assistant/audit.py outputs/my-run
python demos/11-bounded-assistant/projection.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out outputs/projection
python demos/11-bounded-assistant/projection.py --audit --out outputs/projection
~~~

输出目录必须不存在。本机验证环境为 Windows，Linux/macOS尚未复测。不需要模型密钥或付费服务。manifest中的代码冻结提交早于上方含证据的归档提交，源码哈希对应实际执行文件。
