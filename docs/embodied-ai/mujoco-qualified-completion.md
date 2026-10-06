---
title: "具身智能实践（十四）：方块落进盒子，就能宣布任务完成吗？"
description: "8条MuJoCo轨迹、三个旁路判定器与真实回放，区分历史放置、当前证据和恢复流程中的完成资格。"
slug: "/embodied-ai/mujoco-qualified-completion"
status: "published"
published_at: "2026-10-05"
updated: "2026-10-07"
reading_minutes: 13
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:qualified-completion", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-phase-recovery", "doc:embodied-ai/mujoco-completion-lifecycle"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/9800095689ce3893f9e7a6ec681355e76c6fcff6/experiments/vl01_qualified_completion) · [原始记录与审计](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/9800095689ce3893f9e7a6ec681355e76c6fcff6/evidence/qualified-completion-20261005) · [实验档案](/labs/qualified-completion)

上一轮[下降阶段恢复](/docs/embodied-ai/mujoco-phase-recovery)留下了一个容易误判的结果：控制器已经终止，方块却落进了盒子。如果只截取最后一帧，这看起来像一次成功放置。

这一轮把“完成”接回整个执行过程。核心问题是：**物理目标满足过、当前仍满足、控制器有资格宣布完成，是否应该用同一个布尔值表示？**

## 先看最有区分度的案例

在下降松爪条件中，方块于 6.102s 满足持续放置证据；控制器于 6.442s 因重新验收超时进入 `ABORTED`。12s 时方块仍在目标区域，但计划中的释放流程没有正常执行。

因此三个读数分别为：

```text
曾满足物理放置：true
当前物理放置：  VALID
有资格的完成：  ABORTED，且没有完成时间
```

不是把物理成功改写成失败，而是保留它回答的问题：物体在哪里，与任务是如何走到这里的，是两条不同证据。

## 把模块接起来：动作状态与完成状态并行运行

```text
接近 → 闭爪 → 抬起 → 搬运 → 下降 → 释放
                 │       │       │
                 └── 阶段契约监测 ─┘
                         ↓ 异常
          暂停 → 预算内重新验收 → 重建剩余路径
                         └ 预算耗尽 → ABORTED → 退出动作

每个控制周期另行观察：
收到的观测包 → 新鲜度 → 物理放置 → 当前有效性
                                     ＋释放意图、未终止 → 完成资格
```

上图是现有模块的职责关系，不是新增控制器。E7 的[阶段契约](/docs/embodied-ai/mujoco-phase-contracts)决定“当前阶段该验收什么”；E10 的[恢复预算](/docs/embodied-ai/mujoco-recovery-budget)决定“还能等多久、重试几次”；E13 的[阶段恢复](/docs/embodied-ai/mujoco-phase-recovery)连接它们。E14 的观察器在旁路计算结果，不向执行器写动作。

这也解释了为什么不能只增加一个 `success` 字段。`ABORTED` 是执行流程的终态；`VALID / INVALID / UNKNOWN` 描述证据目前能支持什么；`completed_at` 保存历史事件。它们可以同时取不同值，而不矛盾。

<details><summary>小练习：方块仍在盒内，但最后一条观测已经过期，应该显示成功还是失败？</summary>

物理真值可能仍满足目标，但观察器没有足够的新证据，应显示 `UNKNOWN`，不是凭旧包继续显示 `VALID`，也不是断言方块已掉落。历史 `completed_at` 可以保留。下游必须自己定义：等待新证据、暂停，还是进入明确的退出流程。

</details>

## 2026-10-06 勘误：当前实现还不能保证哪些契约

复核固定代码后发现两个会影响复用的边界，原八条零传输延迟轨迹不覆盖它们：

1. **过期检查先于新包处理。** E11 基类先按上一个包计算年龄，再接收本次新包。每 20ms 采样、固定延迟 40ms、阈值 60ms 时，包本身未过期，但每次到达前旧包刚好过期，窗口反复清空，持续满足放置仍留在 `VERIFYING`。单次陈旧包拒绝正确，不代表带延迟的连续流也正确。
2. **释放只有布尔值，没有释放时间。** E14 无法拒绝“释放前采样、释放后到达”的包。2ms/tick 的反例中，释放在 tick 100，首包采样于 90、到达于 100；tick 230 时完成，最后证据采样于 220。释放后的证据跨度只有 120 tick（240ms），小于设定的 125 tick（250ms）。

