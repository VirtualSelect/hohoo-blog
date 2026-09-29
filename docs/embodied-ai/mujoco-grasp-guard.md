---
title: 具身实践（二）：没抓住，就别继续搬运
description: 在 MuJoCo 中加入抬升与双侧接触确认，用18回合对照检验停止空手搬运，并公开轨迹、视频、代码与局限。
slug: /embodied-ai/mujoco-grasp-guard
status: published
published_at: "2026-09-29"
updated: "2026-09-29"
reading_minutes: 12
domain: embodied-ai
article_kind: case-study
difficulty: intermediate
provenance: experiment-result
related:
  [
    "doc:embodied-ai/mujoco-first-pick-place",
    "project:hohoo-embodied-agent",
    "lab:grasp-guard",
  ]
---

[上一篇](/docs/embodied-ai/mujoco-first-pick-place)里，夹爪偏了 25 mm，没有抓起方块，却照着时间表跑完搬运、下降和松手。程序没有报错，任务也没有完成。

这次不调整摩擦系数、不换机器人、不训练策略，只问：**在进入搬运阶段之前，能否根据已经观察到的状态，取消一次没有意义的后续动作？**

结果是：18 个仿真回合中，加入检查后，两个偏移条件的六次失败都停止了搬运；无偏移条件三次仍完成放置，完整轨迹与原方案一致。抓取失败并没有变成成功，改善的是失败后的行为。

[代码与运行方法](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/eb186ee4927da99d4ba48e334fabf9442c929507/experiments/vl01_grasp_guard) · [18 回合原始记录](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/eb186ee4927da99d4ba48e334fabf9442c929507/evidence/grasp-guard-20260929) · [实验档案](/labs/grasp-guard)

## 1. 到了下一步的时间，不等于具备下一步的条件

原来的高层控制只有一个时间表：

```text
接近 → 下降 → 合拢 → 抬升 → 搬运 → 放低 → 松手 → 退开
```

抬升结束后，程序默认“方块应该已经在手上”。真实仿真状态却可能是：夹爪在空中，方块还在桌上。

这里要区分两层控制。MuJoCo 的位置执行器本身使用位置反馈；我们所说的“按时间开环执行”，指的是**高层任务阶段不根据抓取结果改变流程**，不是整个物理控制器没有反馈。

新程序只修改这条阶段边：

```text
抬升结束
    ↓
抓取确认
    ├─ 通过：继续原来的搬运、放置
    └─ 拒绝：保持执行器目标0.6秒，结束本回合
```

保持目标不是把物体固定住，也不是给真实机器人下急停命令。代码仍只设置执行器目标并执行物理步进，没有修改方块位姿或添加吸附约束。

## 2. 怎样才算“确认抓住了”？

本轮在仿真时间 4.0 秒，也就是抬升结束时，读取最近 0.2 秒的采样记录。门控规则预先写进 protocol.json：

| 检查             | 本轮阈值                                            | 要排除的情况                 |
| ---------------- | --------------------------------------------------- | ---------------------------- |
| 时间窗口完整     | 至少10条；跨度至少0.18秒；相邻间隔不超过0.0200001秒 | 只有一次幸运采样，或记录中断 |
| 最后一条够新     | 距判断时刻不超过0.025秒                             | 用过期状态决定下一步         |
| 方块确实离开桌面 | 每条方块中心 z 都大于0.1 m                          | 夹爪升高，方块没动           |
| 两侧持续接触     | 每条均包含 left_pad 与 right_pad                    | 单侧碰撞或短暂擦过           |
| 数值有效         | 高度必须有限，非 NaN/Infinity                       | 无效数值绕过阈值             |

0.1 m 是这个桌面场景的绝对世界坐标阈值，不是“比任意桌面高 10 cm”。换场景、物体或夹爪后，需要重新制定。

我们记录的接触是 MuJoCo 检测到的接触对，**不是接触力足够大的证明**。当前规则比只看高度更有约束，但不构成一般意义上的稳定抓持判据。

与实现一致的核心判断如下，完整代码还检查时间和非有限数值：

```python
window = [r for r in rows if now - 0.2 - 1e-9 <= r["time"] <= now]
high = all(r["cube_z"] > 0.1 for r in window)
both = all(
    {"left_pad", "right_pad"} <= set(r["contacts"].split("|"))
    for r in window
)
accepted = complete_window and finite_height and high and both
```

时间比较中的微小容差用于浮点累积误差，不是放松高度条件。空窗口必须拒绝：Python 的 all([]) 会返回 True，单独使用它会留下危险的逻辑漏洞。

## 3. 为什么用一段记录，而不是最后一帧？

“刚碰到”与“夹着抬起”可以在某一帧拥有相似的接触状态。要求连续窗口通过，可以排除这个固定场景中一些瞬时接触情况。

但窗口也有代价：判断会滞后，采样之间发生的短暂脱离可能看不见；规则更严格，也可能拒绝原本能完成的抓取。因此这里没有把 0.2 秒写成通用最佳参数。

物理仿真每 0.002 秒步进一次，即 500 Hz；每10步保存一次状态，即 50 Hz。本次门控用的是这份50 Hz记录，不是对每个物理步都判断。实际窗口包含3.802至3.982秒的10条样本；跨度0.18秒，最新样本距4.0秒约0.018秒。

