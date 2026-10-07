---
title: "Java 请求重试：三次超时，不等于一个总期限"
description: "七种真实本地 HTTP 情况，比较状态码、Retry-After、尝试上限和总等待预算。"
slug: "/ai-apps/java-retry-deadline"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:java-retry-deadline", "project:hohoo-ai-lab", "doc:ai-apps/java-transport-cancellation"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant) · [原始证据](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant/evidence/20261007) · [实验档案](/labs/java-retry-deadline)

给每次请求设五秒超时，再重试三次，并不能得到“最多五秒”。连接、读取和等待都会消耗时间。更危险的是，客户端超时并不能证明服务端没有执行；把所有异常重试可能重复产生答案、费用或副作用。

本篇实现 RetryBudget，用本地 HTTP 服务验证决策。它只对调用方明确认定可安全重试的 GET 操作开放重试，不把这套规则自动套到模型生成 POST。七个条件都有真实连接，但响应文字是固定 fixture，不是模型输出。

## 两道门：能否重试，以及来不来得及

~~~text
收到结果 → 成功：返回
         → 不可安全重试 / 401：停止
         → 429或503：检查次数 → 计算等待 → 检查剩余预算
                                              ↓
                                     够等才发下一次
~~~

次数上限保护调用数量，总期限控制用户等待；两者都要有。使用 System.nanoTime() 计算经过时间，避免把系统日历时钟调节混进预算。每次连接和读取前重新计算剩余量，已经耗尽就停止。

但这个 Java8 实现是协作式期限，不是硬实时取消器：DNS、操作系统调度、一次阻塞调用的阶段切换可能超出理想时刻。慢响应案例的40ms预算实际记录为45ms，不能把它包装成精确40ms保证。

## Retry-After 不能被随意压短

本地服务返回503和 Retry-After: 1，而本次总预算只有500ms。正确结果是停止，并报告 deadline-before-retry；不是只等剩下的几十毫秒再请求。

~~~java
if (wait >= remaining(deadline)) {
    result.outcome = "deadline-before-retry";
    break;
}
Thread.sleep(wait);
~~~

示例只解析秒数形式；HTTP 日期形式会明确报告 unsupported-retry-after，而非猜测一个值。正式客户端应按协议补充日期解析、退避抖动、连接池策略与可观察日志。这里20ms线性等待只是本地可检验参数，不是公网服务的推荐退避。

## 实测决策表

| 本地情况 | 尝试次数 | 结果 |
| --- | --- | --- |
| 立即200 | 1 | ok |
| 先503再200 | 2 | ok |
| 401 | 1 | not-retryable |
| Retry-After超过剩余预算 | 1 | deadline-before-retry |
| 持续503 | 3 | attempt-limit |
| 响应头延迟200ms，预算40ms | 1 | deadline-or-interrupt |
| 调用方未允许安全重试 | 1 | not-retryable |

尝试数是客户端开始尝试的次数，不等于服务端已处理或已计费数量。原始结果保留了耗时，但没有统计样本支持延迟百分位。

## 接入聊天前必须补的一层

对模型调用，先判断失败发生在发出前还是发出后，确认平台是否有真正的幂等语义。仅自己加一个 request ID 并不能让远端去重。重试拿到回答之后仍要走输出验收与整轮提交；临时预览不能提前写成最终历史。

本例关闭自动重定向，限制成功响应体4096字节；失败响应不解析为模型消息。IO异常不会被泛化为自动重试。中断在等待阶段向调用者传播，已观察到线程中断的读取预算检查则停止，不清除中断标志。

## 小练习与排错

把总预算改成10ms，但保留首次503后的20ms等待。预期不会开始第二次尝试。再把 maxAttempts 改成1，预期即使服务器下一次可能成功也不会重试。二者说明预算优先于“多试一次可能成功”的猜想。

若看到超过总预算的耗时，先区分程序决策检查点与底层阻塞阶段；本轮没有TLS、真实网络故障或连接池压力测试。继续阅读[崩溃后恢复完整问答](/docs/ai-apps/java-durable-turns)，把请求失败和历史持久化分开。

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
