---
title: "具身智能实践（十三）：下降中断之后，应该从哪一步恢复？"
description: "18 个 MuJoCo 回合与同步回放，将阶段契约接入恢复预算，区分正常下降误停、物理放置和控制器终止。"
slug: "/embodied-ai/mujoco-phase-recovery"
status: "published"
published_at: "2026-10-04"
updated: "2026-10-04"
reading_minutes: 13
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:phase-recovery", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-abort-exit", "doc:embodied-ai/mujoco-phase-contracts", "doc:embodied-ai/mujoco-completion-lifecycle"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/ad2e33523e8e5580da90ae914e1cccf765c8d1b1/experiments/vl01_phase_recovery) · [原始记录与审计](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/ad2e33523e8e5580da90ae914e1cccf765c8d1b1/evidence/phase-recovery-20261004) · [实验档案](/labs/phase-recovery)

上一轮发现，下降阶段即使暂时失去观测，`transfer-only` 门控也不会响应。扩大监控范围似乎很直接：让下降也使用同一套抓取检查。

但搬运要求方块保持一定高度，下降本来就要把它放低。把条件直接复制过去，正常运动会被当成故障。这一轮把阶段契约、恢复窗口和恢复轨迹真正接在一起，检查系统在**什么时候暂停、凭什么恢复、恢复到哪一步**。

## 先看回放：三个控制器遇到同一次间断

视频来自已经保存的 MuJoCo 状态。每画面同一时刻读取同一采样 tick，没有重新运行物理来拼接“更好的结果”。左侧只监控搬运，中间让下降复用搬运规则，右侧使用阶段感知规则。

<video src="/media/practice/phase-recovery-replay.mp4" controls preload="none" width="1440" height="384" poster="/media/practice/phase-recovery-poster.png" aria-label="下降后段观测间断的三策略同步回放">浏览器不支持视频，请查看下方轨迹图与原始状态文件。</video>

这一组观测间断发生在 6.10～6.34 秒。中间控制器在间断发生之前，已经因为正常下降误停；左侧无视间断继续执行；右侧暂停，重新积累证据后继续下降。

## 冻结了哪些条件

沿用同一桌面、双指夹爪、方块与目标盒，物理步长 2ms，每回合 12 秒。没有训练策略，没有接入 ROS2 或真实机器人。

| 条件 | 干预 |
| --- | --- |
| 无故障 | 不注入干预 |
| 搬运间断 | 4.60～4.84 秒不交付观测包 |
| 下降前段间断 | 5.60～5.84 秒不交付观测包 |
| 下降后段间断 | 6.10～6.34 秒不交付观测包 |
| 下降永久间断 | 5.60 秒起不再交付观测包 |
| 下降松爪 | 5.60～5.84 秒强制夹爪张开，观测仍正常 |

每种条件对照三个策略，共 18 回合。干预按绝对仿真时间注入；控制策略一旦改变轨迹，同一个时段不保证遇到完全相同阶段。分析必须查看 `scheduled_phase` 和事件记录，不能只看条件名称。

所有策略保留最多两次恢复、至少 400ms 暂停、800ms 恢复截止时间。终止后统一保持当时目标，不混入上一轮的不同退出动作。

## 哪个条件应该属于哪个阶段

| 策略 | 搬运时检查 | 下降时检查 |
| --- | --- | --- |
| transfer-only | 双指接触、抓取误差、方块高度 | 不检查 |
| reuse-transfer | 同上 | 直接复制搬运规则 |
| phase-aware | 双指接触、误差小于 5cm、方块高于 12cm | 双指接触、误差小于 5cm |

下降去掉高度下限，不意味着下降时什么都不检查。接触、相对位置误差和观测新鲜度仍然有效。是否已经正确放置，使用最后 500ms 的物理记录另行验收，不能用“下降阶段允许低高度”代替完成条件。

<img src="/media/practice/phase-recovery.png" width="1500" height="600" loading="lazy" alt="无故障与下降后段间断轨迹：复用搬运高度规则造成误停，阶段感知恢复继续下降" />

## HOLD 不能覆盖被中断的阶段

执行状态有 `running / hold / aborted`，作业阶段有 `transfer / lower / release`。它们是两套不同维度。

当下降进入 HOLD 时，需要保存 `interrupted_phase=lower`。如果下一轮将这个字段改成 `hold`，控制器就丢失了判断观测和重建轨迹的上下文。

本轮仅在正常执行、作业阶段改变时更新上下文；暂停期间保留原阶段。暂停截止时间也不会因为上层传入了 `release` 或 `hold` 而重新开始。

```python
if self.state == 'running' and phase != self.context:
    self.context = phase
    self.bad_since = None
```

暂停后的恢复证据继续沿用之前的要求：必须是 HOLD 之后采集、时间连续、仍然新鲜的合格观测窗口。只是其中“合格”的定义现在依赖被中断阶段。

## 恢复下降，不应该再升回搬运高度

旧恢复路径总是先回到 18cm 搬运终点，再做下降。现在根据保存的阶段选择路径：

