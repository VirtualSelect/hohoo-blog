---
title: "注意力分块：不保存完整分数矩阵，如何保持结果？"
description: "从错误的分块平均出发，推导在线Softmax累加，并用9组数组和558次计时区分省内存与加速。"
slug: "/llm/tiled-online-softmax"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:tiled-online-softmax", "project:hohoo-ai-lab", "doc:llm/kv-cache-equivalence"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs) · [原始证据](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs/evidence/20261007) · [实验档案](/labs/tiled-online-softmax)

注意力的一行输出，是所有Key对应Value的加权和。如果Key很长，直接形成QK转置的完整分数矩阵会占空间。一个直觉方案是“分成几块，每块算Softmax，最后把输出平均”。本篇先说明它为什么错，再写出不保存完整分数矩阵的累加过程。

这是NumPy机制演示，**不是FlashAttention GPU实现，也没有复现论文加速比**。本实验的8行query都可以读取全部KV，用于表示已有上下文的非掩码查询；不能直接拿去替代需要因果掩码的训练prefill。

## 为什么每块单独归一化再平均不对

Softmax的分母是所有分数的指数和。两块即使长度相同，概率质量也未必一半一半。分块独立归一化会把每块都强制加到1，平均又给各块相同权重，丢失块之间的相对分数。

负例用三个标量分数0、10、20和Value 1、3、5：完整Softmax几乎只选最后一个Value；把前两个作为一块、最后一个单独一块，平均会错误地向较小Value偏移。配套单测专门要求错误基线出现可见偏差。

## 只要保留三个累积量

对每行query，保存当前最大分数m、归一化分母l、未除分母的加权和a。读到新块分数S后：

~~~text
m_new = max(m, max(S))
rescale = exp(m - m_new)
P = exp(S - m_new)
a_new = a * rescale + P @ V_block
l_new = l * rescale + sum(P)
output = a / l
~~~

最大值变化时，旧分母和旧加权和都要乘rescale，才能回到相同的指数基准。只缩放其中一个会破坏比例。初始m为负无穷、l和a为零；首块自然接管。

在精确算术中这个改写保留同一归一化式，浮点运算次序不同则只能要求误差容限，不能要求逐字节相等。空块、全掩码行也需要单独处理；本轮输入非空且没有掩码，代码没有声称支持所有注意力形式。

## 实际数组与耗时

3种子×64/256/1024个KV，query固定8行、维度32、块长32。每组保存Q/K/V、dense/tiled/错误基线输出；各路径预热5次，再交错计时31轮，共558个正式计时。dense与tiled最大差为3.33e-16。

| KV长度 | dense分数数组 | 单块分数数组 | dense中位耗时 | tiled中位耗时 |
| --- | --- | --- | --- | --- |
| 64 | 4,096 B | 2,048 B | 80.6µs | 190.3µs |
| 256 | 16,384 B | 2,048 B | 151.3µs | 685.3µs |
| 1024 | 65,536 B | 2,048 B | 435.0µs | 2,235.5µs |

数组字节仅计算分数矩阵，不是进程峰值内存。实现还同时保留概率块、累积量、Q/K/V以及Python对象。这里确实减少了单个分数临时数组，但测得的NumPy路径仍更慢。循环、小矩阵调用与内存分配都可能贡献开销；本轮没有逐项剖析，不能断言哪一项是主因。

## 与真正的FlashAttention有什么关系

[FlashAttention论文](https://arxiv.org/abs/2205.14135)将分块计算与GPU内存层级结合，重点是减少高带宽内存和片上存储之间的访问。本篇只展示分块归一化这个可读的数学部件，没有kernel融合、反向传播、GPU访存测量或训练结果。

因此不能从“公式类似”跳到“实现了FlashAttention”。算法表示、硬件实现、端到端性能，是三层不同证据。

## 练习与排错

把块长改成不整除序列长度的7，再与dense比较；最后一块更短也应该满足数值容差。把分数放大观察普通指数直接溢出的风险，当前max平移应保持有限结果。最后故意删掉旧a的rescale，观察误差增大。

若数值正确但慢，先保留负结果，再讨论硬件和数组规模；若数值错误，优先检查归一化基准而不是调宽容差。下一篇转向[KV量化的存储与误差](/docs/llm/kv-int8-error)。

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
