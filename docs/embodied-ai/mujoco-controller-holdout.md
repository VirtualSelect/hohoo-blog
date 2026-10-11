---
title: "MuJoCo控制调参：最优候选不等于验证通过"
description: "54个开发回合选择参数，36个留出回合复核位置误差与稳定完成契约。"
slug: "/embodied-ai/mujoco-controller-holdout"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-velocity-estimation"]
related: ["lab:planar-reliability", "project:hohoo-embodied-agent"]
---

[固定代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/experiments/planar_reliability) · [原始证据](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/evidence/planar-reliability-20261011) · [实验档案](/labs/planar-reliability)

上一轮发现EMA能降低位置差分的噪声，却可能放大延迟闭环的摆动。直接宣布“滤波不好”并不充分：滤波器改变了动态响应，而控制增益还沿用旧值。本篇把滤波时间常数和PD增益一起扫描，再用没有参与选择的种子和条件检查结果。

这是二维力控执行器的 **MuJoCo实际仿真**。没有机械臂、相机、ROS2或真机。位置观测参与控制，速度真值只用于离线验收。

## 为什么不能只找一条漂亮曲线

控制律仍是 `F = kp*(目标-观测位置) - kd*估计速度`，每轴限制在±5N。降低kp可能减小过冲，但也可能变慢；改变kd会改变阻尼，也会改变估计噪声转成力的幅度；增大EMA时间常数能平滑，却引入更多滞后。

如果看完所有结果后挑一组成功轨迹展示，读者不知道这个参数是不是只对那一条噪声有效。因此协议先冻结选择规则：只按开发集最后300ms的位置RMS均值选最小者，平分时按kp/kd/tau顺序。**选择指标与最终成功条件是两件事。**

```text
18组参数 × 3个开发种子 → 固定选择规则 → 选中一组
                                       ↓
                     3个新种子 × 6种条件，与旧基线比较
```

## 开发集上选中了什么

kp取20/40/80，kd取8/18，tau取20/60/120ms，共18组。开发条件固定80ms观测延迟、3mm位置噪声，种子7/19/41，每回合4秒；物理步长2ms、控制周期20ms。

选中结果为 **kp=20、kd=8、tau=20ms**。原基线是80、18、60ms。这里是降低增益、缩短平滑的组合结果，不能把全部改善单独归功于某一个参数。

更值得保留的是：**54个开发回合没有一个通过完整尾段契约**。选择规则仍能挑出位置RMS更低的候选，但“最佳候选”并不等于“已经成功”。我们没有因此调整验收阈值。

## 留出检查确实更好，却仍有边界

留出种子为73/97/131；条件扩展为0/80ms延迟与0/3/10mm噪声。每组参数18回合，两组共36回合。

| 参数来源 | 留出回合通过数 | 尾段位置RMS的跨回合均值 |
| --- | ---: | ---: |
| 上轮固定基线 | 3/18 | 54.70mm |
| 本轮开发集选中参数 | 7/18 | 3.61mm |

![开发参数扫描与留出条件中的位置误差](/img/research/20261011/controller-holdout.zh-CN.svg)

这是同一目标族、少量固定种子的对照，不是机器人泛化成功率。即使均值降至3.61mm，也仍有11个回合不满足完整条件。验收要求最后300ms每一个物理步同时满足距离<15mm和速度<0.04m/s，不能用平均位置误差代替。

控制没有偷看真值速度，EMA使用观测的捕获时间差；延迟队列只有已到达的样本能更新控制。独立审计从CSV重新计算估计速度、控制力和验收，并在这个无接触、无阻尼场景下验证 `Δv=F*Δt/m`。

## 这次比较支持什么解释

结果支持“旧控制器与滤波/延迟组合需要重新匹配”，不支持“kp越小越好”或“20ms适用于任何机器人”。kp/kd/tau是联合变化，本轮没有用单变量消融给它们分配贡献。开发和留出都来自同一个仿真模型，尚未覆盖质量、执行器误差、摩擦和更复杂目标。

后两篇分别改变通信与质量，观察这组参数的边界。不会把新条件再次用于选择后，仍称它们为“未见条件”。

### 一个能自己验证的练习

从 `selection.json` 找出选中参数，再从 `results.json` 只筛选 `section=tuning` 重算18组均值。不得混入holdout结果。接着选一个位置RMS很小却 `success=false` 的回合，检查最后300ms的最大速度；它会教你为什么平均误差和到达后稳定性不是同一个指标。

若结果不同，先确认锁定MuJoCo/NumPy版本、2ms物理步长和20ms采样间隔，再检查分组与种子。不要先放宽阈值。原始 `csv.gz` 为无损压缩，每个物理步都保留，不用平滑后的展示曲线替代验收。

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
