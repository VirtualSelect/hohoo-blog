---
title: "Java LLM 实践（九）：取消请求后，旧回答为什么还会覆盖新会话？"
description: "18 种固定线程交错，验证流式预览、完成和错误回调的请求归属，以及取消和有限幂等的边界。"
slug: "/ai-apps/java-stream-session-ownership"
status: "published"
published_at: "2026-10-04"
updated: "2026-10-04"
reading_minutes: 10
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:stream-session-ownership", "project:hohoo-ai-lab", "doc:ai-apps/java-streaming-boundary", "doc:ai-apps/java-first-llm"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/920fee3717a373dc796269ee3a4a03ec33700ae3/demos/09-stream-session) · [原始记录与审计](https://github.com/VirtualSelect/hohoo-ai-lab/tree/920fee3717a373dc796269ee3a4a03ec33700ae3/demos/09-stream-session/evidence/20261004) · [实验档案](/labs/stream-session-ownership)

上一轮解决了一个协议问题：流式回答必须正常结束，才能把问答写入历史。但完整回答也可能属于一个**已经被取消的旧请求**。

假设 A 正在回答，用户取消 A，立即发送 B。取消发生时，A 的最后一个回调可能已经排进执行队列。如果回调只负责 `setText(answer)`，旧回答仍然能写到 B 的位置。即使 B 稍后覆盖回来，页面中途也显示过错误内容。

这篇把问题从“回答完整吗”推进到“这次更新还属于当前请求吗”。

## 先看发生错误的时刻

下面是 `late-preview` 案例的实际调度顺序。A 的工作线程停在预览回调前，主线程启动 B，再放行 A：

```text
主线程：begin(A)
工作线程：已经解析出 answer-A，等待放行
主线程：begin(B) → preview(B, answer-B)
工作线程：preview(A, answer-A) → complete(A)
主线程：complete(B)
```

不检查归属的实现，在第 4 步把 `answer-B` 改回了 `answer-A`，并将旧问答写入历史。只检查最后一张截图，很容易遗漏这个错误。因此日志保存了**每次回调后的预览和历史**，审计会检查整条轨迹。

<img src="/media/practice/stream-session.png" width="1500" height="600" loading="lazy" alt="18个固定线程交错：朴素实现7种失败，请求归属检查9种通过" />

## 实验到底测了什么

使用 Java 8、一个真实工作线程和主线程。输入是合成的内存 SSE，解析器原样复用[上一篇的文本协议](/docs/ai-apps/java-streaming-boundary)。本轮不调用 Agnes，也不重新测试网络传输。

通过两把 `CountDownLatch` 控制先后关系：工作线程告诉主线程“已经到达指定位置”，主线程完成取消、清空或切换后，再放行回调。这比不断运行带 `sleep` 的测试更明确：每次都确实进入所声称的交错。

[Java 8 CountDownLatch 文档](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/CountDownLatch.html)定义了等待与放行之间的可见性关系。这里用它构造可重复测试，不用它作为产品会话锁。等待设置了 5 秒上限；超时视为测试失败，不作为模型延迟。

| 固定场景 | 任意回调均可写入 | 仅当前请求可写入 |
| --- | --- | --- |
| 正常完成 | 通过 | 通过 |
| 取消后旧回答完成 | 失败 | 通过 |
| 清空后旧回答完成 | 失败 | 通过 |
| 切换 B，A 先完成 | 失败 | 通过 |
| 切换 B，B 先完成 | 失败 | 通过 |
| B 已预览，A 的预览迟到 | 失败 | 通过 |
| 同一完成回调执行两次 | 失败 | 通过 |
| SSE 截断 | 通过 | 通过 |
| B 已开始，A 的错误迟到 | 失败 | 通过 |

18 次执行中，朴素对照有 7 种交错违反预期，带归属检查的 9 种全部通过。它是有限场景的确定性验证，**不是线上故障率，也不是所有并发情况的证明**。

## 一个请求需要一张“写入通行证”

`Session.begin` 返回一个 `Ticket`，里面包含：

- `owner`：创建它的会话对象，外部不能构造或更换。
- `epoch`：请求代次。开始、取消和清空都会使旧代次失效。
- `id` 与 `question`：请求标识和对应问题。

