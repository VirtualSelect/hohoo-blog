---
title: "具身智能实践（九）：松爪命令成功，不等于放置完成"
description: "五条真实轨迹同时检查单帧与持续窗口：错误观测、延迟松爪和完成后的外力揭示验收范围。"
slug: "/embodied-ai/mujoco-release-verification"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:release-verification", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-exit-actions", "doc:embodied-ai/mujoco-recovery-budget"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/experiments/vl01_exit_release_budget) · [原始记录与审计](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/evidence/exit-release-budget-20261003) · [实验档案](/labs/release-verification)

上一轮研究了报警之后怎么退出。这一轮回到正常任务末端：程序已经发出了松爪目标，何时可以向上层报告“物体放好了”？

如果直接在 `release()` 返回后设 `success=true`，得到的只是命令链路结果。手指可能卡住，物体可能还在下落，甚至已经落到托盘外。因此本轮增加一个只观察、不改变控制器的完成验收器。

## 1. 将命令、观察与最终结果分开

固定脚本在6.5s进入释放阶段，手指目标随后逐渐张开。仿真仍按2ms推进、每20ms产生观测。两个判据处理**同一条物理轨迹**，不会因判定不同而改变动作：

- 单帧：第一次收到满足所有条件的新鲜观测就报告完成。
- 持续窗口：连续合格观测跨越至少250ms才报告完成；缺帧、过期或不合格会打断窗口。

两者的完成结果都锁存。锁存意味着“曾在某时刻满足判据”，不是“以后永远保持成功”。后面的外力对照专门检验这个区别。

## 2. 完成判据具体是什么

先决条件是已进入计划释放阶段，且此前方块确实抬高过10cm。每份合格观测还要求：

| 字段 | 约束 |
|---|---|
| X/Y | 距托盘中心(0.24,0.12)m，每轴误差小于45mm |
| Z | 距26mm的误差小于6mm |
| 线速度 | 小于0.02m/s |
| 支撑 | 与 `bin_floor` 接触 |
| 分离 | 不接触 `left_pad` 或 `right_pad` |
| 新鲜度 | 采样年龄小于60ms，时间戳递增 |
| 连续性 | 相邻有效采样间隔不超过20ms |

这比“位置到了”更严格，但仍是从仿真真值投影出的教学判据，没有相机估计误差，也没有验证支撑力是否足够。

250ms不是魔法常数。采样间隔20ms，所以从第一份合格观测到窗口通过，实际需要260ms，而不是把样本数量直接乘出一个含糊的时长。

## 3. 五种条件的实际结果

| 条件 | 单帧报告完成 | 窗口报告完成 | 12s终点验收 |
|---|---:|---:|---|
| 正常 | 6.842s | 7.102s | 通过 |
| 释放后手指一直闭合 | 不报告 | 不报告 | 失败 |
| 到7.0s才允许张开 | 7.042s | 7.302s | 通过 |
| 闭合故障中伪造一帧合格观测 | 6.602s | 不报告 | 失败 |
| 8.0s后施加短暂外力 | 6.842s | 7.102s | 失败 |

这五条轨迹只有观察判据的两路评分，不是十次独立物理试验。没有复制样本来增加“实验次数”。

<img src="/media/practice/release-verification.png" alt="单帧与持续窗口的完成时刻，以及同一轨迹的最终放置结果" width="1500" height="600" loading="lazy" />

## 4. 持续窗口挡住了什么，又没挡住什么

在伪造观测对照中，手指实际保持闭合，但6.602s的单份报告被改成：位于托盘中心、速度0、只接触托盘底。这是明确注入的错误测量，不是说现实传感器必然产生这种噪声。原始物理状态另外保存，便于核对真假。

单帧判据立即接受；持续窗口在下一份真实的不合格观测到来后被打断，未报告完成。这只支持它对本次孤立错误报告的容忍能力，不能推断它能抵御持续错误或有系统偏差的传感器。

外力对照则完全不同：方块先真的稳定放好，两种判据都正确报告了当时的状态。随后8.0–8.08s施加沿X方向1N外力，最终状态不再满足放置要求。不能倒过来称早先的报告必定是假阳性；它暴露的是锁存事件和持续保证之间的范围差别。

## 5. 成功应该是事件，还是持续状态？

如果任务只负责把物体放下，完成事件可以交接给下一阶段。如果任务还要保证物体在等待期间不被碰走，那么验收之后仍应监测，必要时撤销当前状态或发出新事件。

一个实用的接口可以分别保留 `completedAt`、`currentlyValid`与 `invalidatedAt`。本篇只实现前者，后两者仍是下一步，不在界面上伪装成已有安全功能。

也不要把连续合格窗口看成统计置信度。相邻采样高度相关，13个间隔不是13个独立证明。

## 6. 复现与检查

```sh
python experiments/vl01_exit_release_budget/run.py --out evidence/my-release-series
python experiments/vl01_exit_release_budget/audit.py evidence/my-release-series
```

在E9目录查看 `received`与物理 `contacts/cube_*`，可以直接发现故意注入的那一帧差异。每回合的 `single_completion`、`window_completion`与 `placement`分开保存；独立审计逐行重算窗口，而不是相信摘要里的成功值。

下篇转向[恢复次数与冷却](/docs/embodied-ai/mujoco-recovery-budget)。它同样要把“规则被遵守”与“任务完成”分开评估。

## 同方向继续阅读

- [具身智能实践（八）：检测到掉落以后，夹爪应该做什么？](/docs/embodied-ai/mujoco-exit-actions)
- [具身智能实践（十）：恢复次数受控了，为什么任务反而没完成？](/docs/embodied-ai/mujoco-recovery-budget)
