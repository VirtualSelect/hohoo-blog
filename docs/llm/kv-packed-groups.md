---
title: "KV分组打包：4-bit到底省了多少？"
description: "实际保存半字节整数码，复算分组scale开销、补齐字节与注意力输出误差。"
slug: "/llm/kv-packed-groups"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
prerequisites: ["doc:llm/kv-quantization-axes"]
related: ["lab:packed-kv", "project:hohoo-ai-lab"]
---

[固定代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv) · [原始证据](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv/evidence) · [实验档案](/labs/packed-kv)

上一轮比较了量化轴，保存的仍然是int8。把位宽写成4，就能把缓存再减半吗？如果每个4-bit数仍装在一个 `uint8` 中，答案是否定的。**位宽、实际打包方式、scale开销，必须分别算账。**

本篇实现真正的双nibble打包，并比较8/32元素分组与4/8-bit。所有输入是固定合成数组，不是模型运行中的KV；结论只用于解释量化机制。

## 一个字节里到底装了什么

4-bit对称量化使用整数区间 `[-7,7]`，每组的scale为 `max(abs(x))/7`。为了方便位操作，保存前加7，映射到 `[0,14]`，15保留不用。两个码合成一个字节：

```python
packed = codes[0::2] | (codes[1::2] << 4)
low = packed & 15
high = packed >> 4
```

解码必须保留原始形状，去掉分组补齐，再乘对应scale。例如码2和13打包成十六进制 `D2`；恢复后减7得到-5和6。这里不是补码int4，也没有学习得到的codebook，不要混用其他格式的解码器。

8-bit对照同样使用对称范围 `[-127,127]`，保存为加127后的无符号字节。两种格式都保留float32 scale和两维int32形状，大小账包含这些数组。

## 为什么分组要同时看方向与长度

K的布局为 `N×D`。沿每个通道把相邻Token切成8或32个元素的组；V则在每个Token内部把特征维切成8或32个元素的组。保持上一轮K/V不同粒度的思路，同时限制每个scale覆盖范围。

```text
K：固定通道 → Token 0..7 | 8..15 | ...
V：固定Token → 特征 0..7 | 8..15 | ...
```

更小的组通常能减弱组内幅值差异，但需要更多scale。它不是免费的精度改进。分组不足时补零，解码再裁剪；测试另用35×13矩阵检查非整除边界，而正式对照使用128/512 Token、32维、4个Query。

## 同一输入上的精度与空间交换

三种子×两长度×三分布，共18份输入；每份比较两组长×两位宽，得到72个对照。除干净随机输入外，还有把注意力偏向最早或最近16个Token的受控分布，供后续残差研究复用。

下面只看干净输入的六份对照，先对每份计算输出相对L2误差，再取平均：

| 组长 | 位宽 | 相对输出误差 | N=128的KV数组payload |
| ---: | ---: | ---: | ---: |
| 8 | 4 | 9.797% | 8,208 B |
| 32 | 4 | 13.450% | 5,136 B |
| 8 | 8 | 0.589% | 12,304 B |
| 32 | 8 | 0.743% | 9,232 B |

![打包KV的数组大小与合成输入输出误差](/img/research/20261011/packed-groups.zh-CN.svg)

未量化float32的K/V为32,768字节。组长32的4-bit整数码只占4,096字节，但加scale和形状后是5,136字节，减少约84.3%，不能宣称严格减少87.5%。组长8用更多空间，换来这组输入上更低的误差。

这个结果也提醒我们：从0.743%到13.450%不是“几乎无损”。任务能否容忍这类局部输出变化，需要真实模型质量测量；本轮没有任务准确率、困惑度或生成结果。

## 如何知道文件里真的存了4-bit

`arrays.npz` 保存原始Q/K/V、参考输出、打包字节、scale、形状和量化输出。独立审计逐nibble解码，再用不同的注意力表达式重算误差与字节数，没有调用实现里的 `decode`。

压缩NPZ大小不是缓存大小：归档为了审计重复保存多个方案，ZIP压缩还依赖数值分布。表里的payload只计算实现中的数组，不含Python字典、allocator、临时反量化数组或模型其他层。

### 小练习与常见错误

手算 `D2` 的两个码，再用 `&15` 和 `>>4` 验证。改变输入为全零时，scale用1兜底，解码应仍然全零，不能出现除零。若非整除尺寸多出一行，检查裁剪发生在恢复原始轴之前还是之后。若4-bit文件与8-bit一样大，检查是不是仅限制了数值范围却没有打包。

粒度与残差问题可参照 [KIVI](https://arxiv.org/abs/2402.02750)。本实验的对称4/8-bit、合成输入和NumPy执行并非该论文的非对称2-bit系统复现。下一篇保留相同打包格式，研究把有限高精度空间留给“最近Token”是否总值得。

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
