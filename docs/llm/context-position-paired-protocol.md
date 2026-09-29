---
title: LLM 实验（二）：先让对照成立，再谈上下文位置
description: 从上一轮限流失败出发，用 Java 8 重建成组对照、请求节流、停止条件与独立审计；公开80项离线检查和24项请求计划。
slug: /llm/context-position-paired-protocol
status: published
published_at: "2026-09-29"
updated: "2026-09-29"
reading_minutes: 12
domain: llm
article_kind: case-study
difficulty: intermediate
related:
  [
    "doc:llm/context-position-experiment",
    "doc:llm/kv-cache",
    "project:hohoo-ai-lab",
    "lab:context-position",
  ]
---

[上一轮上下文位置试验](/docs/llm/context-position-experiment)计划发出48次请求，实际发出29次，最后三次都是HTTP 429。26份正常返回都符合预期，但各位置的样本量不一样。

接下来如果只是“等一会儿再跑一遍”，我们仍然可能得到一份难以解释的汇总。这篇先解决更基础的问题：**怎样把实验写成一个会守预算、会停止、也知道哪些结果能比较的程序？**

本篇交付的是已经运行过离线检查的Java工程、冻结材料与完整请求计划。**80项离线检查通过，24项计划完成独立审计；本版本尚未执行新的线上模型对照。以下不报告新的模型正确率，也不把模拟响应当成实测。**