因此，“不借用释放前证据”应视为**期望契约**，不能当成当前代码的普遍保证。原始 7.102s / 7.302s 等时间仍是已有固定场景的观测；本轮没有改写旧轨迹或补跑物理实验。复用前需要分别修正到达处理顺序与释放时间边界，并加入延迟、重复、乱序和时间倒退回归；这不是把一个阈值调大就能同时解决的问题。

## 三个判定器观察同一条轨迹

本轮复用 E13 的阶段感知控制与 E11 的[完成有效期](/docs/embodied-ai/mujoco-completion-lifecycle)。只增加旁路观察器，不让观察器改变动作。

| 判定器 | 需要什么 | 完成后是否继续检查 |
| --- | --- | --- |
| 历史物理放置 | 曾抬起，持续满足位置、速度和接触条件 | 不撤销历史事实 |
| 当前物理放置 | 相同物理条件与新鲜观测 | 会进入 INVALID 或 UNKNOWN |
| 有资格的当前完成 | 当前物理证据，加正常释放意图与未终止的执行流程 | 会失效；ABORTED 是终态 |

这是 **8 条物理轨迹，每条 3 个判定读数**，不能写成 24 次独立实验。历史判定直接保留物理观察器是否曾有效，避免为了同一事实再维护一套物理规则。

## 怎样定义“释放过”

不能沿用“仿真时间超过 6.5s 就算释放”。恢复会重建后续轨迹，正常释放的时间可能随之改变。

本轮只有当实际执行处于 `running`、当前动作阶段为 `release`，且夹爪指令小于 0.005m 时，才记录释放意图：

```python
if gate.state == 'running' and phase == 'release' and target[3] < .005:
    released = True
```

这个标记来自下发指令，**不是硬件确认，也不证明夹爪真的打开**。物理接触和稳定性仍要靠后续观测验收。抬起前提也来自收到的新鲜观测，而不是直接读取仿真真值替观察器作弊。

终止处理则独立于物理判断：

```python
if aborted or self.aborted:
    self.aborted = True
    self.start = None
    self.transition('ABORTED', now, 'controller-terminal')
    return
self.update(now, released, lifted, packet)
```

如果此前已经完成过，历史时间仍保留；但当前状态不能在终止后被新的“好观测”重新变成成功。本次松爪案例此前并未取得完成资格，因此完成时间为空。

## 实验设置与故障范围

每回合 12s，MuJoCo 3.3.7 以 2ms 步长推进。每 20ms 发送一条观测；证据超过或等于 60ms 未更新即过期。连续放置窗口为 250ms，受采样间隔影响，本轮实际从第一条好观测到确认需要 260ms。

物理谓词继续使用原场景：x、y 与盒心偏差小于 45mm；z 与 26mm 的偏差小于 6mm；速度小于 0.02m/s；接触盒底，且不接触左右夹指。最终物理验收检查最后 500ms，而完成观察器使用收到的包。

| 条件 | 注入内容 |
| --- | --- |
| 正常 | 无故障 |
| 下降短暂缺测 | 5.6—5.84s 不发送观测 |
| 下降松爪 | 5.6—5.84s 将夹爪命令改为打开 |
| 下降永久缺测 | 5.6s 后不再发送观测 |
| 释放后推动 | 8—8.08s 施加 x 方向 1N 外力 |
| 释放后静默 | 8—8.4s 不发送观测 |
| 单条坏观测 | 8.202s 把收到的 x 位置改为 0.5m，物理状态不变 |
| 重放旧观测 | 8—8.4s 重复发送 8s 前最后一个包，保留旧采样时间 |

## 最终状态揭示了哪些差别

| 条件 | 最终物理验收 | 历史放置 | 当前物理状态 | 有资格的当前完成 |
| --- | --- | --- | --- | --- |
| 正常 | 通过 | 是 | VALID | VALID |
| 下降短暂缺测 | 通过 | 是 | VALID | VALID |
| 下降松爪 | 通过 | 是 | VALID | ABORTED |
| 下降永久缺测 | 未通过 | 否 | UNKNOWN | ABORTED |
| 释放后推动 | 未通过 | 是 | INVALID | INVALID |
| 释放后静默 | 通过 | 是 | VALID | VALID |
| 单条坏观测 | 通过 | 是 | VALID | VALID |
| 重放旧观测 | 通过 | 是 | VALID | VALID |