写入前的核心检查只有一行：

```java
t.owner == this && t == active && t.epoch == epoch
```

三项检查各自有作用。`owner` 拒绝把另一个会话的凭据拿来用；对象身份限定当前请求；`epoch` 明确表达失效代次。它们不是登录认证，也不能替代服务端鉴权。

仅检查“版本号相同”还不够描述整个生命周期。A 完成后即使没有新请求，也不能再次提交。所以成功提交会把 `active` 清空，重复完成自然被拒绝。

## 检查与修改必须在同一把锁里

下面的写法仍然存在竞态：

```java
if (isCurrent(ticket)) {
    // 此处可能发生 cancel() 或 begin(B)
    history.add(answer);
}
```

本例让 `preview`、`complete`、`cancel`、`clear` 和 `fail` 都在同一个 `Session` 的同步方法里执行。核对归属和修改状态构成一个不可分割的短操作。

网络读取和解析不放在锁里：

```java
Session.Ticket ticket = session.begin(id, question);
if (ticket == null) return; // 本地 ID 保留窗内重复，不启动请求

try {
    String answer = new StreamReader().read(input,
        text -> session.preview(ticket, text));
    session.complete(ticket, answer);
} catch (IOException ex) {
    session.fail(ticket);
}
```

这里仍然依赖上一轮的前置条件：`StreamReader.read` 只有在 `stop` 和 `[DONE]` 都满足时才返回。`complete` 本身不解析 SSE；不要绕过调用边界，把半句文本直接塞给它。

## 错误回调也要核对归属

一个容易漏掉的分支是 `catch`。如果 A 迟到的错误执行了“清空 loading、清空预览”，B 即使没有被旧答案覆盖，也会失去自己的状态。

`late-error` 案例专门验证这一点：B 已经预览，A 才进入 `fail`。带归属检查的实现记录 `STALE`，不修改 B。错误不是拥有更高权限的回调，它也属于某个具体请求。

## 取消不等于远端停止

本轮的取消含义是：**从这一刻开始，A 不能再改变本地当前会话**。它不保证：

- 远端模型立即停止生成或计费；
- 阻塞的网络读取已经被中断；
- 多台服务器共享同一失效代次；
- 进程重启后仍能识别旧 ID。

工程接入时仍需关闭连接、处理超时，必要时调用供应商支持的取消机制；即便这些操作失败，本地归属检查也应继续有效。

## 有界幂等不是永久幂等

示例保留最近 8 个已用 ID 和 8 对完整问答。重复 ID 不启动新请求；同一 ID 换问题也拒绝。清空内容不会立即清掉 ID 保留窗，避免清空后旧操作被意外重放。

当 ID 被淘汰后，它可以再次使用。因此这是**单进程、有限窗口的防重复机制**。需要长期请求去重时，应使用持久化收据、明确生命周期和认证后的会话键，不能把这个示例的集合直接称作生产幂等服务。事件快照只用于本轮小型实验，生产日志也需要容量限制与脱敏。

## 怎样复现并检查证据

在 `hohoo-ai-lab` 仓库执行：

```text
python demos/09-stream-session/run.py --out demos/09-stream-session/evidence/my-run --maven /path/to/mvn
python demos/09-stream-session/audit.py demos/09-stream-session/evidence/my-run
```

已缓存 Maven 依赖时可加 `--offline`。JDK 需为 Java 8 或兼容环境。本次实际运行使用 Java 8u171。

`results.json` 包含 18 条完整事件轨迹和中间状态；`manifest.json` 固定运行代码、输入协议与原始文件哈希；`audit.py` 按事件独立重建历史和预览，检查旧回调是否曾被接受。另有 7 组契约检查覆盖跨会话票据、取消、重复 ID、问答成对裁剪、收据淘汰等边界。

现在，“一次成功回答”有了两层条件：协议完整，且提交时仍拥有当前会话。下一步接入真实界面或服务端执行器时，应保留这两层边界，并补上连接取消与多进程状态的实测，而不是继续增加一个只判断 HTTP 状态码的分支。
