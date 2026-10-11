---
title: "持久幂等：让操作身份与结果一起提交"
description: "用带CRC的追加日志、进程崩溃与99个截断前缀，解释持久幂等的提交边界。"
slug: "/ai-apps/java-durable-idempotency"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "ai-apps"
article_kind: "tutorial"
difficulty: "intermediate"
prerequisites: ["doc:ai-apps/java-idempotent-retry"]
related: ["lab:durable-dispatch", "project:hohoo-ai-lab"]
---

[固定代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch) · [原始证据](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch/evidence) · [实验档案](/labs/durable-dispatch)

上篇的幂等键挡住了同一进程里的重复请求，却挡不住重启：副作用已经写入计数文件，内存中的 key 消失，重试又执行一次。本篇不再给内存表补一个“保存”按钮，而是改变提交边界——**让业务结果和幂等身份成为同一条日志记录**。

读完后，你可以实现一个跨进程恢复的最小操作日志，解释尾部截断与完整记录损坏为什么不能使用相同的恢复策略。这里的业务仅为固定材料的计数操作，没有真实订单、支付或模型调用。

## 两份文件之间，永远还有一道缝

```text
计数器加一 → 进程崩溃 → 幂等表还没记住 key
先保存成功 key → 进程崩溃 → 计数器却还没加一
```

交换两个写入的顺序，只是换一种错误。这个实验把计数定义成“有效操作记录数”，每条记录同时携带 key、请求正文、正文 SHA-256 和结果序号。重启时重放完整记录，业务状态与幂等身份从同一来源恢复。它不是通用数据库；如果真正业务在另一个系统，这个边界就不成立，下一篇会专门验证。

## 先判断记录完整，再判断请求是否相同

`Ledger.java` 的记录格式是：

```text
magic(4B) | payload长度(4B) | CRC32(4B) | payload
payload = key + bodyHash + body + result
```

字符串使用 Java `DataOutputStream.writeUTF` 的长度编码，不靠换行分隔。长度最多 65,536 字节；CLI还限制 key 和请求体，避免从损坏长度无限分配内存。CRC覆盖payload，用于检测意外损坏，不提供抗恶意篡改能力。

恢复顺序很关键：读取头部与长度 → 判断尾帧是否完整 → 验CRC → 校验正文hash、key唯一性与连续结果序号。**完整帧CRC失败时直接拒绝恢复**，不能把它当成“未写完，删掉就好”。否则一次已提交操作可能被忘记，下一次重试重新生效。

只有文件末尾不足一个完整帧时，本实现才截断到上一个确认边界。这个策略假定只有单个追加写者、此前确认的前缀可信；不适用于任意磁盘损坏。例子故意保留 `corrupt.wal`，审计验证拒绝后字节未变。

## 同一个锁里完成查找、判断与追加

```java
try (RandomAccessFile file = new RandomAccessFile(path.toFile(), "rw");
     FileLock lock = file.getChannel().lock()) {
    LinkedHashMap<String, Entry> entries = scan(file);
    // 同 key / 同正文：重放；同 key / 不同正文：拒绝
    // 新 key：追加一个完整 frame，再 force(true)
}
```

本轮的并发单元是**八个独立 JVM 进程**。它们锁定同一日志，从扫描到追加均持锁，所以不能同时认领同一 key。不要把这个例子直接搬到同一 JVM 的多线程中：Java 的文件锁以 JVM 为单位，同进程还需要线程级串行化。这一边界可核对 [FileLock 官方说明](https://docs.oracle.com/javase/8/docs/api/java/nio/channels/FileLock.html)。

文件锁也不是分布式锁。本轮只在本机 Windows 文件系统上验证，没有覆盖 NFS、跨主机副本、非合作写者或磁盘掉电。

## 真正退出进程，再看重试结果

故障使用 `Runtime.halt(23)`，不是抛异常后让 finally 完成写入。

| 条件 | 重试后的有效操作数 | 关键证据 |
| --- | ---: | --- |
| 追加前退出 | 1 | 重试完成新操作 |
| 写入半个帧后退出 | 1 | 截去未完成尾帧，再追加 |
| 完整帧force后、回复前退出 | 1 | 恢复原记录并重放 |
| 八进程同key并发 | 1 | 只有一条有效记录 |
| 同key不同正文 | 1 | 拒绝冲突，不执行第二次 |
| 完整帧payload被翻转一位 | 不恢复 | 原文件保持不变 |
| 99种严格截断前缀 | 每种均为1 | 恢复后的字节与完整参考帧一致 |

固定 `turn-1/add-one` 帧长99字节，前缀测试覆盖0至98字节；不是“99种业务故障”。它检查的是帧边界恢复，不证明任何随机损坏都可恢复。独立Python审计重新解析日志和CRC，不调用Java恢复函数。

## 什么时候可以用，什么时候应该换方案

这是小型单机教学日志：每次操作全量扫描，日志与key不做淘汰，吞吐和磁盘增长都没有生产保障。它适合观察提交边界，或为单机低频任务设计恢复测试；已有数据库时，通常应优先使用数据库的唯一约束和事务，而不是扩建这个文件系统。

`force(true)` 的行为应以 [FileChannel 文档](https://docs.oracle.com/javase/8/docs/api/java/nio/channels/FileChannel.html)和文件系统为准。本轮实测的是指定位置的**进程终止**，没有模拟断电，也没有证明目录项、控制器缓存和损坏磁盘的耐久性。

### 小练习与排错

先预测：完整帧写入后没有收到回复，客户端该生成新key还是复用旧key？运行 `ledger-after.wal` 案例后，再用不同key提交同正文；它们应当是两个意图。若并发生成了多条同key记录，首先检查“查找”和“追加”是否仍在同一个锁里。若CRC失败，不要修改manifest让检查通过，应保留损坏样本并定位写入链路。

下一篇把日志中的意图送到真正的本机HTTP服务，验证这份本地保证为何不能直接跨越网络。

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