```text
搬运中断：当前测量夹爪位置 → 搬运终点 → 下降 → 松爪 → 后退
下降中断：当前测量夹爪位置 → 下降终点 → 松爪 → 后退
```

第一段统一用 0.5 秒平滑连接。这里是固定目标的简单轨迹拼接，不是避障规划、重抓取或最优控制。起点使用恢复时测量的夹爪位置，避免假设机器人仍处在原计划位置。

## 实测：下降后段的 400ms 暂停

阶段感知策略在后段间断中留下以下事件：

| 事件 | tick | 仿真时间 |
| --- | ---: | ---: |
| 观测变旧，进入 HOLD | 3071 | 6.142s |
| 新的连续合格窗口开始 | 3171 | 6.342s |
| 满足暂停下限，恢复 lower | 3271 | 6.542s |

恢复后从当时夹爪位置直接继续下降，最终方块中心高度约 25.98mm，接触目标盒底，最后 500ms 满足沿用的放置条件。

相比之下，`reuse-transfer` 在 **6.002s** 就因高度下降而进入 HOLD，6.802s 因无法重新满足搬运高度而终止。这发生在 6.10s 注入观测间断之前。因此不能把这个失败归因于断流；无故障组也在同一时刻误停。

## 物理上在盒里，不代表控制流程完成

下面报告的是**物理放置验收**，不是成功率估计。固定场景每格只运行一次，没有随机初始化或统计置信区间。

| 条件 | transfer-only | reuse-transfer | phase-aware |
| --- | --- | --- | --- |
| 无故障 | 满足 | 不满足，误停 | 满足 |
| 搬运间断 | 满足，恢复 1 次 | 不满足，下降误停 | 满足，恢复 1 次 |
| 下降前段间断 | 满足，未监控 | 不满足，恢复后误停 | 满足，恢复 1 次 |
| 下降后段间断 | 满足，未监控 | 不满足，干预前已误停 | 满足，恢复 1 次 |
| 下降永久间断 | 满足，未监控 | 不满足，终止保持 | 不满足，终止保持 |
| 下降松爪 | 满足 | 满足，但已终止 | 满足，但已终止 |

两个地方不能省略说明。

**永久丢失观测时，transfer-only 仍然完成了固定轨迹。** 这证明这个场景的开环轨迹碰巧足够，不证明“忽略观测更安全”。阶段感知策略在 5.642s 暂停、6.442s 终止，方块停留在约 157.81mm，未完成放置。

**松爪故障时，方块刚好在盒子上方落下。** 两个监控下降的控制器都检测到接触失败并终止，但方块最终满足物理验收。这不是控制器成功恢复，也不是设计好的松爪策略。若只统计“方块是否在盒里”，就会把偶然落入目标的事故奖励为成功。

本轮 18 回合中有 12 回合满足物理验收；其中 2 回合控制器处于终止状态。后续评价至少应分别保留物理结果、观测合规性和控制器生命周期，不能合成一个未经定义的成功数字。

## 如何确认这些不是画出来的结论

归档包含 108,000 行控制与观测记录、10,800 个可回放状态、54 份原始文件。审计重新计算最终放置条件、检查观测间断与松爪注入时段、核对恢复窗口和预算，并验证 18 组策略比较在首次决策分歧之前的物理轨迹一致。

8 个契约测试覆盖低高度下降、低高度搬运、暂停阶段保留、绝对截止时间、释放阶段不触发新门控、接触失败、恢复路径和预算耗尽。

回放调用 `mj_forward` 根据已保存的 `qpos/qvel` 更新可视状态，不调用 `mj_step` 产生新的实验轨迹。[MuJoCo 仿真文档](https://mujoco.readthedocs.io/en/stable/programming/simulation.html)解释了这两个操作的区别。回放是证据的展示方式，不增加实验样本数。

## 复现与边界

在 `hohoo-embodied-agent` 仓库的现有 MuJoCo 环境执行：

```text
python -m unittest discover -s experiments/vl01_phase_recovery -p test_gate.py
python experiments/vl01_phase_recovery/run.py --out evidence/my-run
python experiments/vl01_phase_recovery/audit.py evidence/my-run
python experiments/vl01_phase_recovery/replay.py --evidence evidence/my-run
```

本次运行使用 MuJoCo 3.3.7、NumPy 2.2.6、Python 3.12.14。回放需要现有的 imageio/FFmpeg 与可用渲染环境。

结果只覆盖固定仿真、固定目标和上述干预。它没有证明真实硬件安全，没有解决永久缺测后的安全撤离，也没有重抓取。完整 VL01 与更高阶段里程碑仍未完成。

接下来最值得验证的不是再提高一个总分，而是将“完成”契约接入当前阶段恢复链：**什么时候允许宣布完成，终止后偶然落入目标应当如何记录，完成后观测失效又该如何撤销状态。** 这一轮先把恢复阶段与物理结果分开，给后续组合留下可审计的基础。
