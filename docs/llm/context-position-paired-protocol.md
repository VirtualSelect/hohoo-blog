---
title: LLM 实验（二）：先让对照成立，再谈上下文位置
description: 用 Java 8 实现成组对照与节流，完成 Agnes 3.0 的24次真实请求；公开逐项评分、服务端用量，并解释全对结果的边界。
slug: /llm/context-position-paired-protocol
status: published
published_at: "2026-09-29"
updated: "2026-09-30"
reading_minutes: 16
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

本篇最初于2026-09-29交付通过80项离线检查的Java工程与24项冻结计划。**2026-09-30新增 Agnes 3.0 实测：24次请求完成，6组对照完整。第1–8节保留最初的协议说明，第9节提供新型号的独立结果，旧材料不覆盖。**

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

下表记录2026-09-29首发的准备版本。2026-09-30的真实运行使用重新冻结的 L1v2-agnes3 / version 3，模型改为 agnes-3.0-flash；其他对照设计不变，详见第9节。

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

## 9. Agnes 3.0：24次在线对照，全部符合预期说明了什么？

2026-09-30，在重新冻结的 L1v2-agnes3 协议下完成24次真实调用。每份响应的 model 均为 agnes-3.0-flash；Java 1.8.0_171，运行代码提交为 b352a38。请求计划与调用前保存的准备版本逐项一致，没有看结果后修改问题、重试或补样本。

[本轮代码与复现说明](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced) · [独立审计汇总](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced/evidence/20260930-agnes3-live/audit.json) · [逐条响应](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced/evidence/20260930-agnes3-live)

### 9.1 先看请求是否可用，再看回答是否正确

| 项目 | 本次记录 |
| --- | ---: |
| 计划 / 实际尝试 / 可评分响应 | 24 / 24 / 24 |
| 完整对照块 | 6 / 6 |
| HTTP或响应协议失败 | 0 |
| 含答案条件：编号正确 | 18 / 18 |
| 缺失答案条件：正确输出UNKNOWN | 6 / 6 |
| 重试 / 未执行 | 0 / 0 |

评分只去掉首尾空白，未从解释中提取编号，也没有让另一个模型代评。三种位置各6次，其中60行和240行材料各3次：

| 干扰行数 | 开头 | 中间 | 末尾 | 无答案 |
| --- | ---: | ---: | ---: | ---: |
| 60 | 3/3编号正确 | 3/3编号正确 | 3/3编号正确 | 3/3正确拒答 |
| 240 | 3/3编号正确 | 3/3编号正确 | 3/3编号正确 | 3/3正确拒答 |

分母是固定请求数，不是独立随机抽样的真实业务问题数。三个项目在不同条件下反复使用，24次请求不能当作24种独立任务。

### 9.2 从一条响应走到可复核结论

第1条请求是F1、60行干扰、答案在开头。原始记录显示 HTTP 200、finishReason=stop、正文为 QX-7319。usage 是输入2323、输出8、总计2331 tokens。

复核时先根据 case 找到冻结的期望编号，再从 plan.json 检查发送材料与目标位置，最后比较响应正文。outcome 是本地程序算出的评分，不能只相信这个字段；独立 audit.mjs 会重算评分、请求哈希、完整块与用量。5项新增离线测试确认原证据通过，而篡改模型、评分、用量或请求哈希均被拒绝。

离线审计不会读取密钥或发起模型请求，进入实验目录后执行：

```sh
node audit.mjs evidence/20260930-agnes3-live
node --test audit.test.mjs
```

### 9.3 用量与节流确实执行了吗？

24份响应合计输入 **134,614**、输出 **144**、总计 **134,758 tokens**。单次返回的输入计数为2,320–8,898 tokens。这是本端点的 usage 口径，不把它换算成未核实的账单价格。输出很短也不代表长材料调用没有输入成本。

执行时间为UTC 05:06:52.476–05:17:12.120，北京时间13:06:52至13:17:12。根据每条开始时间和处理耗时，最短观察间隔为 **20.001秒**，符合至少20秒的设定。本轮没有429，只能说明本轮未触发限流，不能反推平台保证的配额。

### 9.4 全对是观察，不是“位置无关”的证明

本次没有观察到三个位置的回答差异。更准确的解释是：**这组三题、两种材料长度和每格一次的任务，没有区分出模型在位置上的表现。**

所有条件达到最高分，存在测量天花板。目标行的句式和项目名也比较鲜明，材料虽包含大量其他编号，仍可能不足以构成困难检索。我们没有测到上下文极限，也没有隔离内部注意力机制。

不能把本轮与旧Agnes 2.5的26份响应合并，也不能把两轮差异归因为模型升级：旧试验的材料、顺序、长度和停止规则不相同。

下一步应先固定更接近业务的困难条件，例如相似项目名、旧新版本冲突或自然改写的问题，再保留无答案对照并增加重复。该扩展尚未执行；本轮预算到24次即结束。