<img src="/media/practice/qualified-completion.png" width="1500" height="600" loading="lazy" alt="下降松爪与释放后推动的状态时间线，区分物理放置有效与具备执行资格的完成。">

有两种不同的误读：松爪组说明“当前物理有效”仍不足以代表正常任务完成；推动组说明“历史完成”不足以代表目标现在仍满足。三个判定器正好把两种问题拆开。

正常组的物理完成时间是 7.102s，有资格的完成时间为 7.302s。这两组零传输延迟轨迹在释放意图后重新收集窗口；带延迟观测能否满足同一契约，见上方勘误。下降短暂缺测恢复后对应为 7.142s 和 7.342s。增加的等待是判定规则的结果，不是机械臂动作变慢。

## 终点相同，中间状态可以不同

只看最终表会漏掉三个重要过程：

- **释放后静默**：8.042s 变为 UNKNOWN；8.402s 收到新包后重新收集；8.662s 才恢复 VALID。
- **重放旧包**：状态时间与静默组一致。数据一直到达，但旧的采样时间不能刷新证据有效期。
- **单条坏观测**：8.202s 立即 INVALID；8.222s 开始重新验收；8.482s 恢复 VALID。方块始终未被推动，这暴露了当前规则对单点噪声的敏感性。

因此 `completed_at` 和 `current_validity` 都需要保留。一个用于记录历史，另一个用于决定下游动作现在还能否依赖这个结果。

## 观看已记录状态回放

<video src="/media/practice/qualified-completion-replay.mp4" controls preload="none" width="1440" height="384" poster="/media/practice/qualified-completion-poster.png" aria-label="正常、下降松爪和释放后推动三种场景的已记录状态回放">浏览器不支持视频时，可从原始证据目录下载回放。</video>

左侧正常、中间下降松爪、右侧释放后推动；这三幅画面是**不同故障场景**，不是同一故障下三种控制策略的对照。标签显示当前完成资格。暂停在 8.4s 左右，可以同时看到正常有效、偶然放置但已终止、完成后被推离目标三种情况。

视频从存档的 qpos、qvel 和 ctrl 恢复画面，只调用 `mj_forward`，不再推进物理仿真，不计为新增回合。

## 如何复现与核查

在具身工程根目录使用已有虚拟环境：

```text
python -m unittest discover -s experiments/vl01_qualified_completion -p test_completion.py
python experiments/vl01_qualified_completion/run.py --out evidence/my-completion-run
python experiments/vl01_qualified_completion/audit.py evidence/my-completion-run
python experiments/vl01_qualified_completion/replay.py --evidence evidence/my-completion-run
```

归档含 **48,000 行控制／观测记录、4,800 个回放状态**，以及逐回合摘要、哈希和冻结版本。审计从原始 CSV 独立重建三个状态序列与最终物理验收；七组契约测试覆盖释放前提、终止不可逆、历史保留、缺测、坏观测、旧包与时间倒退。

查看 `lower-drop/control.csv.gz` 时，将 `state_after`、`release_intent`、`current_physical`、`qualified` 并排放在一起，比只看 summary 中的 `placement` 更能解释结果。

## 这一轮仍没有解决什么

观察器目前只输出状态，不会在释放后 INVALID 时自动重抓取或撤离。控制器仍可能显示 `running`，而完成观察器已经 INVALID；这是不同状态机的职责边界，不应合并成一个字段。

单条坏包就撤销有效性是否过于敏感，需要带噪声分布的独立实验。释放意图也需要在更真实的系统里升级为执行确认。当前固定仿真没有证明真机安全、通用成功率或完整 VL01 已完成。

下一步优先验证：**下游动作如何订阅有效性变化，并在失效后安全停止或重新规划**。这比继续增加一个“成功百分比”更能检验完成契约是否真正被系统使用。

## 修复进展 · 2026-10-07

2026-10-07 修正：先处理同一时刻的新观测再判断过期；E14 记录释放意图时刻，排除释放前采样的迟到包。20 项判定器检查及原 E11/E14 协议的 7/8 回合复跑通过独立审计。旧证据仍对应原固定版本，不据此扩大到真机或完整里程碑。

[修正版代码与回归命令](https://github.com/VirtualSelect/hohoo-embodied-agent/blob/907c10a8fb25e1cec242e335b1a52b21b122fdc6/REVIEW-FIXES-20261007.md)。
