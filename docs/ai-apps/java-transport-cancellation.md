---
title: "Java LLM 实践（十）：点了取消，读取线程为什么还在运行？"
description: "30次本地HTTP连接，区分会话取消、阻塞读取退出与远端工作，比较Future中断和主动关闭连接。"
slug: "/ai-apps/java-transport-cancellation"
status: "published"
published_at: "2026-10-05"
updated: "2026-10-07"
reading_minutes: 11
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:transport-cancellation", "project:hohoo-ai-lab", "doc:ai-apps/java-stream-session-ownership", "doc:ai-apps/java-streaming-boundary"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/503f5271ef0d5baa12353d6eeda672dec5fc240e/demos/10-transport-cancellation) · [原始记录与审计](https://github.com/VirtualSelect/hohoo-ai-lab/tree/503f5271ef0d5baa12353d6eeda672dec5fc240e/demos/10-transport-cancellation/evidence/20261005) · [实验档案](/labs/transport-cancellation)

点下“停止生成”，页面不再更新，不代表网络读取也已经停止。

上一篇解决了[旧回调覆盖新会话](/docs/ai-apps/java-stream-session-ownership)：只有当前请求才能提交预览和历史。本篇往下一层走，把内存中的 SSE 换成真实本地 HTTP 连接，检查取消之后工作线程到底什么时候退出。

## 先把三个“停止”分开

| 层次 | 希望停止什么 | 本篇的验证方式 |
| --- | --- | --- |
| 会话 | 旧回答继续写入预览或历史 | 检查 Session 最终状态 |
| 客户端 | 工作线程继续阻塞在读取上 | 读取函数的 finally 单独记录退出时间 |
| 服务端 | 继续计算或生成 | 记录本地服务端完成了多少个工作步骤 |

这三个状态没有共同的完成按钮。UI 可以立即撤销请求的写入资格，而读取线程仍在运行；连接关闭了，服务端也可能继续执行自己的任务。

`Future.cancel(true)` 的含义是尝试取消并中断执行线程；成功取消后的 Future 状态，不是线程已经退出的证明。[Java 8 Future 文档](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/Future.html)

## 实验如何排除“只是改了一个标志”

使用 Java 8 的经典阻塞 `Socket`，服务端绑定 loopback 随机端口。响应为 `text/event-stream`，通过关闭连接结束 HTTP 响应；没有 TLS、代理、HTTP/2 或 chunked 编码。A6 的 SSE 解析器与 A7 的 Session 原样复用。

五种条件各执行两种策略，每组重复三次，共 **30 次真实本地连接**。六次正常完成作为控制组，其余 24 次触发取消或截止。

| 条件 | 服务端行为 | 触发动作 |
| --- | --- | --- |
| 正常完成 | 首段文本后发送 stop 和 DONE | 不取消 |
| 手动取消／静默 | 首段后一直等待测试清理 | 收到首段后取消 |
| 手动取消／持续发送 | 每轮等待约 80ms，共发送八段 | 收到首段后取消 |
| 截止／静默 | 首段后静默 | 读取阶段开始约 200ms 后取消 |
| 截止／持续发送 | 继续八轮有界工作 | 读取阶段开始约 200ms 后取消 |

两种策略都会先 `session.cancel()`，撤销旧请求的归属。差别只有：**仅执行 `future.cancel(true)`，还是再执行 `socket.close()`**。读取空闲超时统一为 500ms。

持续发送条件中的 80ms 是请求的休眠时间，不保证真实发包间隔精确为 80ms。调度、缓冲和运行环境都会影响时间，因此表中使用实际记录，不能用八乘八十替代测量。

## Future 已取消，读取仍然没结束

下表测量的是“取消动作开始 → 读取任务 finally 记录时间”，单位毫秒。每格为三次运行的中位数和最小—最大范围。

| 条件 | 仅取消 Future | 同时关闭 Socket |
| --- | ---: | ---: |
| 手动取消／静默 | 507.211（501.246—509.968） | 0.137（0.119—0.389） |
| 手动取消／持续发送 | 747.739（740.487—750.737） | 0.176（0.173—0.181） |
| 截止／静默 | 310.534（309.455—310.868） | 0.418（0.402—0.710） |
| 截止／持续发送 | 532.356（526.331—543.952） | 0.420（0.316—0.536） |

<img src="/media/practice/transport-cancellation.png" width="1500" height="600" loading="lazy" alt="两种取消策略的实际读取退出耗时；两幅图使用不同横轴尺度，并显示三次测量范围。">

两幅图的横轴尺度不同，请比较数值，不要比较柱子的视觉长度。这是本机 Java 1.8.0_171 的固定条件测量，不是网络 SLA，也不是所有 Java HTTP 客户端的统一行为。

