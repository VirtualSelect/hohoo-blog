---
title: "对话恢复：从意图、回执到完整问答"
description: "在三个提交边界真实终止JVM，以持久事实恢复完整历史，保留远端重复执行反例。"
slug: "/ai-apps/java-recovery-reconciliation"
status: "published"
published_at: "2026-10-11"
updated: "2026-11-25"
reading_minutes: 10
domain: "ai-apps"
article_kind: "tutorial"
difficulty: "intermediate"
prerequisites: ["doc:ai-apps/java-outbox-delivery"]
related: ["lab:durable-dispatch", "project:hohoo-ai-lab"]
---

[固定代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch) · [原始证据](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch/evidence) · [实验档案](/labs/durable-dispatch)

工具已经完成，回执也写好了，进程却在保存回答前退出。重新启动后，助手应该重做工具、提示失败，还是把已有结果补回对话？这不是一个“catch后重试”就能准确表达的问题。

本篇把前两篇的组件连接起来，用**持久意图、回执和完整历史三份不同证据**重建进度。回答仍是固定工具返回的计数，不调用模型；它验证恢复链，不宣称完整在线助手已经交付。

## 给状态起名之前，先定义证据

```text
有 intent，无 receipt：待投递，或远端结果未知
有 receipt，无 history：远端结果已获确认，待补交完整问答
有 history：这一轮本地问答已提交
```

第一行不能叫“工具还没执行”，因为远端可能已经成功。第二行也不能重新调用工具：回执已经足够支持本地恢复。本例不另外维护一个可能过时的 `status.json`；每次从这些记录重建状态，降低多个状态文件互相矛盾的机会。

完整历史的正文是 `question => result`，以同一个turn key幂等提交。真实产品需要结构化消息、角色、版本和显示规则；本例使用简单固定字符串，是为了把焦点放在何时提交，而非模型输出解析。

## 恢复按单调证据前进

`Workflow.resume` 的核心顺序可以读成：

```text
for 每条持久意图:
    查找已有回执
    没有回执 → 使用原key投递 → 持久保存结果
    使用回执结果 → 幂等写入完整问答
```

恢复程序不依赖上次进程活着时的Future、回调或内存标志。收到HTTP成功后立即崩溃，回执可能尚不存在：这时仍会重送，依赖上一节的接收端幂等。回执已存在时，恢复只做本地写入。

“没有半轮历史”只是一条本地不变量；它与远端执行次数是两条不同的保证，不能互相替代。

## 故障点不同，恢复动作也不同

| 崩溃或恢复条件 | 恢复后远端效果 | 回执 | 完整问答 |
| --- | ---: | ---: | ---: |
| 收到远端结果后、回执前退出 | 1 | 1 | 1 |
| 回执后、问答前退出 | 1 | 1 | 1 |
| 问答后退出，再次恢复 | 1 | 1 | 1 |
| 两个不同turn，依次恢复两遍 | 2 | 2 | 2 |
| 八个dispatcher进程竞争恢复 | 1 | 1 | 1 |

前三种使用真实进程终止，之后启动新JVM恢复。最后一种验证本地协调锁，不能当成分布式多消费者性能测试。独立审计会逐条核对意图key、回执key与历史key，并检查历史中的结果来自那份回执，而不只比较三份文件的条数。

## 这条链仍然缺什么

Demo13 原版串行处理已持久化的意图，恢复时只看意图、回执和历史。它没有撤销记录；即使用户已经撤销，恢复程序仍会执行旧意图。处理撤销时，需要单独记下用户的决定并保留已有的远端证据。

它也没有会话并发策略。之前介绍的串行、先提交者获胜、最新请求获胜仍是不同产品选择；这份恢复链没有推翻它们。要整合时，先决定一个turn是否仍有写入资格，再考虑如何提交完整回答。丢失资格的远端操作仍可能需要对账。

日志不做保留和压缩；每次扫描的成本随记录数增长。已经有事务数据库时，可用唯一键和事务存储意图与本地状态，但HTTP副作用仍在事务之外。当前实验只覆盖Windows、本机协作进程和固定故障点。

### 从读懂到修改

