---
title: "KV分块反量化：工作区小了，为什么更慢？"
description: "区分缓存负载、工作数组和实测耗时，保留分块CPU实现更慢的810条计时记录。"
slug: "/llm/kv-block-decode-cost"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
prerequisites: ["doc:llm/kv-residual-window"]
related: ["lab:packed-kv", "project:hohoo-ai-lab"]
---

[固定代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv) · [原始证据](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv/evidence) · [实验档案](/labs/packed-kv)

压缩缓存后，最简单的计算方式是先把整个K/V解码回浮点，再做注意力。这会重新分配大块临时数组。按块解码看上去更节省空间，但它是否也更快？本篇把**数值一致、工作区尺寸和实测耗时**分开验证。

结果先说清楚：固定协议中，分块输出与同一量化缓存的全量解码结果一致；指定解码数组变小，但本机NumPy路径更慢。这里没有GPU内核，也没有完整模型推理。

## 不能逐块Softmax后直接平均

每块有不同的最大分数和归一化常数。直接对各块做Softmax，再平均各块输出，会改变全局权重。需要持续维护三个量：当前最大分数m、指数和z、加权值和u。

```text
m_new = max(m_old, max(block_scores))
a     = exp(m_old - m_new)
z_new = a*z_old + sum(exp(block_scores - m_new))
u_new = a*u_old + exp(block_scores - m_new) @ block_V
output = u / z
```

这个重标定让已经处理的部分与新块处在同一个指数尺度。初始m为负无穷，z/u为零。当前代码每次解码32个Token，合并后释放该次局部引用。

完整算法仍要读取全部KV，复杂度没有因为分块而突然降低。这里借鉴 [FlashAttention](https://arxiv.org/abs/2205.14135) 的分块与在线归一化思想，不复现GPU内存层级、融合内核或论文的加速结果。

## 先对齐比较对象

数值对照使用同一组4-bit、group=32的数据。全量解码和按32 Token分块使用相同分组边界，因此可以比较两种执行方式；它们都不等于未量化原始KV。18份输入的两种输出均通过最大绝对误差小于 `1e-10` 的冻结阈值。

未量化float32缓存作为另一个速度参考。三条路径都使用float64注意力运算，所以表中的“float32缓存”说的是存储，不是全程float32算术。

## 缩小的是哪些数组

N=512、D=32、4个Query时：

| 数组 | 全量解码 | 每次32 Token分块 |
| --- | ---: | ---: |
| 解码后的float32 K/V | 131,072 B | 8,192 B |
| 单个float64 score矩阵 | 16,384 B | 1,024 B |

这只是代码中指定数组的形状乘dtype字节数。代码还会产生float64转换、指数权重、累加器，归档运行也保留参考数组和预打包副本；因此它**不是实测进程RSS、显存峰值或总内存下降比例**。

把“单块小16倍”改写成“程序内存少16倍”，就是越过证据边界。真正要报告峰值，需要在隔离进程中测量包括分配器与临时数组的完整路径。

## 本机计时：更小的块没有带来更快的执行

每份输入预热3轮、正式15轮，轮换三种方法的执行顺序，总共810条正式观测。下表为每种长度、每种方法的135条原始耗时中位数，单位微秒：

| Token数 | float32缓存参考 | 全量解码后计算 | 逐块解码并合并 |
| ---: | ---: | ---: | ---: |
| 128 | 36.9 | 97.5 | 277.5 |
| 512 | 91.1 | 252.3 | 1305.0 |

![本机CPU路径的全部计时分布与中位数](/img/research/20261011/decode-cost.zh-CN.svg)

计时包含反量化、转换、Softmax和乘法，排除预打包、输入生成、磁盘保存和模型投影。本机未绑核，没有多进程隔离或统计显著性检验；重跑会改变具体数字。不能把中位数当作SLA或推广到GPU。

Python循环、重复分配和小矩阵调用都是可能的开销来源，但本轮没有分别剖析它们，不能给每项编一个占比。能确认的结论只有：在这个实现和规模下，分块方案没有取得端到端局部计算加速。

### 用失败结果做下一步决策

若你的瓶颈是缓存表示大小，前两篇的字节账仍有价值；若瓶颈是响应时延，不能仅凭“4-bit”和“分块”就决定上线。下一轮应先测实际模型分布与完整生成路径，再决定是否值得实现融合内核。

小练习：故意删去 `a*u_old` 的重标定，再用有较大分数差异的两块输入比较输出。预期数值检查失败，即使计时变快也不能算优化。若正确实现却明显变慢，先确认计时范围和线程配置相同，保留所有观测，不只截取最快的一次。

## 最小复现与排错

从干净检出目录运行以下PowerShell命令。输出目录必须尚不存在。同组的三篇文章共用一份冻结协议，只需运行一次，再按各篇的证据分组查看。

```powershell
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 0d4009cf840052c3111bbfc40dce900326daa3ae
python -m venv .venv
$py = '.\.venv\Scripts\python.exe'
& $py -m pip install -r experiments/12-packed-kv/requirements.txt
& $py -m unittest discover -s experiments/12-packed-kv -p "test_*.py"
& $py experiments/12-packed-kv/run.py --out experiments/12-packed-kv/target/my-run
& $py experiments/12-packed-kv/audit.py experiments/12-packed-kv/target/my-run
```

本机Windows已验证：Python 3.12.14 + NumPy 2.2.6；4项单测、144组对照、810条原始计时；独立审计预期输出 `PASS`。其他操作系统未复测。若只想核验归档，不重新实验，可将审计参数换为 `experiments/12-packed-kv/evidence`。源码哈希统一LF，证据哈希按原字节；不要改写manifest掩盖差异。

若导入失败，先检查安装与运行是否使用同一个 `$py`。失败输出保留，重跑时换新目录。数值按协议容差复核，耗时是本机观察，不要求复现相同速度。

代码与文章由AI辅助整理，结论以归档且可审计的实际运行记录为限。本轮没有新增付费模型请求，也不代表作者已亲手复现或完成人工审校。
