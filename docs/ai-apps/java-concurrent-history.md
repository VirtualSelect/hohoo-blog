---
title: "Java LLM 实践（四）：两个请求同时返回，谁有资格写入历史？"
description: "用真实Java线程复现回复乱序，加入版本票据、完整问答提交与有界回执，明确本地幂等和远端执行的区别。"
slug: "/ai-apps/java-concurrent-history"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 8
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:concurrent-history", "project:hohoo-ai-lab", "doc:ai-apps/java-retrieval-evidence", "doc:ai-apps/java-tool-boundary"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows) · [原始记录与审计](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows/evidence/20261003-reviewed) · [实验档案](/labs/concurrent-history)

上一版[事务式历史](/docs/ai-apps/java-transactional-history)把一次问答看成一个整体：响应验证成功才提交，失败时不留下半轮消息。但它的 `ask` 方法带着 `synchronized` 等待整个请求。同一个会话因此按顺序工作，代价是慢请求会挡住后来的操作。

如果为了响应速度，把网络调用移到锁外，会出现一个新的问题：**回答生成时使用的历史，提交时可能已经过时。** 本篇实现这个边界，代码不调用在线模型；响应由受控本地线程提供，验证的是会话并发行为。

## 1. 先固定一个一定会乱序的例子

不使用 `sleep` 猜线程速度。`CountDownLatch` 规定快请求必须先提交，慢请求之后才尝试写入。两个请求都从版本0开始：

| 时刻 | 慢请求A | 快请求B | 已提交版本 |
|---|---|---|---|
| 开始 | 拿到版本0与空历史 | 拿到版本0与空历史 | 0 |
| B先完成 | 等待闩锁 | 提交问答，成功 | 1 |
| A后完成 | 拿版本0尝试提交 | 已完成 | 1 |

本次真实Java 8运行的记录是 `fast:COMMITTED`、`slow:STALE`。最终历史只有 `fast / new answer`，没有把两个基于空历史生成的回复拼成一条似乎连续的对话。

这不是“更晚返回的回答不好”。问题是它已经不满足自己的提交前提。若A的回答与B无关，应用可以展示为分支；若必须继续同一会话，应让调用方明确选择重新生成。

## 2. 网络在锁外，提交在锁内

`VersionedSession.begin` 返回不可变票据，包含版本、请求ID、问题和历史快照。随后由外部传输层生成回答。只有 `commit` 负责改动共享状态：

```java
VersionedSession.Ticket ticket = session.begin(requestId, question);
// 在锁外，用 ticket.history 和 ticket.question 构造模型请求。
String status = session.commit(ticket, validatedReply, finishReason);
```

核心条件是 `ticket.version == currentVersion`。比较版本、追加完整问答、裁剪旧轮次、增加版本号，都位于同一个同步方法里。如果把版本判断放到锁外，两个线程仍可能同时通过检查，然后互相覆盖。

为什么不用文章开头直接展示 `AtomicReference.compareAndSet`？它是可以实现这一类原子提交的工具，但本例状态还包含历史、容量与回执，短临界区更容易审查。重点是原子地检查并更新整份状态，不是一定要选无锁结构。

## 3. 重复提交和请求ID冲突不是一回事

回执记录请求ID对应的问题与回答。在回执仍保留时：

| 情况 | 返回值 | 是否增加版本 |
|---|---|---|
| 相同ID、相同问题和回答再次提交 | `DUPLICATE` | 否 |
| 相同ID，却带来不同问题或回答 | `ID_CONFLICT` | 否 |
| 首次提交，但版本落后 | `STALE` | 否 |
| 空回答或 `finish_reason != stop` | `INVALID` | 否 |
| 校验与版本均通过 | `COMMITTED` | 是 |

回执检查在版本检查之前，因此已成功提交的同一票据可以得到明确的重复结果，而不是笼统的过期错误。另一个会话创建的票据会被拒绝，不能拿甲会话的版本号更新乙会话。

这只是**本进程内的提交幂等**。它没有阻止模型服务收到两次请求，没有取消已发生的计费，也不是数据库事务。回执有容量，淘汰之后便失去相应ID的去重记忆；进程重启也会丢失。生产系统需要结合持久化、过期策略和请求生命周期设计，不能把这个Demo直接称为“恰好执行一次”。

## 4. 这次到底验证了什么

配套Suite共33项边界检查，其中8项针对会话：乱序提交、完整问答、重复提交、ID冲突、不完整输出、整轮裁剪、外来票据、旧快照隔离。它实际启动两个Java线程，顺序由闩锁决定，没有用重复次数包装成并发性能测试。

保留最近两轮时，裁剪删除的是一对 `user / assistant`，不会剩下没有问题的回答。票据中的旧历史也不会随新提交一起变化。对话的“读快照”和“写当前状态”由此分开。

尚未测量的是多用户吞吐、数据库锁冲突和真实模型乱序请求的成本。8项案例能说明明确的状态约束，不能证明所有并发交错都正确。

## 5. 如何运行与接回已有Demo

```sh
cd demos/06-reliable-workflows
python run.py --out evidence/my-run
python audit.py evidence/20261003-reviewed
```

第一条命令编译Java、运行实验，并自动保存新的结果、源码指纹与审计；第二条单独核对已归档结果。输出必须是新目录，不能覆盖既有证据。Java环境为1.8.0_171，Gson2.10.1；没有新增在线请求。

接入已有 `AgnesTransport` 时，在 `begin` 后构造请求并发送，验证完协议再 `commit`。遇到 `STALE` 时显示“会话已更新”，不要自动重新请求，否则同一个按钮操作可能隐式产生额外调用。失败响应也不要伪装成助手消息写回。

## 6. 继续追问

尝试调换闩锁，让A先成功，观察最终版本仍只能增长一次。再让失败回复先回来，检查有效回复是否还能提交。最后将票据交给另一个会话，理解“版本相同”为什么不代表“属于同一个状态”。

下一篇把同一种边界思维放到[工具调用](/docs/ai-apps/java-tool-boundary)：模型可以建议一个动作，但只有应用负责决定是否执行。

同步原语的语义可查阅 [Java 8 AtomicReference 文档](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/atomic/AtomicReference.html)。本篇实现采用同步临界区，实验数值与线程轨迹来自配套工程。

## 同方向继续阅读

- [Java LLM 实践（五）：工具超时了，为什么任务还在执行？](/docs/ai-apps/java-tool-boundary)
- [Java LLM 实践（六）：先验收检索证据，再谈RAG回答](/docs/ai-apps/java-retrieval-evidence)
