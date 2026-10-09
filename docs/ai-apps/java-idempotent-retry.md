---
title: "Java 幂等重试：没收到回答，不等于没有执行"
description: "用七组本地 HTTP 故障对照，解释幂等键、并发认领、请求冲突与进程崩溃窗口。"
slug: "/ai-apps/java-idempotent-retry"
status: "published"
published_at: "2026-10-09"
updated: "2026-10-09"
reading_minutes: 11
domain: "ai-apps"
article_kind: "tutorial"
difficulty: "intermediate"
prerequisites: ["doc:ai-apps/java-retry-deadline", "doc:ai-apps/java-durable-turns"]
related: ["lab:java-idempotent-retry", "project:hohoo-ai-lab", "doc:ai-apps/java-tool-boundary"]
---

[固定代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/009289d3c9314d64a495303d9b16517080282788/demos/12-idempotent-retry) · [HTTP 记录与审计](https://github.com/VirtualSelect/hohoo-ai-lab/tree/009289d3c9314d64a495303d9b16517080282788/demos/12-idempotent-retry/evidence) · [实验档案](/labs/java-idempotent-retry)

上一篇为重试设置总时限和次数预算，但预算解决的是“还能等多久”，没有解决“重试会不会再执行一次”。例如助手调用一个有副作用的工具：服务端已经提交结果，回复却在路上丢了。客户端此时只知道自己没收到答案。

本篇用 Java 8 自带的 HTTP 服务做一个最小反例：每个请求把本地计数器加一。计数器代表一次逻辑副作用，**不是实际扣费、下单或模型请求**。Python 客户端通过真实本机连接发请求，服务端主动丢弃回复或终止进程。没有在线 API 调用。

## 先看那条容易误判的时间线

```text
客户端 A             服务端                    本地计数器
POST /effect  ─────→ 执行加一 ──────────────→ 0 → 1
              ←─── 回复前连接被关闭
观察到 EOF
再次 POST     ─────→ 再执行加一 ────────────→ 1 → 2
收到 200，正文为 2
```

这里观察到的是连接关闭，不是伪造一个 `Read timed out` 字符串。结果见 `unkeyed_lost_reply`：第一次请求记录连接异常，第二次返回 200，计数器最终为 2。异常本身不能告诉客户端第一次是否生效。

[HTTP 语义中的幂等性](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)关注重复请求的预期效果，不是“每次都返回相同状态码”。POST 不会因为带了一个头就自动获得幂等语义；接收端必须实现并约定它。

## 一个键要代表同一次意图，而不是一次网络尝试

为这次“加一”生成 key，在所有重试中复用它。服务端维护如下状态：

```text
key 不存在 → 原子认领 → 执行 → 保存结果 → 回复
key 存在且请求体相同 → 等待/重放同一个结果
key 存在但请求体不同 → 409，拒绝执行
```

本例用 SHA-256 比较原始请求体字节。因此两个字段顺序不同、语义相同的 JSON，也会被视为不同请求。这是一个明确的协议取舍；如果想按业务语义比较，需要固定规范化规则，并把租户、操作类型和版本一起纳入身份。不能只比较 key，也不能偷偷忽略不同参数。

认领必须原子化。先 `containsKey`、再执行、最后 `put`，中间仍会让两个线程同时进入。核心代码把“查找与创建记录”放在同一个锁里，副作用在锁外执行：

```java
synchronized (records) {
    record = records.get(key);
    if (record == null) {
        // 容量检查省略；完整实现见仓库
        record = new Record(hash);
        records.put(key, record);
    } else {
        // 先校验 hash；不同请求返回 409
        owner = false;
    }
}
// owner 执行一次；其他请求等待 record.result
```

`CompletableFuture` 让并发重复请求共享同一个完成结果。案例中 12 个客户端同时发同一个 key，最终计数为 1；12 个回复都为 1，其中只有一个标记为非重放。等待有五秒上限；等待失败也不会把已有记录删掉并立即重执行。

## 修复了连接丢失，却没有修复进程丢失

七组实际结果如下。“最终计数”是服务端本地文件的数值，不是客户端收到回复的次数。

| 条件 | 最终计数 | 观察 |
| --- | ---: | --- |
| 无 key，首次回复被丢弃 | 2 | 重试重复执行 |
| 同 key，首次回复被丢弃 | 1 | 重试返回缓存结果 |
| 12 个并发同 key 请求 | 1 | 一次执行，11 次重放 |
| 同 key，不同请求体 | 1 | 第二次返回 409 |
| 第一次已回复，重启服务，再重试 | 2 | 内存记录消失 |
| 副作用落盘后、记录完成前崩溃 | 2 | 崩溃窗口仍重复执行 |
| 非法输入、64 个 key、容量边界 | 64 | 400 / 413 拒绝输入，满容量返回 429，旧 key 仍可重放 |

最后两个故障揭示了这个实现的边界。计数文件通过 `force(true)` 写入；幂等注册表仍在内存。`crash_after_effect` 在写盘完成、完成 Future 之前调用 `Runtime.halt(23)`。客户端看到连接断开，测试确认退出码 23，重启读取到计数 1，但注册表已经空了。重试再次加一。

这也解释了为什么“把 key 保存到另一个文件”不是充分答案：两个独立写入之间仍可能崩溃。若业务状态和幂等结果能进入同一数据库事务，可以把它们原子提交；若副作用在外部工具或模型服务，必须进一步依赖下游的幂等协议、可查询操作状态或补偿策略。**本篇没有实现这些生产方案，也不宣称 exactly-once。**

## 和助手历史、重试预算如何配合

可以把一次助手操作分为三层：请求预算控制等待；幂等身份控制同一意图的重送；持久历史控制完整问答如何保存。三者都需要，但一个层面的成功不能替另一个层面背书。

例如持久历史没有半轮记录，并不代表远端工具没有执行。总时限到达也不代表远端已经停止。模型提供方若没有承诺幂等支持，向它发送这个头不能自动防止重复计费。应用层应把“不知道是否生效”保留为待查询状态，而不是一律变成“失败，可以随便重来”。

为了把实验做小，本例的注册表没有 TTL，也不淘汰旧 key。满 64 个时拒绝新意图，仍能重放旧结果；这牺牲了可用性，却避免“刚删掉 key，迟来的重试又执行”。生产保留时间应根据业务重试窗口设计。本地文件的 truncate/write 也不具备断电原子性，本轮只测试指定写入完成后的进程故障。

## 动手复现与排错

使用 JDK 8 和 Python 3.12；无需 Maven、Gson、数据库或密钥。以下命令把新结果写到独立目录，保留已归档证据：

```sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 009289d3c9314d64a495303d9b16517080282788
python demos/12-idempotent-retry/run.py --java-home "E:/Java/jdk1.8.0_171" --out demos/12-idempotent-retry/target/my-run
python demos/12-idempotent-retry/audit.py demos/12-idempotent-retry/target/my-run
```

将 `--java-home` 改成本机 **JDK 根目录**，其中应同时有 `bin/java` 与 `bin/javac`。服务只监听 `127.0.0.1`，自动选择空闲端口；`X-Test-*` 头仅用于本地故障注入，不能作为公开 API 功能上线。Windows/JDK 1.8.0_171 已实测，Linux/macOS 未复测。

预期审计输出 `PASS: 7 cases...`。若并发计数大于 1，检查是否把认领拆成了多个操作；若丢回复的第一次没有记录异常，检查故障是否在真正写回复之前触发；若找不到 `javac`，说明配置了 JRE 或错误路径。审计同时验证源码和证据哈希，不能直接编辑结果文件让它通过。

一个小练习：为每次重试改用新 key，先预测计数，再运行独立实验。它会变成两个意图，幂等表不会“智能识别”你想把它们合并。另一个练习是交换“业务生效”和“记录完成”的顺序：提前写成功记录也可能产生“未执行却重放成功”的问题。真正需要设计的是提交边界，而不只是添加一个请求头。