[工程与复现说明](https://github.com/VirtualSelect/hohoo-ai-lab/tree/dae0b8c50cd786b1bced8686f265f7560430d4f1/experiments/02-context-position-paced) · [完整24项请求](https://github.com/VirtualSelect/hohoo-ai-lab/tree/dae0b8c50cd786b1bced8686f265f7560430d4f1/experiments/02-context-position-paced/evidence/20260929-l1v2-offline/plan.json) · [验证记录](https://github.com/VirtualSelect/hohoo-ai-lab/tree/dae0b8c50cd786b1bced8686f265f7560430d4f1/experiments/02-context-position-paced/evidence/20260929-l1v2-offline/manifest.json)

## 1. 限流为什么会改变结论的可信度？

想比较“开头”和“中间”，理想情况下应该让**同一个问题、同一份资料、同一套评分**只改变答案的位置。若开头返回的恰好都是容易题，中间只返回了难题，直接比较两组正确率会混入题目难度。

上一轮是打乱全部请求后依次发送。提前中断后，虽然每次记录都是真实的，却不保证同一个问题在所有条件下都有响应。

这不是说随机顺序不好。随机化有助于分散时间相关因素，但停止以后仍要处理缺失。新版改用小块组织：一个项目、一个材料长度，连续完成四个条件，称为一个block。

```text
同一项目 + 同一长度
    beginning → middle → end → absent
    四份响应均有效，才形成一个完整对照块
```

这里的有效指“请求与响应协议可用”，不是“答案正确”。答错、拒答、格式错误必须保留在评分中，不能为了漂亮的结果排除它们。

## 2. 新协议具体冻结了什么？

| 项目     | 新版设定                                            |
| -------- | --------------------------------------------------- |
| 虚构事实 | 3个项目，每个项目有一个明确交接编号                 |
| 干扰材料 | 60 / 240行，使用4种固定归档句式                     |
| 条件     | beginning / middle / end / absent                   |
| 预算     | 3 × 2 × 4 = 24次，不重试                            |
| 模型     | agnes-2.5-flash                                     |
| 参数     | temperature=0，max_tokens=1024                      |
| 请求间隔 | 上一次请求完成后，至少等20秒                        |
| 停止     | 429/401/403立即停止；其他请求或协议失败连续两次停止 |
| 计分     | 只去首尾空白，精确比较编号或UNKNOWN                 |

旧版与新版改变了材料、样本、顺序、输出预算和节流策略，因此**不能直接拼起来当一个更大的统一实验**。新目录、新协议版本和新提交各自记录，旧响应保持原样。

24次是代码上限，不是要求一定把预算用满。遇到停止条件就终止；未执行的请求要继续算作未执行。

## 3. 材料变长，先防止“答案自己泄漏”

三种含答案条件使用同一组N+1行资料，只改变目标行位置：

| 条件      | 目标行（从0开始） |   N=60 |  N=240 |
| --------- | ----------------: | -----: | -----: |
| beginning |                 0 |      0 |      0 |
| middle    |               N/2 |     30 |    120 |
| end       |                 N |     60 |    240 |
| absent    |        没有目标行 | 无答案 | 无答案 |

四种干扰句式都带有其他项目名和形似NX-4000的编号。目标答案不应成为全文唯一的编号，否则模型可能不必匹配项目名就答对。

离线检查验证三个含答案版本排序后的**完整行列表**相同，而不是只比较集合；集合会掩盖重复行数量的错误。还检查目标编号恰好出现一次、目标位置正确，absent资料中没有该项目名和编号。

问题仍放在所有资料之后。所以移动目标行也改变了它距离问题的远近，当前设计无法单独分离注意力、距离或其他内部机制。

干扰行数变成四倍，也不代表token精确变成四倍。本次序列化请求为3,689–13,912个UTF-16字符，含JSON字段与提示，不是token测量。只有真实响应中的usage才可能提供服务端计数，且口径仍由服务决定。

## 4. 小块排列解决什么，又留下什么？

实际六个block的顺序预先固定：

| block | 项目 | 干扰行数 | 条件顺序                          |
| ----- | ---- | -------: | --------------------------------- |
| 1     | F1   |       60 | beginning / middle / end / absent |
| 2     | F2   |      240 | middle / end / absent / beginning |
| 3     | F3   |       60 | end / absent / beginning / middle |
| 4     | F1   |      240 | absent / beginning / middle / end |
| 5     | F2   |       60 | beginning / middle / end / absent |
| 6     | F3   |      240 | middle / end / absent / beginning |

长度交替，条件起点轮换，减少一种条件永远最后执行的情况。但六个block不是四种顺序的完整平衡设计，仍有时间与顺序偏差，不能宣称已经消除混杂。

如果第7次请求失败并触发停止，block 1可能完整，block 2不完整。程序保留全部记录，但位置比较只能使用满足条件的完整block，不能拿block 2剩下几条去补别组的分母。

这也有局限：只比较完整block可能产生选择偏差。因此报告必须同时列出**全部尝试、失败、未执行、完整块和不完整块**，不能只展示最终纳入比较的数据。

## 5. 20秒节流不是服务承诺

代码把等待放在两次尝试之间：

```java
for (JsonElement el : jobs) {
    if (index > 0) sleeper.pause(number("minPauseMs"));
    // 记录请求标识，再调用 transport.send(...)
    // 保存响应或失败，检查是否应该停止
}
```

实际含义是“上一次请求处理和保存完成后，再等20秒”。如果生成用了8秒，两次开始时间至少相隔约28秒，而不是每20秒强行发一次。

HTTP 429表示请求过多，服务可以给出Retry-After；它不能单独告诉我们触发的是每分钟请求、token、并发还是其他限制。参见[RFC 6585 第4节](https://www.rfc-editor.org/rfc/rfc6585#section-4)。

本地20秒间隔是实验设定，**不是已经核实的Agnes配额，也不能保证不再429**。收到429本轮立即停止；若响应带合法秒数或日期形式的Retry-After，只记录，不自动等待后重发。

401/403同样立即停止，不继续消耗整个计划去重复验证同一权限错误。连接10秒、读取90秒；读取超时仍不是整个请求的总截止，也不能证明服务器没有执行。

## 6. 程序测试与模型试验分两层

新版把两种依赖抽出来：

```java
interface Transport {
    JsonObject send(JsonObject request, String key) throws IOException;
}
interface Sleeper {
    void pause(long millis) throws InterruptedException;
}
```

正式运行使用HTTP实现和Thread.sleep。测试替换成假传输与假时钟，不访问模型、不真实等待。执行的仍是同一个execute循环。

| 注入条件              | 实际检查的程序行为                 |
| --------------------- | ---------------------------------- |
| 第一次返回429         | 只尝试1次，不再等待或继续          |
| 第一次返回401或403    | 只尝试1次，保存状态码并停止        |
| 连续500               | 尝试2次，中间等待1次，然后停止     |
| 24份可解析响应        | 尝试24次，等待23次，不越预算       |
| 只有UNKNOWN的模拟正文 | 有答案时记拒答；absent时记正确拒答 |

80项断言通过，只能说明这些代码路径和材料约束符合预期。假传输返回UNKNOWN不代表Agnes这么回答过，也不能拿这24份测试响应计算模型性能。临时测试文件执行后清除；公开准备目录没有attempt响应文件。

评分仍然严格：合法但错误的编号是incorrect，多余解释是format_error，含答案题返回UNKNOWN是abstention；HTTP和协议失败单列。输出上限提高到1024也不保证最终正文有1024 token。

## 7. 先导出，再审计，最后才调用

进入Java仓库的experiments/02-context-position-paced，JDK 8 + Maven：

```powershell
mvn -q compile
mvn -q exec:java "-Dexec.args=--self-test"
mvn -q exec:java "-Dexec.args=--dry-run"
mvn -q exec:java "-Dexec.args=--prepare evidence/my-preparation"
node audit.mjs evidence/my-preparation --prepared
```

前面所有命令都不发送模型请求。输出目录必须不存在。准备产物包括：

| 文件          | 可以核对什么                            |
| ------------- | --------------------------------------- |
| protocol.json | 模型、预算、材料长度、间隔与停止条件    |
| cases.json    | 虚构事实与期望编号                      |
| plan.json     | 每一次请求的完整messages及执行顺序      |
| manifest.json | 源码提交、文件hash、JDK版本、离线检查数 |

本次准备运行使用Java 1.8.0_171；源代码在提交ee081ef冻结，独立Node审计确认24个唯一条件组合与材料约束。

真实执行需要在本机进程环境配置AGNES_API_KEY，再选择**另一个新目录**：

```powershell
mvn -q exec:java "-Dexec.args=--run evidence/my-live-run"
node audit.mjs evidence/my-live-run
```

只有--run发送请求，最多24次。它不读取IDE配置，不输出密钥，也不保存reasoning_content。请求、响应证据写入新目录，不能把准备目录伪装成线上记录。

## 8. 什么结果才值得写进下一份研究结论？

最少需要看到：真实请求时间、请求hash、响应正文、协议状态、逐条评分、每组分母、停止原因和实际usage。usage合计只覆盖有返回值的请求，不等于账户账单。

即使未来24次都完成，这仍然只有三组固定虚构事实、单模型、单端点、无重复。240行也不是模型上下文上限，不足以证明“模型不会丢中间信息”。

[Lost in the Middle](https://arxiv.org/abs/2307.03172)研究了特定任务和模型中相关信息位置对表现的影响；本案例借用了对照思路，材料和实验规模不同，不是论文复现。

本篇完成的是一个更可审计的实验入口。下一份结果报告应该在这份冻结协议上运行、逐条核验，再决定扩大题型、增加长度还是研究检索。**先保证比较成立，才能讨论比较发现了什么。**
