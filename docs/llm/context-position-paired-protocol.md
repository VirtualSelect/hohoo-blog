---
title: LLM 实验（二）：先让对照成立，再谈上下文位置
description: 用 Java 8 实现成组对照与节流，完成 Agnes 3.0 的24次真实请求；公开逐项评分、服务端用量，并解释全对结果的边界。
slug: /llm/context-position-paired-protocol
status: published
published_at: "2026-09-29"
updated: "2026-11-12"
reading_minutes: 9
domain: llm
article_kind: case-study
difficulty: intermediate
related:
  [
    "doc:llm/kv-cache",
    "project:hohoo-ai-lab",
    "lab:context-position",
  ]
---

为什么不能用“26次全对”说明模型不受上下文位置影响？因为原计划没有跑完，各条件缺失的请求还不同。2026-09-30重新冻结协议后，完成了24次Agnes 3.0真实调用：六组对照完整，含答案的18次编号正确，无答案的6次输出UNKNOWN。**这证明本轮材料没有区分出位置差异，不证明位置永远无关。**

本文由AI辅助整理，保留实际调用、负结果及其边界。旧轮限流记录合并在文末；原始数据不改写，不与新轮合并。

## 对照如何成立

每个block固定一个虚构项目和一种材料长度，只改变目标行在开头、中间、末尾，或完全缺失。三项目 × 两长度（60/240条干扰行）× 四条件，共24次请求。四份协议可用响应才构成完整block；答错仍须计分，不能剔除。

含答案的三个版本拥有同一份行列表，仅顺序不同；目标编号恰好出现一次，无答案版本不含该项目及编号。干扰行也有其他编号，避免答案成为全文唯一编号。问题位于资料之后，位置与距问题的距离仍耦合，不能用这份实验解释模型内部注意力机制。

## 节流、失败和评分各自记录

实际模型为agnes-3.0-flash，temperature=0、max_tokens=1024；一次请求结束后至少等待20秒，不重试。429/401/403立即停止，其他请求或响应协议失败连续两次停止。未执行、无可用响应、回答错误是三个状态，不能互相填补分母。

六个block的长度交替，条件起点轮换，但不是完整平衡顺序设计。评分只去首尾空白，再精确比较编号或UNKNOWN。材料和标签是固定教学数据，不是随机抽样的真实用户问题。

## Agnes 3.0：24次在线对照，全部符合预期说明了什么？

2026-09-30，在重新冻结的 L1v2-agnes3 协议下完成24次真实调用。每份响应的 model 均为 agnes-3.0-flash；Java 1.8.0_171，运行代码提交为 b352a38。请求计划与调用前保存的准备版本逐项一致，没有看结果后修改问题、重试或补样本。

[本轮代码与复现说明](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced) · [独立审计汇总](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced/evidence/20260930-agnes3-live/audit.json) · [逐条响应](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced/evidence/20260930-agnes3-live)

### 先看请求是否可用，再看回答是否正确

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

### 从一条响应走到可复核结论

第1条请求是F1、60行干扰、答案在开头。原始记录显示 HTTP 200、finishReason=stop、正文为 QX-7319。usage 是输入2323、输出8、总计2331 tokens。

复核时先根据 case 找到冻结的期望编号，再从 plan.json 检查发送材料与目标位置，最后比较响应正文。outcome 是本地程序算出的评分，不能只相信这个字段；独立 audit.mjs 会重算评分、请求哈希、完整块与用量。5项新增离线测试确认原证据通过，而篡改模型、评分、用量或请求哈希均被拒绝。

离线审计不会读取密钥或发起模型请求，进入实验目录后执行：

```sh
node audit.mjs evidence/20260930-agnes3-live
node --test audit.test.mjs
```

### 用量与节流确实执行了吗？

24份响应合计输入 **134,614**、输出 **144**、总计 **134,758 tokens**。单次返回的输入计数为2,320–8,898 tokens。这是本端点的 usage 口径，不把它换算成未核实的账单价格。输出很短也不代表长材料调用没有输入成本。

执行时间为UTC 05:06:52.476–05:17:12.120，北京时间13:06:52至13:17:12。根据每条开始时间和处理耗时，最短观察间隔为 **20.001秒**，符合至少20秒的设定。本轮没有429，只能说明本轮未触发限流，不能反推平台保证的配额。

### 全对是观察，不是“位置无关”的证明

本次没有观察到三个位置的回答差异。更准确的解释是：**这组三题、两种材料长度和每格一次的任务，没有区分出模型在位置上的表现。**

所有条件达到最高分，存在测量天花板。目标行的句式和项目名也比较鲜明，材料虽包含大量其他编号，仍可能不足以构成困难检索。我们没有测到上下文极限，也没有隔离内部注意力机制。

不能把本轮与旧Agnes 2.5的26份响应合并，也不能把两轮差异归因为模型升级：旧试验的材料、顺序、长度和停止规则不相同。

下一步应先固定更接近业务的困难条件，例如相似项目名、旧新版本冲突或自然改写的问题，再保留无答案对照并增加重复。该扩展尚未执行；本轮预算到24次即结束。

## 旧轮为何不再单独成篇

2026-09-28的Agnes 2.5计划48次，实际尝试29次：26份正常回答符合预期，三次HTTP 429后停止，19次未执行。开头/中间/末尾/无答案实际尝试8/8/7/6次，其中可用响应8/6/6/6次。这些不平衡分母不能支持位置比较，也不能与24次新轮拼接。

[原29次尝试及未执行计划](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e072718c3cd66d44978612208d393ff0d3eff9e4/experiments/01-context-position/evidence/20260928-l1)仍可核对；原文独有的失败记录保留在这里，重复的协议说明不再占一篇。后续128次相似干扰方案实际执行0次，只列在[后续计划](/learning?track=llm#plans-llm)，不算研究结果。

## 只核对已有结果，不发送请求

在新目录克隆配套工程并切换到本文含证据的固定提交，使用Node.js检查归档；无需模型密钥。这里不提供自动在线运行步骤，避免把历史24次误当成需要重跑的检查。


```powershell
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-position
cd hohoo-ai-lab-position
git checkout e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1
cd experiments/02-context-position-paced
node audit.mjs evidence/20260930-agnes3-live
node --test audit.test.mjs
```
