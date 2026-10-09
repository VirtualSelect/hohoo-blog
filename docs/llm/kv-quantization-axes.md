---
title: "KV 量化轴：Key 与 Value 为什么不能一概而论？"
description: "162组保存整数码的离线对照，比较全张量、逐Token与K逐通道/V逐Token，保留混合策略并非总更优的结果。"
slug: "/llm/kv-quantization-axes"
status: "published"
published_at: "2026-10-09"
updated: "2026-10-09"
reading_minutes: 10
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
prerequisites: ["doc:llm/kv-int8-error"]
related: ["lab:kv-quantization-axes", "project:hohoo-ai-lab", "doc:llm/tiled-online-softmax"]
---

[固定代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/009289d3c9314d64a495303d9b16517080282788/experiments/11-kv-quantization-axes) · [输入、整数码与输出](https://github.com/VirtualSelect/hohoo-ai-lab/tree/009289d3c9314d64a495303d9b16517080282788/experiments/11-kv-quantization-axes/evidence) · [实验档案](/labs/kv-quantization-axes)

上一篇看到：逐行 int8 能缩小 KV 表示，但一行中较大的元素仍会压低其他元素的分辨率。那就把分组换成“逐通道”，是否一定更好？本篇的答案是：**取决于离群值怎样分布，不能只记住一个推荐轴。**

本轮不是训练模型评测。它保存固定随机数组、量化整数码、scale 与注意力输出，用可以控制的分布解释误差来源。没有 Agnes 调用、真实模型权重、GPU 内核或吞吐测量。

## 把行和列对应到实际含义

K、V 都按 `N × D` 排列：N 行是 Token，D 列是特征通道。使用同一对称量化公式：

```text
scale = max(abs(group)) / 127
code  = clip(round(x / scale), -127, 127)
x_hat = code * scale

全张量：所有元素共用 1 个 scale
逐 Token：每一行共用 1 个 scale，共 N 个
逐通道：每一列共用 1 个 scale，共 D 个
```

假设某一个通道在很多 Token 上都很大。逐 Token 的每一行都会被这个通道拉大 scale，小通道的细节一起损失。逐通道把这个大通道隔离，其他列仍可用自己的小步长。反过来，如果一个 Token 的整行异常大，逐 Token 可以隔离它；逐通道会让每一列都受到影响。

这是一种可检验的机制解释，不代表真实模型一定按这两种理想形状分布。[KIVI](https://arxiv.org/abs/2402.02750)也讨论了 K/V 分布与不同量化粒度；本实验只借鉴问题，不复现其分组、非对称 2bit、残差缓存或真实模型结论。

## 为什么 K 误差与 V 误差不能混着看

```text
K 的误差 → QKᵀ / √D → Softmax 权重变化 → 输出
V 的误差 ─────────────────────────→ 加权和变化
```

K 改变“关注谁”，V 改变“拿到什么”。本轮把量化目标拆成 K-only、V-only 和 KV，而不是只展示二者同时变化后的一个数字。注意力使用稳定 Softmax 和 float64 计算；输入与未量化的缓存基准为 float32，不能把不同精度的存储账混在一起。

协议固定种子 7、19、41，长度 64、256，D=32，8 个 Query。每份基础数组再构造三个条件：保持干净；K 的第 0 列乘 40；V 的第 0 行乘 40。相同输入比较三种方案，三个量化目标，共 **18 份输入、162 个输出对照**。改变条件不重新抽随机数，尽量减少无关差异。

## 结果：混合策略有优势，也有明确反例

误差定义为 `||输出 - 参考输出||₂ / ||参考输出||₂`。下表为每个条件的六份输入（3 种子 × 2 长度）分别计算相对误差后取算术平均，单位 %；不是“平均输出的误差”，也不代表真实任务准确率。

| 同时量化 K/V | 全张量 | 全部逐 Token | K 逐通道 / V 逐 Token |
| --- | ---: | ---: | ---: |
| 干净输入 | 1.2067 | **0.8006** | 0.8818 |
| K 通道离群值 | 13.9727 | 7.9781 | **1.9215** |
| V Token 离群值 | 8.9957 | **0.7364** | 0.8106 |

![三种量化规则在三种合成分布下的相对输出误差](/img/research/20261009/quantization.svg)

只量化 K 时，K 通道离群条件下的误差分别是 13.9658%、7.9645%、1.7653%；这支持“按通道隔离大幅值”的局部解释。只量化 V 时，V 行离群条件下全张量误差 8.9198%，逐 Token 与混合都是 0.5427%，因为两者对 V 做的是同一件事。

但干净输入和 V 行离群条件下，混合方案都没有超过全部逐 Token。这里没有足够证据说它“更通用”。也不要未经分解就把全部输出误差归因于 Softmax；保存的 K-only/V-only 对照正是用来限制这种过度解释。

## scale 也需要占空间

下面统计 K/V 同时量化后的数值 payload，含 float32 scale，排除对象头、分配器与工作区。

| N | float32 K/V | 全张量 int8 | 全部逐 Token | K 通道 / V Token |
| --- | ---: | ---: | ---: | ---: |
| 64 | 16,384 B | 4,104 B | 4,608 B | 4,480 B |
| 256 | 65,536 B | 16,392 B | 18,432 B | 17,536 B |

混合方案的公式为 `2ND + 4D + 4N` 字节。N=256 时减少 73.24% 的缓存数组字节；不是严格减少 75%。`arrays.npz` 为便于审计重复保存若干数组，它的压缩文件大小也不等于真实推理缓存大小。

本例把 int8 解量化为 float64 再做矩阵乘法，因此只证明存储表示和局部误差，**没有证明实际显存降低或生成更快**。如果把这个 Python 路径直接放进解码循环，解量化和临时分配甚至可能抵消收益；本轮没有计时，不能替它编一个加速比。

## 从干净目录复现

```sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 009289d3c9314d64a495303d9b16517080282788
python -m venv .venv
# Windows: .venv/Scripts/activate；Linux/macOS: source .venv/bin/activate
python -m pip install -r experiments/11-kv-quantization-axes/requirements.txt
python -m unittest discover -s experiments/11-kv-quantization-axes -p "test_*.py"
python experiments/11-kv-quantization-axes/run.py --out experiments/11-kv-quantization-axes/target/my-run
python experiments/11-kv-quantization-axes/audit.py experiments/11-kv-quantization-axes/target/my-run
```

本机 Python 3.12.14 / NumPy 2.2.6 / Windows 已验证，其他平台未复测。预期 4 个单测通过，保存 162 个对照，独立审计输出 `PASS: 162 archived comparisons...`。审计不用实现中的 attention 函数，而从归档整数码和 scale 解量化，再用另一种 NumPy 表达重算输出、误差和字节数。

若 scale 形状不对，检查归约轴：逐 Token 应为 `(N,1)`，逐通道为 `(1,D)`。全零组将 scale 设为 1，不能除以零；输入 NaN/Inf 会被拒绝。若修改源码后旧证据哈希不匹配，应运行新输出目录，不要修改 manifest 来掩盖差异。

小练习：让 V 改为“列离群”，预测逐 Token 还能否隔离误差；然后为这组新条件另存协议与结果。需要进入真实模型之前，应先测真实 K/V 分布、分组粒度、任务质量、反量化代价与实际内存。这些仍是后续验证，不由本轮随机数组代替。
