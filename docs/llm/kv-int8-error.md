---
title: "KV 量化入门：省下多少字节，又引入什么误差？"
description: "比较整张量与逐行int8量化，显式计入scale，观察离群值对注意力输出的影响。"
slug: "/llm/kv-int8-error"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:kv-int8-error", "project:hohoo-ai-lab", "doc:llm/tiled-online-softmax"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs) · [原始证据](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs/evidence/20261007) · [实验档案](/labs/kv-int8-error)

把KV从float32变成int8，直觉上能缩小四倍。但这句话遗漏了量化参数，也没有回答更关键的问题：量化误差经过Softmax后，会怎样影响输出？

本篇保存合成K/V数组，比较整张量一个scale与每行一个scale。没有训练模型、自然语言问答或GPU量化算子。压缩的是存储表示；计算时会还原成float64，所以**不宣称降低计算峰值内存或提升吞吐**。

## 先把一个数怎样变化讲清楚

使用对称int8范围[-127,127]，scale为该组最大绝对值除127：

~~~text
scale = max(abs(x)) / 127
q = round(x / scale)
x_hat = q * scale
~~~

全零组把scale设为1，避免除零。scale以float32保存，量化值以int8保存。四舍五入误差大致由半个量化步长控制，还要考虑scale自身浮点精度；本例单测检查固定正常数组，不声称任意输入都可忽略scale误差。

整张量只存一个scale，开销小；逐行可以让不同Token使用自己的范围，但要多存scale。它也不能解决同一行内一个很大元素压缩其他小元素分辨率的问题。

## 为什么离群值重要

本轮在K和V的第一个元素上施加40倍扰动，再用同样输入比较。这个人为设置不等于真实LLM的分布，只用于观察动态范围扩大。

~~~text
K量化误差 → QK分数变化 → Softmax权重变化
V量化误差 ───────────────────→ 加权和变化
~~~

两处误差可以共同影响输出。仅检查KV逐元素误差，不足以替代注意力输出对照；更不能替代真实模型任务质量评测。

## 字节账单

维度32、K和V各N行；下表含两份scale，不含对象头或分配器开销。

| N | float32 KV | 整张量int8 + scale | 逐行int8 + scale |
| --- | --- | --- | --- |
| 64 | 16,384 B | 4,104 B | 4,608 B |
| 256 | 65,536 B | 16,392 B | 18,432 B |
| 1024 | 262,144 B | 65,544 B | 73,728 B |

逐行在N=256时比float32少存约71.9%的数组字节，而不是严格75%。基准是同形状float32表示；数值参考和实际实验计算用float64，分母不能混用。

## 输出误差并非一个固定折扣

3种子×3长度×正常/离群×两策略，共36组。以种子7、长度256的最大绝对输出差为例：

| 输入 | 整张量 | 逐行 |
| --- | --- | --- |
| 正常 | 0.00437 | 0.00247 |
| 40倍单元素扰动 | 0.04396 | 0.04295 |

逐行在这个样本有帮助，但离群情况下差距很小。完整矩阵最大绝对输出误差达到4.136，不能只展示上表温和样本就说“几乎无损”。原始数据保存每组误差与输出数组；这些绝对误差的意义还依赖输出尺度。

[KIVI研究](https://arxiv.org/abs/2402.02750)讨论了Key与Value分布差异，并采用不同分组方式。本篇两者都使用同一简单策略，没有实现KIVI的2bit方案，也不能借用其真实模型结论。

## 可以自己做的两个检查

首先把全部KV设为零，输出应有限且为零；再把一个元素放大，观察哪一个scale发生变化。整张量会影响全体精度，逐行只改变该行，但该行内部的小元素仍可能受损。

若想判断可否用于生产，下一步需要真实模型的校准分布、任务误差、反量化代价、峰值显存和端到端性能。这些是后续候选，不能从36组随机数组自动推导。优先读懂本轮保存的负结果，而不是追求一个好看的压缩倍数。

## 从干净目录复现

使用 Python 3.12。入口一次运行这组三个主题的对照，各篇只解读自己的子集，不把同一份记录重复当作新增回合。

~~~sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 02a2660e22c969e70e3a6f095003614a7dfa448e
python -m pip install numpy==2.2.6
python experiments/10-attention-costs/run.py --out outputs/my-run
python experiments/10-attention-costs/audit.py outputs/my-run
~~~

输出目录必须不存在。本机验证环境为 Windows，Linux/macOS尚未复测。不需要模型密钥或付费服务。manifest中的代码冻结提交早于上方含证据的归档提交，源码哈希对应实际执行文件。
