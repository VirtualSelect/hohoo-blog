---
title: "LLM 机制实验（四）：前缀改了，旧 KV Cache 还能继续用吗？"
description: "三种子、六条件，比较错误复用与带键校验的前缀缓存；数值相同也不代表允许跨作用域共享。"
slug: "/llm/prefix-cache-invalidation"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 9
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:prefix-cache", "project:hohoo-ai-lab", "doc:llm/kv-cache-equivalence", "doc:llm/sliding-cache-positions"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/ba75c55c53f6f5e30ac027bbf59f28a8202708d7/experiments/06-prefix-cache) · [原始记录与审计](https://github.com/VirtualSelect/hohoo-ai-lab/tree/ba75c55c53f6f5e30ac027bbf59f28a8202708d7/experiments/06-prefix-cache/evidence/20261003) · [实验档案](/labs/prefix-cache)

上一轮已经验证：在同一组输入、权重、位置与掩码下，增量 KV Cache 可以与完整因果计算保持一致。那么，读者回到聊天界面，把前面一句话改了，再继续提问，原来的缓存还能使用吗？

风险在于缓存不是原文的复制品。它是特定计算条件下形成的中间表示。输入形状没变、缓存长度没变，不意味着这些表示仍然有效。

本篇保留上一轮的未训练教学网络，只增加一个前缀缓存仓库。三个固定种子、六种条件共 18 个案例，对比无条件复用、带键校验复用和新鲜重算。没有调用 Agnes，也没有测语言回答能力。

## 1. 缓存的身份不只是八个 Token

前缀固定为 Token ID 1 到 8，后缀为 9 到 12。网络为两层、单头、维度 16、词表大小 32，使用 float64、正弦绝对位置和 tanh 残差；没有 tokenizer、训练、FFN 或 layer norm。

复用时真正需要保持的条件包括：前缀 Token ID、模型权重、位置规则、窗口策略、实现版本，以及应用允许的作用域。本例用以下结构作为键：

```python
wanted = (
    scope,
    signature(model, window),
    tuple(int(x) for x in prefix),
)
```

`signature` 哈希已有注意力源码、维度、层数、窗口、位置规则标签，以及 embedding 和每层 Q/K/V 权重的形状、类型与内容。后缀不进入前缀键：相同前缀继续不同问题，正是可以复用的场景。

这个小网络可以负担整份权重哈希。生产系统不应在每次请求时重新扫描大模型权重，应采用可信、不可变的模型修订标识，并包含实际影响前缀计算的适配器、位置与缓存配置。本例没有实现那套部署机制。

## 2. 命中、未命中分别做什么

`remember` 从仓库自己的输入计算缓存，调用者不能直接塞入一份任意 K/V。容量固定为两个条目，按插入顺序淘汰；这是 FIFO，不宣称 LRU。

继续生成时先验证 Token 类型，再查键。这个顺序很重要：若先转整数再判断，浮点 ID 可能意外与整数 ID 共享键。

```python
model.inputs(prefix, np.arange(len(prefix)))
model.inputs(suffix, np.arange(len(prefix), len(prefix) + len(suffix)))
match = next((e for e in reversed(self.entries) if e[:3] == wanted), None)
model.reset()
if match:
    out, _ = model.chunk(suffix, cache=match[3], window=window)
    return out, dict(reused=True, projected_rows=model.projected_rows)
out, _ = model.chunk(list(prefix) + list(suffix), window=window)
return out[-len(suffix):], dict(reused=False, projected_rows=model.projected_rows)
```

未命中不是异常，而是重新计算完整输入，再取后缀表示。这个版本要求**整个前缀精确匹配**，不查最长公共前缀，也没有分页缓存、磁盘持久化或跨进程共享。

## 3. 六种条件在运行前固定

三个种子为 7、19、41。每种条件都拿相同条件下的完整因果计算作为参考，而不是拿最初那份结果作为所有案例的“正确答案”。

| 条件 | 相对存入时的变化 | 应否复用 |
| --- | --- | --- |
| same-prefix | 无变化 | 是 |
| edited-prefix | 第三个前缀 ID 改为 20 | 否 |
| different-weights | 首层 WK 的一个元素加 0.5 | 否 |
| different-window | 完整注意力改为窗口 4 | 否 |
| different-scope | reader-a 改为 reader-b | 否 |
| new-suffix | 后缀改为 20 到 23 | 是 |