仅中断的静默组最终收到 `SocketTimeoutException`；持续发送组反而一直读到了完整回答，之后由 Session 拒绝提交，结果为 `STALE_COMPLETE`。关闭连接的十二次故障运行都以 `SocketException` 退出。

`Socket.close()` 会使正在该 Socket I/O 操作中阻塞的线程抛出异常，这是此处主动唤醒读取的机制。[Java 8 Socket 文档](https://docs.oracle.com/javase/8/docs/api/java/net/Socket.html#close--)

## 为什么要有第二个完成信号

不能把 `future.get()` 当作取消后的线程回收凭证。它可能立即抛出取消异常，而实际读取还没有返回。实验把退出记录放在工作函数内部：

```java
try {
    String answer = reader.read(input, text -> session.preview(ticket, text));
    session.complete(ticket, answer);
} finally {
    exitedAt.set(System.nanoTime());
    workerExited.countDown();
}
```

取消端先撤销写入资格，再尝试中断和关闭连接：

```java
session.cancel();
future.cancel(true);
socket.close();
// 用独立退出信号做有界等待，不用 isDone() 证明线程已回收。
workerExited.await(5, TimeUnit.SECONDS);
```

上面是关键逻辑摘录，完整 Demo 还处理资源关闭、服务端收尾和异常。等待与 I/O 不放进 Session 的同步区；否则负责取消的线程可能反而拿不到锁。

24 次取消运行都没有写入历史，六次正常运行各保留一组问题和回答。**会话正确性相同，不代表资源回收及时性也相同。** 只检查聊天界面，很容易漏掉这个问题。

## 空闲超时与截止时间也不是一回事

500ms 的空闲超时约束一次阻塞读取等待数据的时间。对方持续发送时，任务总时长仍可以继续增加。200ms 截止由独立调度器触发，不依赖下一段数据到达。

不过本 Demo 的计时起点在连接建立并发出请求之后，因此它只覆盖读取阶段，**不包括 DNS、建连或写请求**。如果要升级为完整请求截止，需要把时间预算传播到这些阶段，并处理取消与连接创建之间的竞态。本篇没有验证这一扩展。

## 为什么不能据此声称“停止计费”

持续发送的本地服务端被刻意设计为：即使写入失败，也完成八个有界工作步骤。四组持续发送条件、两种策略下，记录都保留了八步工作。

这只证明“客户端已关闭”不足以推出“远端任务已取消”。它没有测试 Agnes 的服务端实现，也没有账单数据。真实供应商是否支持任务取消、是否确认取消、如何计费，需要对应协议和实际记录。

因此状态可以分别保留 `sessionInvalidated`、`readerExited` 和未来的 `remoteCancellationAcknowledged`，不要用一个 `cancelled=true` 向所有层承诺完成。

## 自己复现与读证据

进入代码仓库的 `demos/10-transport-cancellation`，准备 Java 8、Maven 和 Python。`run.py` 中 Maven 使用本机安装路径，换机器时调整为自己的路径；首次需要解析已声明的 Maven 依赖，运行器使用离线构建。

```text
python run.py --out evidence/my-run
python audit.py evidence/my-run
```

输出目录必须是新目录，避免覆盖已归档测量。`results.json` 保留 30 条记录及 Session 事件，`environment.json` 记录 JVM，`manifest.json` 固定实验源代码与结果哈希。独立审计检查条件唯一性、历史提交数量、退出时间顺序和服务端工作步骤；它没有把“小于一毫秒”写成测试通过门槛。

建议先打开一条 `cancel-dripping / interrupt-only` 记录：比较 `futureCancelledAtAction`、`workerExitedAtAction`、`outcome` 和空的 `history`。四个字段放在一起，就能读出“Future 取消了、线程继续读、协议完整了、会话仍拒绝提交”的全过程。

## 下一步该验证什么

本篇解决单个经典 Socket 的取消边界。真实 SDK 的连接池复用、取消与完成同时发生、取消早于连接创建、多个并发请求的关闭归属，都应单独建立测试。下一步优先接入实际使用的 HTTP 客户端，再讨论连接池和重试，而不是把这个教学 Socket 直接包装成生产 SDK。

## 修复进展 · 2026-10-07

2026-10-07 修正：Demo08–10 增加 JSON 词法校验，三个示例各通过 53 项离线回归；运行脚本改用 Maven 参数列表，支持含空格目录。Demo10 审计补上源码指纹检查。原文固定版本与原始数据保持不变，修正版不是新增在线模型结果。

[修正版代码与回归命令](https://github.com/VirtualSelect/hohoo-ai-lab/blob/1d5a9fad9607ec981094c19a2381475762cd0d23/REVIEW-FIXES-20261007.md)。
