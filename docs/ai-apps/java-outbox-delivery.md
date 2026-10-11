---
title: "Outbox投递：本地可靠，不等于远端只执行一次"
description: "对照有键和无键接收端，解释回复丢失、回执缺失与远端重复副作用。"
slug: "/ai-apps/java-outbox-delivery"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "ai-apps"
article_kind: "tutorial"
difficulty: "intermediate"
prerequisites: ["doc:ai-apps/java-durable-idempotency"]
related: ["lab:durable-dispatch", "project:hohoo-ai-lab"]
---

[固定代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch) · [原始证据](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch/evidence) · [实验档案](/labs/durable-dispatch)

把请求意图写进持久日志后，进程重启不会忘记“还有什么要做”。但这只解决了任务不丢的问题。服务端执行成功、客户端来不及写回执时，恢复程序仍要面对一个问题：**再发一次，究竟是继续原任务，还是多执行一次？**

本篇将上一节的 `Ledger` 接到真实本机HTTP连接，比较接收端支持与不支持持久幂等的行为。工具只增加教学日志的记录数，没有外部模型和真实业务副作用。

## Outbox不是执行成功的证明

这里的Outbox是一份已提交意图日志。它保存稳定操作key和正文；dispatcher扫描未有回执的意图，发送HTTP，再把接收端返回的结果记入另一份回执日志。

```text
intents.wal      dispatcher          HTTP receiver       receipts.wal
保存key/body → 发送原key/body ───→ 提交效果与结果
                         ←────── 200 / result
                   崩溃！                         没有回执
恢复扫描     → 再发送同key/body ─→ 重放或再次执行？
```

这个崩溃窗口不能被客户端的“已经发送”标记消除。先标记已送再发，可能丢任务；发完再标记，可能重复。实验采用后者，接受重送，并要求接收端说明重复请求的语义。

## 稳定身份必须跨过HTTP边界

`Workflow.deliver` 把意图的key写进 `Idempotency-Key`，每次重试保持同一正文。接收端有两个模式：`keyed` 把这个key交给持久Ledger；`unkeyed` 每收到一次就生成新身份。

两种模式走同样的真实回环连接、同样的“收到回复但没写回执”崩溃点。区别只有接收端是否把两次投递当成同一个意图。请求头没有标准魔法：没有接收端约定，它只是一个字符串。

## 五个场景，三个不同的答案

| 场景 | 接收端效果数 | 回执数 | 完整历史数 |
| --- | ---: | ---: | ---: |
| 支持幂等，投递后崩溃再恢复 | 1 | 1 | 1 |
| 不支持幂等，同样崩溃再恢复 | **2** | 1 | 1 |
| 支持幂等，接收端也重启 | 1 | 1 | 1 |
| 接收端暂时不可用，之后恢复 | 1 | 1 | 1 |
| 接收端已有同key不同正文 | 1个旧效果 | **0** | **0** |

第二行是本篇最重要的反例：本地最终只有一个回执和一轮历史，远端却已经执行两次。**观察自己的历史没有重复，不能推出工具没有重复。**

不可用场景先停止接收端，确认dispatcher非零退出，并且此时回执与历史均为空，然后启动接收端重新投递。表中的1是恢复后的状态，不是把第一次连接失败算成成功。冲突场景则保留接收端的旧效果，返回409；dispatcher不写成功回执，也不伪造回答。

## 为什么还需要单一dispatcher

本例用 `dispatcher.lock` 包住一次恢复循环，避免多个本地进程同时为同一目录投递。各Ledger再独立锁定自己的文件。这让“恢复协调”和“记录原子性”分工清楚，也让实现容易复现。

代价同样明确：持锁跨越网络等待，一个慢请求会挡住后续意图。生产系统可能采用租约、认领状态和并行分区，但租约过期又会引入重复投递窗口，不能只换成线程池就宣称问题解决。本例只展示正确性边界，不实现任务队列平台。

## 保留时间也是协议的一部分

本轮接收端不会删除key。因而重启后仍能重放旧结果。若生产系统只保留key一分钟，而发送端两小时后仍重试，重复执行窗口就重新出现。也不能用同一个key去代表修改过的请求：它应该成为显式冲突，而不是悄悄执行新参数。

这次没有测TTL、跨区域副本、身份鉴权或真正的业务数据库。它也不证明模型提供方支持这个头，更不能据此承诺重复调用不收费。对无法幂等的外部操作，应保留“结果未知”，使用提供方的状态查询或人工对账路径。

### 动手练习

找到 `unkeyed_delivery` 的三份日志：接收端有两条，回执和历史各一条。先画出崩溃发生的位置，再将接收端改成keyed模式，在**新输出目录**运行对照。若得到两个效果，检查重试是否生成了新key、接收端是否清空旧日志，以及正文是否改变。

同一运行工具也保存完整子进程命令与退出码。日志中的 `halt(23)` 是注入的真实退出；不要把所有非零退出都叫成网络超时。下一篇处理另一个缺口：远端和回执都成功，完整对话却尚未提交。

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