无条件基线始终复用最初前缀的缓存，但使用当前模型与窗口继续后缀。它模拟一个很容易写出来的错误：认为“已有缓存对象”就足够了。

## 4. 错误复用产生了多大偏差

指标是四个后缀隐藏表示相对参考的最大绝对误差，不是 Token 命中率、文本准确率或任务得分。

<img src="/media/practice/prefix-cache-invalid.png" alt="三个种子下错误复用旧缓存的隐藏表示误差；修改前缀、权重或窗口都出现非零误差，带键校验路径18例测得误差为0" width="1500" height="600" loading="lazy" />

| 旧缓存错误复用条件 | seed 7 | seed 19 | seed 41 |
| --- | ---: | ---: | ---: |
| 修改前缀 | 0.088204 | 0.060447 | 0.058312 |
| 修改权重 | 0.021804 | 0.012761 | 0.009166 |
| 修改窗口 | 0.127578 | 0.069393 | 0.040604 |

带键校验的路径在本机 float64 的 18 个案例中测得误差均为 0，冻结容差为 `1e-12`。其中未命中路径会完整重算，所以这部分一致性是退回正确路径的结果；命中路径才是在复用缓存时与参考比较。不能据此承诺所有模型、精度与硬件都逐位相同。

相同前缀与新后缀两个条件，继续阶段各投影 24 行；未命中条件投影 72 行。计数来自两层各三种 Q/K/V 投影：命中为 `4×2×3`，重算为 `12×2×3`。它排除了事先建立缓存、哈希与查找开销，**不能换算成三倍速度提升**。

## 5. 数值相等却必须拒绝复用的案例

`different-scope` 很容易被忽视。同样的模型与输入，即使无条件使用旧缓存，结果误差也为 0。为什么带键校验仍然不命中？

因为数值正确性与应用允许复用的范围是两个问题。这个例子将 reader-a 与 reader-b 分区，仅用于说明缓存键可以携带策略边界；如果键只验证张量相等，它完全看不到这类限制。

但这里的 `scope` 是调用方传入的普通字符串，没有账号认证或权限绑定。它**不构成已经验证的多租户隔离**。生产系统必须从可信身份上下文派生作用域，而不是相信浏览器提交的名字；Python 对象内部条目也不是安全隔离区。

## 6. 从数组重新核对，而不是相信汇总文字

每个案例保存新鲜参考、无条件复用与带校验复用三个数组，共 54 个。独立审计从这些数组重算 36 个误差，核对 18 次复用决策、投影计数以及源码和数据哈希。

八个单元测试还检查连续两次从同一前缀接不同后缀是否互相污染、编辑前缀/权重/窗口/作用域后是否未命中、浮点 ID 是否被拒绝，以及容量淘汰和作用域输入。这不是对所有缓存策略的穷尽验证。

从 `hohoo-ai-lab` 根目录运行，复用上一轮依赖：

```sh
python -m pip install -r experiments/05-attention-lab/requirements.txt
python -m unittest discover -s experiments/06-prefix-cache -p "test_*.py"
python experiments/06-prefix-cache/run.py --out experiments/06-prefix-cache/evidence/MY-RUN
python experiments/06-prefix-cache/audit.py experiments/06-prefix-cache/evidence/MY-RUN
```

把实验目录换成新名字，保留现有归档。先预测 `new-suffix` 是否命中，再看结果；然后只改变一个前缀 ID，比较计数和误差怎样变化。

## 7. 这次给聊天应用留下的设计要求

编辑历史消息应使受影响前缀失效；升级模型或更改注意力策略应产生新的缓存身份；权限范围变化需要独立处理，不能依靠数值测试代替权限判断。

关于不同缓存实现和使用限制，可以继续查阅 [Transformers 官方 KV Cache 文档](https://huggingface.co/docs/transformers/main/en/kv_cache)。本篇运行的是独立教学网络，没有调用 Transformers 的缓存实现。

下一步值得研究的是最长公共前缀复用及其边界测试，但本轮没有实现，也没有测 GPU、时延或模型回答质量。当前结果回答的是一个更基础的问题：什么条件变化以后，已有中间计算不再有资格继续被使用。