先找到 `recover-receipt` 目录，读取 `processes.json` 中第一次退出码23的位置，确认该时刻不是“无操作发生”。再比较 `recover-two_intents`：第二条是新key，应该保留为独立轮次，不能被错误去重。

可在新输出目录中练习加入一个只读状态查询：分别显示待投递、已确认待落历史、已完成。预期它不改变任何业务记录，不将未知状态转成失败。若重启后重复出现问答，检查历史是否仍沿用原turn key；若回执冲突被吞掉，应该停止并保存错误，而不是临时生成新key绕过它。

三篇一起覆盖本地提交、远端重送和最后的问答对账。下面用同一接收端验证撤销记录如何改变恢复顺序。

## 撤销后重启，还会执行旧意图吗？

补充实验用同一个幂等键，把撤销写入独立持久日志，和恢复程序共用同一把本机锁。受控版先检查是否撤销，再决定是否投递或补写问答。它在发出 HTTP 请求之前记录投递标记。每种情形都用新的 JVM 连续恢复两遍，分别核查请求观察记录、接收端效果、回执和问答历史。

| 首次恢复前的条件 | HTTP POST | 接收端效果 | 回执 | 问答历史 |
| --- | ---: | ---: | ---: | ---: |
| 投递前撤销，按原版规则恢复 | 1 | 1 | 1 | 1 |
| 投递前撤销，按受控规则恢复 | 0 | 0 | 0 | 0 |
| 写投递标记后、发送前退出，再撤销 | 0 | 0 | 0 | 0 |
| 接收端执行后、写回执前退出，再撤销 | 1 | 1 | 0 | 0 |
| 写回执后、写问答前退出，再撤销 | 1 | 1 | 1 | 0 |
| 接收端执行后、写回执前退出，未撤销 | 2 | 1 | 1 | 1 |

第三、四行的本地证据相同：有投递标记和撤销记录，没有回执。只有接收端和请求观察记录能区分实际效果是 0 还是 1。恢复程序把两种情况都判为结果未知，并停止重送。第五行保留已有回执，并停止补写常规问答。第六行仍用原键重送，由接收端去重后返回原结果。

补充实验使用 macOS、JDK 8 和本机回环接收端。撤销与恢复串行；撤销在锁内写入后才生效。运行中的请求能否被中断、已经发生的效果能否补偿，以及真实服务如何对账，都需要另行验证。

从博客仓库根目录运行下列命令。准备一份包含下节所列提交的伴随仓库，并选择一个尚不存在的输出目录。脚本从 Git 读取固定版本并核对源码指纹，输出每次恢复的同键证据。已运行的记录见仓库中的 `reports/java-cancellation-recovery-20261125.json`。

```bash
python3 scripts/research/java-cancellation/run.py \
  --repo /path/to/hohoo-ai-lab-study \
  --java-home /path/to/jdk8 \
  --run-dir /tmp/java-cancellation-study
```

## 最小复现与排错

从干净检出目录运行以下PowerShell命令。输出目录必须尚不存在。同组的三篇文章共用一份冻结协议，只需运行一次，再按各篇的证据分组查看。

```powershell
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 0d4009cf840052c3111bbfc40dce900326daa3ae
python -m venv .venv
$py = '.\.venv\Scripts\python.exe'
& $py demos/13-durable-dispatch/run.py --java-home "E:/Java/jdk1.8.0_171" --out demos/13-durable-dispatch/target/my-run
& $py demos/13-durable-dispatch/audit.py demos/13-durable-dispatch/target/my-run
```

原版完整矩阵在 Windows 上验证，环境为 Java JDK 1.8.0_171 和 Python 3.12.14，共 17 种场景、193 条子进程记录。独立审计预期输出 `PASS`。若只核验归档，可将审计参数换为 `demos/13-durable-dispatch/evidence`。源码哈希按 LF 计算，证据哈希按原字节计算。

将JDK路径替换为本机带 `javac` 的JDK8。子进程退出码23是主动故障注入，其他意外退出需要排查；不要把教学HTTP服务暴露到公网。

代码与文章由AI辅助整理，结论以归档且可审计的实际运行记录为限。本轮没有新增付费模型请求，也不代表作者已亲手复现或完成人工审校。
