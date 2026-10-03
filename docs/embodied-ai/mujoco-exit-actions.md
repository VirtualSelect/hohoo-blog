---
title: "具身智能实践（八）：检测到掉落以后，夹爪应该做什么？"
description: "15回合固定场景对照保持、松爪、松爪后退：报警相同，退出动作不同，最终放置也不同。"
slug: "/embodied-ai/mujoco-exit-actions"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:exit-actions", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-recovery-budget", "doc:embodied-ai/mujoco-release-verification"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/experiments/vl01_exit_release_budget) · [原始记录与审计](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/evidence/exit-release-budget-20261003) · [实验档案](/labs/exit-actions)

[阶段契约实验](/docs/embodied-ai/mujoco-phase-contracts)已经解决了“正常下降被高度规则误停”的问题，但留下了更实际的失败：晚下降时正确报警，方块最后仍同时接触托盘和两侧手指，没通过放置验收。

继续给监测器加条件无法直接解决它。本轮固定报警规则，只换报警之后的执行器目标，观察控制链路真正发生什么。

## 1. 为什么保持目标不等于静止或安全

本场景使用位置执行器，控制量是夹爪位置与手指闭合目标。保存最后一个目标，并不意味着关闭物理仿真、清零速度或移除驱动力。

在晚下降松爪故障中，故障结束后，保持策略又恢复到报警时保存的闭合目标。手指于是继续向该目标运动，最后仍碰着方块。不能把这个结果描述为有意识的重新抓取，更不能称为硬件急停。

MuJoCo每一步根据模型与控制输入推进动力学；本轮没有通过修改 `qpos`把物体传送到期望位置。相关接口背景见 [MuJoCo仿真文档](https://mujoco.readthedocs.io/en/stable/programming/simulation.html)。

## 2. 只改变退出动作

报警仍使用E7的分阶段规则：搬运要求双指接触、方块高度大于12cm、夹持距离小于5cm；下降去掉高度要求。异常采样跨越40ms，或最新观测年龄达到60ms，锁存停止。

| 策略 | 报警后下一控制步 | 后续 |
|---|---|---|
| `hold` | 保持所有目标 | 不恢复 |
| `open` | 保持XYZ，手指目标置0 | 保持张开 |
| `open-retreat` | 与open相同 | 200ms后，用600ms平滑将Z目标提高100mm |

三个策略沿用相同初态、2ms物理步长、20ms采样和故障时刻。五种条件各跑一次，共15回合；运行到12秒，最后0.5秒按位置、高度、速度与无手指接触验收。它不是随机样本的成功率估计。

## 3. 完整结果，而不是只挑改善的两行

| 条件 | 首次报警 | 保持 | 松爪 | 松爪后退 |
|---|---:|---|---|---|
| 无扰动 | 无 | 通过 | 通过 | 通过 |
| 搬运松爪4.8–5.04s | 4.842s | 失败 | 失败 | 失败 |
| 早下降松爪5.6–5.84s | 5.642s | 通过 | 通过 | 通过 |
| 晚下降松爪6.2–6.44s | 6.242s | 失败 | 通过 | 通过 |
| 下降丢包5.6–5.84s | 5.642s | 失败 | 通过 | 通过 |

同条件的三策略在报警前物理状态一致；独立审计核对了15组策略对。这样可以把后续差异与退出动作联系起来，而不是比较三条一开始就不同的轨迹。

<img src="/media/practice/exit-actions.png" alt="晚下降相同报警后，三种退出动作下的方块中心高度" width="1500" height="600" loading="lazy" />

## 4. 两类“通过”要分别解释

晚下降保持策略最终接触集合是 `bin_floor|left_pad|right_pad`；两个松爪策略只剩 `bin_floor`，因此通过了无手指接触这一项。保持时中心高度约25.920mm，松爪后约25.980mm；这点高度差本身不是验收差异的主要依据，接触分离才是。

下降丢包时，物体在托盘上方，松爪让它落入托盘，终点检查也通过。这**不证明在观测不可靠时松爪是通用安全动作**。本场景地形已知，下面恰好有托盘，且没有易碎物品、人员或夹持力约束。

搬运途中掉落的三个策略全部失败，方块落到地面；它们没有重新抓取、没有寻找方块，也没有把它送回托盘。这个反例限制了结论：改变退出动作可以消除某些残留接触，但并没有解决整个恢复任务。

早下降三者都通过，来自物体掉入托盘；同样不能将最终落点等同于正确执行了计划释放流程。

## 5. 后退动作有没有额外收益？

在这五个固定条件中，open和open-retreat的最终验收相同。不能为了说明更复杂控制器的价值，就称后退“进一步提升成功率”。它确实改变了夹爪路径，但是否改善碰撞余量、接触力或后续任务便利，需要另外的测量。

本轮只在共同报警后比较指定动作，没有叠加恢复门控或视觉重抓取，也没有测接触力峰值。完整任务的退出策略通常需要考虑当前空间位置和可用支撑面，不能只由一个报警布尔值决定。

## 6. 复现与原始过程

```sh
python -m unittest discover -s experiments/vl01_exit_release_budget -p "test_*.py"
python experiments/vl01_exit_release_budget/run.py --out evidence/my-exit-series
python experiments/vl01_exit_release_budget/audit.py evidence/my-exit-series
```

运行命令会执行E8–E10完整32回合。每回合保存压缩的2ms控制记录、20ms状态快照与摘要。环境为Python3.12.14、MuJoCo3.3.7、NumPy2.2.6。审计核对控制目标、采样投影、状态坐标、接触与最终验收；没有独立重算接触力。

下一篇将“发出松爪命令”与[“已经完成放置”](/docs/embodied-ai/mujoco-release-verification)分开，给释放后的观察建立判据。

## 同方向继续阅读

- [具身智能实践（九）：松爪命令成功，不等于放置完成](/docs/embodied-ai/mujoco-release-verification)
- [具身智能实践（十）：恢复次数受控了，为什么任务反而没完成？](/docs/embodied-ai/mujoco-recovery-budget)
