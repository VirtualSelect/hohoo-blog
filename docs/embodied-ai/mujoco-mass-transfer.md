---
title: "MuJoCo质量迁移：同一套增益还能用吗？"
description: "36回合对照固定和质量缩放增益，解释更低平均误差为何仍不能通过速度验收。"
slug: "/embodied-ai/mujoco-mass-transfer"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-stale-force"]
related: ["lab:planar-reliability", "project:hohoo-embodied-agent"]
---

[固定代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/experiments/planar_reliability) · [原始证据](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/evidence/planar-reliability-20261011) · [实验档案](/labs/planar-reliability)

一组参数在1kg执行器上表现较好，换成0.5kg或2kg，还能直接复用吗？对于理想点质量，按质量同比放大kp和kd似乎可以保持相同加速度响应。但执行器有±5N上限，观测有延迟与噪声，理想推导并不是全部系统。

本篇比较固定增益与按**已知质量**缩放增益。它是MuJoCo参数迁移对照，不是在线质量辨识，也不是机械臂迁移学习。

## 先看成立条件，再写缩放公式

没有接触、重力和阻尼时，单轴满足：

```text
m*x'' = F
F = kp*(目标-x) - kd*x'

若 kp=m*kp0，kd=m*kd0，且从不限幅：
x'' = kp0*(目标-x) - kd0*x'
```

质量可以在这个理想方程里约掉。但实际实现是先计算力，再限幅到±5N；更重的执行器更容易需要超出上限的力，实际加速度上限为 `5/m`。相同公式因此不保证相同轨迹。

估计速度还受到位置噪声和延迟影响。按质量缩放后，噪声转成的力也同比变化；理想无延迟二阶系统的直觉需要重新检查，而不是直接当成仿真结论。

## 固定条件与真正改变的量

使用前篇开发集选出的kp=20、kd=8、tau=20ms，不在迁移结果上重新挑参数。质量0.5/1/2kg，目标0.6/1.0m，两种控制方式，三个留出种子，共36回合。观测延迟80ms、位置噪声3mm、每轴力上限5N保持不变。

模型同时修改 `body_mass` 和 `body_inertia`，调用 `mj_setConst` 更新派生常量；不是只改一个展示标签。相关接口可核对 [MuJoCo官方参考](https://mujoco.readthedocs.io/en/3.3.7/APIreference/APIfunctions.html)。原始轨迹记录真实位置、速度与施加力，独立审计再次验证 `Δv=F*Δt/m`。

## 位置误差变小，不等于完整验收通过

每格合并两个目标、三个种子，共六回合。位置列为各回合尾段RMS的均值：

| 质量 | 固定增益位置误差 | 缩放增益位置误差 | 固定增益通过数 | 缩放增益通过数 |
| ---: | ---: | ---: | ---: | ---: |
| 0.5kg | 73.96mm | 2.51mm | 0/6 | 0/6 |
| 1kg | 2.50mm | 2.50mm | 0/6 | 0/6 |
| 2kg | 1.45mm | 2.52mm | **6/6** | 0/6 |

![质量变化下两种增益规则的位置误差与验收](/img/research/20261011/mass-transfer.zh-CN.svg)

1kg时两种规则本来就是同一个控制器，结果相同是一项必要对照。0.5kg时缩放显著改善位置误差，却仍未满足速度条件。2kg时固定增益在这组条件下通过六回合，而缩放方案未通过。把所有质量合在一起，缩放方案的平均位置误差更低，但完整契约反而是0/18对6/18。

这不是说“更重一定更稳”，也不是宣告质量缩放错误。只能说当前带噪、延迟、限幅的闭环，不能只用理想加速度等式和平均位置误差来选赢家。

## 怎样避免给反例编原因

可以提出假设：质量变化与固定增益改变了闭环响应；缩放改变了噪声到控制力的通路；限幅影响了瞬态。它们都合理，但本轮没有分别固定其他因素做消融，因此不能确定各自贡献。

证据能够直接支持的事实是每个回合的尾段误差、最大速度、限幅步数和通过标记。要解释六个通过回合为什么通过，应先画力与速度轨迹，再设计单因素比较，而不是根据一个均值补写结论。

### 复现后可以做的练习

从两种1kg规则中选同目标、同种子的记录，逐行比较轨迹；应当一致。再找0.5kg缩放策略里位置RMS低于15mm的回合，检查尾段峰值速度为什么仍导致失败。

如果要把力上限改为随质量增加，请另建协议与结果目录。这同时改变了执行器能力，不能把新结果混进当前36回合声称“只改控制器”。如果要推广到机械臂，也必须加入关节惯量、耦合、重力和接触；二维点质量不能替它证明安全性。

三篇到这里形成一个可用的学习顺序：先用开发/留出拆开调参，再检查失联动作的物理含义，最后检验参数变化下的边界。完整VL01、M4/M5与真实硬件工作仍未完成。

## 最小复现与排错

从干净检出目录运行以下PowerShell命令。输出目录必须尚不存在。同组的三篇文章共用一份冻结协议，只需运行一次，再按各篇的证据分组查看。

```powershell
git clone https://github.com/VirtualSelect/hohoo-embodied-agent.git hohoo-embodied-agent-study
cd hohoo-embodied-agent-study
git checkout 1d1faab57e20b352761e9abc736c6d277b505e6b
python -m venv .venv
$py = '.\.venv\Scripts\python.exe'
& $py -m pip install -r requirements-lock.txt
& $py -m unittest discover -s experiments/planar_reliability -p "test_*.py"
& $py experiments/planar_reliability/run.py --out outputs/reliability-my-run
& $py experiments/planar_reliability/audit.py outputs/reliability-my-run
```

本机Windows已验证：Python 3.12.14 + MuJoCo 3.3.7 + NumPy 2.2.6；3项单测、153回合、306000行；独立审计预期输出 `PASS`。其他操作系统未复测。若只想核验归档，不重新实验，可将审计参数换为 `evidence/planar-reliability-20261011`。源码哈希统一LF，证据哈希按原字节；不要改写manifest掩盖差异。

若导入失败，先检查安装与运行是否使用同一个 `$py`。失败输出保留，重跑时换新目录。数值按协议容差复核，耗时是本机观察，不要求复现相同速度。

代码与文章由AI辅助整理，结论以归档且可审计的实际运行记录为限。本轮没有新增付费模型请求，也不代表作者已亲手复现或完成人工审校。
