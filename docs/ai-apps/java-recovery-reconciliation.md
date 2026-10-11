---
title: "对话恢复：从意图、回执到完整问答"
description: "在三个提交边界真实终止JVM，以持久事实恢复完整历史，保留远端重复执行反例。"
slug: "/ai-apps/java-recovery-reconciliation"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
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

本实现串行处理已持久化的意图，没有取消、过期、用户编辑和权限撤销。如果用户在进程重启前撤销了操作，恢复程序目前仍会执行旧意图；因此不能把它直接接到有风险的生产工具。下一步应设计撤销记录和下游停止语义，不能用删除历史代替撤销副作用。

它也没有会话并发策略。之前介绍的串行、先提交者获胜、最新请求获胜仍是不同产品选择；这份恢复链没有推翻它们。要整合时，先决定一个turn是否仍有写入资格，再考虑如何提交完整回答。丢失资格的远端操作仍可能需要对账。

日志不做保留和压缩；每次扫描的成本随记录数增长。已经有事务数据库时，可用唯一键和事务存储意图与本地状态，但HTTP副作用仍在事务之外。当前实验只覆盖Windows、本机协作进程和固定故障点。

### 从读懂到修改

先找到 `recover-receipt` 目录，读取 `processes.json` 中第一次退出码23的位置，确认该时刻不是“无操作发生”。再比较 `recover-two_intents`：第二条是新key，应该保留为独立轮次，不能被错误去重。

可在新输出目录中练习加入一个只读状态查询：分别显示待投递、已确认待落历史、已完成。预期它不改变任何业务记录，不将未知状态转成失败。若重启后重复出现问答，检查历史是否仍沿用原turn key；若回执冲突被吞掉，应该停止并保存错误，而不是临时生成新key绕过它。

至此，三篇完成的是一条可复核的本地恢复链：提交边界、远端重送、最后的问答对账。在线模型质量、权限与取消仍是后续问题。

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

本机Windows已验证：Java JDK 1.8.0_171 + Python 3.12.14；17种场景、193条子进程记录；独立审计预期输出 `PASS`。其他操作系统未复测。若只想核验归档，不重新实验，可将审计参数换为 `demos/13-durable-dispatch/evidence`。源码哈希统一LF，证据哈希按原字节；不要改写manifest掩盖差异。

将JDK路径替换为本机带 `javac` 的JDK8。子进程退出码23是主动故障注入，其他意外退出需要排查；不要把教学HTTP服务暴露到公网。

代码与文章由AI辅助整理，结论以归档且可审计的实际运行记录为限。本轮没有新增付费模型请求，也不代表作者已亲手复现或完成人工审校。
