---
title: "MuJoCo 速度估计：滤掉噪声，也可能让控制更差"
description: "54回合真实仿真对照位置差分、指数平滑与真值速度参考，解释噪声放大、估计滞后和稳定性验收。"
slug: "/embodied-ai/mujoco-velocity-estimation"
status: "published"
published_at: "2026-10-09"
updated: "2026-10-09"
reading_minutes: 11
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-delayed-feedback", "doc:embodied-ai/mujoco-planar-pd"]
related: ["lab:mujoco-velocity-estimation", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-qualified-completion"]
---

[固定代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1931effc42f9d5974f20c09614dc2ebbdfcbf44b/experiments/planar_velocity_estimation) · [54 条压缩原始轨迹](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1931effc42f9d5974f20c09614dc2ebbdfcbf44b/evidence/planar-velocity-20261009) · [实验档案](/labs/mujoco-velocity-estimation)

上一篇的预测器拿到了采样时刻的真值速度，这是偏乐观的条件。很多传感器只给位置：拿相邻位置相减，不就能得到速度了吗？公式成立，但噪声也被相减，并除以很短的时间间隔。把这个速度直接放进阻尼项，控制力可能抖得比位置更厉害。

这次沿用二维力控执行器，比较位置差分、平滑差分与真值速度参考。它是 **MuJoCo 实际仿真**，没有机械臂、视觉、ROS2 或真实硬件。所有方法使用相同延迟位置、控制增益和限幅，不额外做位置外推。

## 从 3 毫米噪声到速度误差

传感器每 20ms 采样一次：

```text
测得位置 = 真实位置 + 位置噪声
差分速度 = (本次测得位置 - 上次测得位置) / 0.02s
```

若两次独立位置噪声的标准差都是 σ，则单轴差分噪声的标准差为 `√2 × σ / Δt`。σ=3mm、Δt=20ms 时约为 **0.212m/s**。这只是噪声传播推导，实际估计误差还含离散差分对运动的近似误差，不能直接当作测量结果。

控制律是 `力 = 80 × 位置误差 - 18 × 估计速度`，每轴限幅 ±5N。单轴 0.212m/s 的速度噪声对应约 3.82N 的阻尼扰动，已经与限幅同量级。这解释了为什么“位置看起来只差几毫米”，控制却可能反复触顶。

## 平滑改变了什么

平滑方案先计算差分，再做指数移动平均（EMA）：

```text
α = 1 - exp(-Δt / τ)，τ 固定为 60ms
平滑速度 = (1 - α) × 上次平滑速度 + α × 本次差分速度
```

这里 Δt 使用**两次采样时间戳之差**，不是两次收到数据的墙钟间隔。首个样本速度设为 0；重复或倒序时间戳被拒绝。平滑减少高频变化，但它也会延后速度响应，尤其在加减速时，阻尼力不再及时反映当前运动。

整个闭环可以按这条路径阅读：

```text
物理状态 → 位置加噪 → 带采样时间的延迟队列
→ 取已到达样本 → 速度估计 → PD 与力限幅
→ MuJoCo 物理推进 → 保存轨迹与验收
```

只有 `oracle` 对照读取采样时刻的真值速度；差分和 EMA 不偷看 `qvel`。真实速度只另存到轨迹用于离线评价。全部控制决策只能使用已到达的样本，审计会检查观测年龄。

## 固定协议，而不是看到失败后重新调参

2 种延迟（0/80ms）× 3 种位置噪声（0/3/10mm）× 3 种估计器 × 3 个种子，共 54 回合。每回合 4 秒、物理步长 2ms、控制周期 20ms，得到 108,000 行轨迹。无障碍、质量 1kg，目标位置为 `(0.6,0)`。

验收沿用上一轮：**最后 300ms 的每个物理步**，位置距离都小于 15mm、速度范数都小于 0.04m/s。终点碰巧到达不算通过，最后一次误差较小也不能替代整段稳定性。

以下各格为三种子的“通过回合数 / 3”：

| 延迟 | 位置噪声 σ | 真值速度参考 | 位置差分 | 平滑差分 |
| --- | ---: | ---: | ---: | ---: |
| 0ms | 0mm | 3/3 | 3/3 | 3/3 |
| 0ms | 3mm | 3/3 | 0/3 | 0/3 |
| 0ms | 10mm | 1/3 | 0/3 | 0/3 |
| 80ms | 0mm | 0/3 | 0/3 | 0/3 |
| 80ms | 3mm | 0/3 | 0/3 | 0/3 |
| 80ms | 10mm | 0/3 | 0/3 | 0/3 |

合计 13 个回合通过。样本很小且场景固定，这不是机器人泛化成功率。

## 两个不能只看一半的结果

**平滑确实降低了部分估计噪声。** 无延迟、10mm 噪声下，三种子平均速度估计 RMSE 从差分的 0.9553m/s 降到 EMA 的 0.2471m/s；最后 300ms 的位置 RMS 也从 21.89mm 降到 10.01mm。可是两组仍都是 0/3：位置 RMS 达标不代表每个时刻的位置和速度同时达标。

**平滑也可能把延迟问题放大。** 80ms 延迟、无噪声时，差分的尾段位置 RMS 为 30.32mm，EMA 为 93.66mm；3mm 噪声时分别为 26.00mm 与 123.31mm。平滑不是免费的降噪，它引入动态滞后，与已有延迟叠加。协议没有扫描 τ 或重新调增益，所以只能报告当前参数组合的退化，不能断言所有滤波器都会失败。

![不同延迟与噪声下，差分和平滑差分的尾段位置均方根误差](/img/research/20261009/velocity.svg)

速度 RMSE 的参照是**采样时刻**的真值速度，oracle 在这一指标上天然为零；它仍可能使用 80ms 前的速度，不能据此说当前速度准确。无噪声、无延迟的差分也并非严格零误差，因为位移差分是时间段平均速度，不等于端点瞬时速度。

## 如何复现和定位失败

以下为 Windows PowerShell，明确指定虚拟环境解释器，不依赖激活脚本。

```powershell
git clone https://github.com/VirtualSelect/hohoo-embodied-agent.git hohoo-embodied-agent-study
cd hohoo-embodied-agent-study
git checkout 1931effc42f9d5974f20c09614dc2ebbdfcbf44b
python -m venv .venv
$py = '.\.venv\Scripts\python.exe'
& $py -m pip install -r requirements-lock.txt
& $py -m unittest discover -s experiments/planar_velocity_estimation -p "test_*.py"
& $py experiments/planar_velocity_estimation/run.py --out outputs/velocity-my-run
& $py experiments/planar_velocity_estimation/audit.py outputs/velocity-my-run
```

本机验证环境：Windows、Python 3.12.14、MuJoCo 3.3.7、NumPy 2.2.6；其他操作系统未复测。运行不打开渲染窗口，不需 GPU、模型密钥或付费服务。预期 4 个估计器测试通过，打印 54 回合、108000 行、13 个通过；审计再验证每条轨迹的哈希、时间、控制力和验收结果。

`csv.gz` 是无损压缩，可用 Python `gzip.open(..., 'rt')` 阅读。复现输出请用独立目录，避免覆盖归档证据。若结果不同，先检查锁定依赖与固定提交，再看 `capture_t`、`estimated_vx/vy`、`raw_fx/fy` 与 `saturated`；不要先放宽验收阈值。如果力量长期触顶，查看速度估计是否被放大；如果曲线平滑但目标附近摆动，查看样本年龄和估计滞后。

小练习：给三个连续样本手算一次差分与 EMA，观察突然减速时 EMA 为何仍保留旧速度。若要继续实验，应分别扫描采样率、τ 和控制增益，并保留全部条件。当前结果没有完成完整 VL01，也没有证明真机安全；下一步是解释并验证闭环取舍，而不是仅把算法名换成更复杂的滤波器。
