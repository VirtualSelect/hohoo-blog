---
title: "KV 缓存开销剖析：把省下的计算和新增的工作分开"
description: "对909次查询做分段计时，验证源码签名、查找、复制与续算分别花在哪里，同时保留缓存仍慢的结果。"
slug: "/llm/cache-cost-profile"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:cache-cost-profile", "project:hohoo-ai-lab", "doc:llm/prefix-cache-admission"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs) · [原始证据](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs/evidence/20261007) · [实验档案](/labs/cache-cost-profile)

上一轮缓存准入实验出现了一个不太好看的结果：少投影一些Token，查询却更慢。那时日志只记录总耗时，不能直接把原因归咎于“Python慢”或“复制太多”。本篇做一个更窄的实验：先固定为永远命中的八Token前缀，再把续算链分段计时。

这是未训练的两层NumPy教学Decoder，维度16、完整输入12Token。没有GPU、真实模型调用或模型质量评价。它回答本机这段实现的开销问题，不代表所有KV缓存。

## 对照组究竟改了什么

| 路径 | 签名方式 | 计算 |
| --- | --- | --- |
| full | 不需要缓存签名 | 重算12Token，取后4个输出 |
| rehash | 每次读源码、哈希权重和配置 | 查找八Token缓存，再续算4Token |
| frozen | 模型初始化时固定签名 | 相同查找、复制和续算 |

缓存键仍包含 scope、签名和前缀Token。冻结模型将embedding和权重设为只读；换权重应创建新实例及签名。这是可信本地代码的生命周期约定，不是防御恶意修改的安全边界，也不允许热改权重后继续使用旧缓存。

~~~text
总查询 = 签名 + 查找 + 复制 + 续算 + 未归属开销
                    ↑
       少算Token，并不能消除左边三项
~~~

## 怎样量，避免把一次波动当结论

三个固定种子，每种路径先预热五次；之后每种子101轮，每轮随机交错三路径，共909次正式查询。用单线程BLAS环境，计时采用 perf_counter_ns。返回值与完整重算结果比较，最大容差1e-12。

记录包含 total、signature、lookup、copy、compute 和 residual。residual不是“其它硬件瓶颈”的测量，只是总时长减去已包围片段的差，包括计时调用、字典操作和片段之间的程序工作。

## 本机结果：改好了一部分，但还没有胜过重算

下表各列是该片段独立中位数，单位微秒，**不能把各列中位数相加当作总时长中位数**。

| 路径 | 总查询 | 签名 | 查找 | 复制 | 计算 |
| --- | --- | --- | --- | --- | --- |
| full | 252.7 | — | — | — | 250.9 |
| rehash | 682.7 | 365.2 | 2.8 | 12.0 | 290.4 |
| frozen | 273.6 | 0.6 | 2.2 | 9.0 | 257.1 |

在这个永远命中的小工作负载里，避免每次计算源码/权重签名明显缩短了查询。但frozen中位数仍比full多20.9微秒。数组较小、调用与分段计算成本仍存在；本轮没有继续分解NumPy内部开销，因此不能给出更细的确定归因。

这也不是上一轮4860次请求结果的“更正”：上一轮含冷启动、工作集和淘汰，本轮故意排除了它们。两者的分母和测量边界不同，不应直接拼成加速图。

## 读代码时注意所有权

命中后仍复制缓存数组，再传给续算。若直接把公共缓存作为可变工作区，某次续算可能污染下一个请求；性能优化不能以隐式共享写入换取。是否可以安全地减少复制，需要明确数组是否只读、层内是否分配新数组，并增加跨请求隔离验证，本轮没有擅自省掉。

## 小练习

从profile.json任选一行，验证各段加residual恰好等于total；再对整列分别求中位数，观察“中位数的和”和“和的中位数”通常不相同。然后增大输入长度，在新目录重新运行；不要预写“长序列一定更快”，先检查当前固定前缀长度是否仍合理。

若不同机器数值变化，先检查NumPy/BLAS版本、线程环境、后台负载与计时范围。若结果不等价，先检查模型身份和绝对位置，不应先讨论速度。下一篇研究[不保存完整注意力分数矩阵](/docs/llm/tiled-online-softmax)，换一个内存问题。

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
