---
title: "具身智能实践（十）：恢复次数受控了，为什么任务反而没完成？"
description: "12回合对照无限恢复、两次预算与400ms冷却：分别记录启停、验收窗口、终止原因和最终任务结果。"
slug: "/embodied-ai/mujoco-recovery-budget"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:recovery-budget", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-exit-actions", "doc:embodied-ai/mujoco-release-verification"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/experiments/vl01_exit_release_budget) · [原始记录与审计](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/evidence/exit-release-budget-20261003) · [实验档案](/labs/recovery-budget)

[恢复消融](/docs/embodied-ai/mujoco-recovery-ablation)已经提醒过我们，反复恢复不能只看路径是否平滑。系统还需要回答：最多尝试几次？恢复之前至少等待多久？什么时候明确放弃？

本轮复用E5的新鲜观测门控，加入恢复次数与最短保持时间。一个容易期待的结论是“限制越多越好”；实际结果没有这么简单。

## 1. 固定恢复的证据要求

搬运时观测年龄达到60ms，进入保持；恢复必须有停止之后的新鲜、连续、合格观测，采样时间跨度至少100ms。双指接触、方块高度和夹持距离仍必须通过。

恢复后，从实测夹爪位置重新规划500ms搬运路径，再执行既有下降、释放、后退。每次保持最多800ms，超过就中止。三策略只改变次数/最短等待限制：

| 策略 | 最大恢复次数 | 最短保持时间 |
|---|---:|---:|
| `unlimited` | 本回合不设次数上限 | 0，仍需证据窗口 |
| `budget-two` | 2 | 0，仍需证据窗口 |
| `budget-two-cooldown` | 2 | 400ms，仍需证据窗口 |

“无限”仍受12秒回合时长和800ms单次保持期限约束，并非可以在真实系统里无限运行。预算计算的是实际获准的恢复，不把每次收到包都当成一次恢复。

## 2. 四种通信条件

无扰动；一次丢包4.6–4.84s；从4.3s起每440ms丢前140ms、到6.94s结束；从4.3s起永久丢包。通信故障不直接修改物体状态，也不伪造新的正常时间戳。

本轮仍只监测搬运，故障窗口绑定绝对仿真时间。不同保持时长会改变路径进度与暴露，这点必须保留在解释里，不能说是整个任务范围内纯粹的预算效应。

四条件各三策略，共12个确定性物理回合；其余场景、物理参数与初态相同。

## 3. 完整结果

| 条件 | 无次数上限 | 两次预算 | 两次预算＋冷却 |
|---|---|---|---|
| 无扰动 | 0次恢复，完成 | 0次，完成 | 0次，完成 |
| 一次丢包 | 1次，完成 | 1次，完成 | 1次，完成 |
| 周期性丢包 | 6次，完成 | 2次，预算中止 | 2次，预算中止 |
| 永久丢包 | 0次，等待超时中止 | 同左 | 同左 |

周期丢包中，无上限策略虽然反复启停，最终仍完成放置；两种有界策略按设计停止，方块还被夹着，没有完成任务。这不是需要藏起来的坏结果，而是清楚展示了“限制工作量”和“尽可能完成任务”的权衡。

<img src="/media/practice/recovery-budget.png" alt="周期丢包下三种策略的保持、恢复和预算中止时间线" width="1500" height="600" loading="lazy" />

## 4. 冷却为什么没有挡住下一次立刻停机

周期故障中首次保持发生在4.342s。没有冷却的策略在4.542s恢复；冷却策略等待至4.742s才恢复。然而下一次观测过期在4.782s就发生了，恢复后只运行了40ms。

400ms最短保持约束的是“过去已经等够多久”，并不能保证“未来至少稳定多久”。这次恢复时最新观测仍新鲜，过去连续窗口也合格，下一段通信故障却已经临近。把冷却时间叫作稳定性保证会超出它实际检查的内容。

如果需要减少短暂恢复，可以研究更长的连续健康窗口、链路质量估计或明确的升级处理，但必须另做协议和对照。本篇没有靠事后调参把曲线修漂亮。

## 5. 次数、冷却和期限如何排序

`BudgetGate`复用已有门控，在满足恢复证据时再检查预算。预算已用完就进入 `aborted`；尚有预算但未达到最短保持时间，就继续等待。800ms保持期限在基类中优先检查，因此再好的观测也不能越过已到期的等待上限。

```python
if resumes >= cap:
    abort("budget")
elif now - hold_tick < cooldown:
    keep_waiting()
else:
    resume_after_revalidation()
```

预算中止沿用保持目标，并没有自动松爪。本例刻意没有把[E8退出动作](/docs/embodied-ai/mujoco-exit-actions)直接混进来，否则最终放置变化又可能来自退出策略。下一步应将两者明确组合，并重新验证，而不是因为两个模块各自有测试，就宣布组合也可靠。

## 6. 验收了什么，没有验收什么

16项测试包括门控边界与证据篡改检出。独立审计检查32回合的96份记录、11份源文件指纹；对E10逐次核对恢复次数、停止后连续采样窗口、新鲜度、冷却与等待期限。

这不是独立重算整个物理过程或形式化安全证明。所有数据来自固定教学场景，没有测硬件制动、负载变化、传感器误差分布或跨场景成功率。完整VL01和M4/M5仍保持原有学习状态。

```sh
python experiments/vl01_exit_release_budget/run.py --out evidence/my-budget-series
python experiments/vl01_exit_release_budget/audit.py evidence/my-budget-series
```

读完可以试着先写预期：如果预算设为0，在首次有足够恢复证据时会怎样？如果冷却比保持期限还长呢？这些边界已在单元测试中运行，它们比“加一个重试计数器”更接近实际控制器需要面对的问题。

## 同方向继续阅读

- [具身智能实践（八）：检测到掉落以后，夹爪应该做什么？](/docs/embodied-ai/mujoco-exit-actions)
- [具身智能实践（九）：松爪命令成功，不等于放置完成](/docs/embodied-ai/mujoco-release-verification)