步进后调用 mj_forward，使派生的位置与接触数据与保存的状态对齐。其作用和 mj_step 的差异可查阅 [MuJoCo 3.3.7 API 文档](https://mujoco.readthedocs.io/en/3.3.7/APIreference/APIfunctions.html#mj-forward)。

## 4. 对照必须保证前面的抓取没有偷偷变化

使用原来的场景、控制目标、放置成功判据和三个横向偏移：

- baseline：计算并记录同一个门控结果，但仍继续搬运。
- guarded：应用门控，拒绝后保持目标0.6秒并结束。
- 0 / 25 / 50 mm × 两种控制方式 × 三次重复，共18回合。

没有随机化。每组的三次是确定性重复，用于检查复现，不是三个不同环境的成功率样本。

独立审计脚本没有导入控制器的 evaluate 函数。它从 CSV 重新判断，并核对：

1. 九对回合在4秒以前的所有记录完全相同。
2. 新跑的九条 baseline CSV 与上一篇保存的对应轨迹逐字节相同。
3. 三对无偏移成功回合的**完整轨迹**相同。
4. 被拒绝的回合没有 transfer 阶段，保持期间横向目标没有继续前移。

这样才能把结果归因于“是否应用检查”，而不是无意间改了抓取动作。

## 5. 观察：停止了空手搬运，但没有修好抓取

| 拾取偏移 | baseline 放置完成 | guarded 放置完成 | guarded 取消搬运 | baseline 判定后水平路程 |
| -------- | ----------------: | ---------------: | ---------------: | ----------------------: |
| 0 mm     |               3/3 |              3/3 |              0/3 |              268.330 mm |
| 25 mm    |               0/3 |              0/3 |              3/3 |              246.221 mm |
| 50 mm    |               0/3 |              0/3 |              3/3 |              224.722 mm |

“判定后水平路程”是从4秒开始，对相邻记录中夹爪 XY 位移长度求和。偏移失败的 guarded 回合约为10⁻⁸ mm，接近数值残余；不能把它写成真实硬件的定位精度。

失败组4.6秒结束；baseline 9.2秒结束。这个差值包含取消后续流程的时间，**不是推理加速或真实机器人节能测量**。

![25毫米偏移的两种控制：方块都没抬起，但只有baseline继续水平搬运](/media/practice/grasp-guard-comparison.png)

上图由25 mm条件第一个配对回合的 CSV 生成。上半图是方块中心高度，下半图是夹爪相对判断时刻位置的水平距离；虚线为4秒。图中的距离与表里的累计路程定义不同，本轨迹接近直线，所以数值接近。

## 6. 直接看同一次失败的两种后续动作

**原流程：** 方块留在原地，空夹爪继续去蓝盒。

<video controls preload="none" playsinline src="/media/practice/grasp-guard-baseline.mp4" poster="/media/practice/grasp-guard-lift.png" width="960" height="640" aria-label="25毫米偏移baseline：空夹爪继续搬运">无法播放时，请打开原始证据目录中的视频。</video>

**加入检查：** 抬升结束未通过，夹爪保持当前位置，回合结束。

<video controls preload="none" playsinline src="/media/practice/grasp-guard-stopped.mp4" poster="/media/practice/grasp-guard-stop.png" width="960" height="640" aria-label="25毫米偏移guarded：拒绝搬运并保持位置">无法播放时，请打开原始证据目录中的视频。</video>

两段都是实际执行录制，25 FPS，没有插入模拟成功画面。[对应证据目录](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/eb186ee4927da99d4ba48e334fabf9442c929507/evidence/grasp-guard-20260929)还保存了其余条件的状态、截图和视频。

## 7. 复现与定位失败

沿用第一篇的 Python 3.12 / MuJoCo 3.3.7 环境。在独立工程根目录运行：

```powershell
.venv/Scripts/python.exe -m unittest discover -s experiments/vl01_grasp_guard -p "test_*.py"
.venv/Scripts/python.exe experiments/vl01_grasp_guard/run.py --out evidence/my-guard-run --render
.venv/Scripts/python.exe experiments/vl01_grasp_guard/audit.py evidence/my-guard-run
```

输出目录必须不存在。代码提交、源码 hash、MuJoCo/NumPy/Python版本记录在 manifest.json；每个回合包含trajectory.csv、states.jsonl、events.json、summary.json。8项单元测试覆盖单侧接触、临界高度、旧记录、空窗口、乱序、重复时间、瞬时接触、未来记录及非有限高度等边界。

检查失败时，先看 summary 中 gate.reasons，再对照 window_start/window_end、min_cube_z_m 和 both_pad_samples；不要只看 success 一个布尔值。

保存状态也能重放：

```powershell
.venv/Scripts/python.exe experiments/vl01_grasp_guard/replay.py evidence/grasp-guard-20260929/guarded-025mm-run-1/states.jsonl --out outputs/guard-replay.mp4
```

重放使用已保存的 qpos/qvel/ctrl，不是重新执行策略，不能算额外一次成功实验。

## 8. 这离真正的闭环机器人还有多远？

当前检查直接读取模拟器的方块位姿和接触对，是**特权状态观测**。真实机器人可能需要视觉估计、夹爪宽度、电流或力传感器；它们有噪声、延迟和缺失，不能照搬这里的数值。

还有三个明确缺口：

- 一次确认只发生在搬运前。通过之后若方块滑落，当前程序仍不会中途停止。
- 拒绝后没有重新抓取，也没有恢复规划；失败仍是失败。
- 固定场景的两种偏移远不足以估计误报、漏报或鲁棒性。

本轮建立的是一个可核对的任务前置条件：**下一步需要什么事实，就在执行前检查什么事实。** 下一项值得验证的是搬运中的滑落与持续监测；先加入可重复的扰动，再讨论恢复策略。
