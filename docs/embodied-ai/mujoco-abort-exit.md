---
title: "具身智能实践（十二）：恢复预算耗尽之后，夹爪应该做什么？"
description: "12 个 MuJoCo 回合与三画面回放，对比保持、松爪、松爪后退，区分终止决定与实际退出后果。"
slug: "/embodied-ai/mujoco-abort-exit"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 12
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:abort-exit", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-recovery-budget", "doc:embodied-ai/mujoco-exit-actions", "doc:embodied-ai/mujoco-completion-lifecycle"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/2cf78a9afce618ea8ce35a882f0db203b2a74f57/experiments/vl01_abort_exit) · [原始记录与审计](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/2cf78a9afce618ea8ce35a882f0db203b2a74f57/evidence/abort-exit-20261003) · [实验档案](/labs/abort-exit)

恢复预算耗尽，状态机进入 `aborted`。接下来夹爪应该做什么？继续夹住、立即松开，还是松开后抬离现场？

之前的 E8 比较过退出动作，E10 限制过恢复次数，但两者还没有组合验证。这一轮固定 E10 的监控与恢复条件，只替换**终止后的执行动作**，跑了 12 个 MuJoCo 回合。结果很直接：两组搬运阶段中断条件下，三种退出动作都没有完成放置；它们只是留下了不同的物理后果。

这篇记录失败的差别，也回答一个工程问题：**决定不再继续任务，与决定执行什么退出动作，为什么必须分开建模。**

## 先看同一次终止的三种后果

下面不是制作出来的示意动画。三个画面来自 `repeated-gap` 条件的归档状态：每 20ms 保存一次 `qpos/qvel/ctrl`，重放时调用 `mj_forward` 更新可视化，不再次推进物理仿真。视频按每隔一个记录取一帧生成 25fps，三侧使用相同时间点。

<video src="/media/practice/abort-exit-replay.mp4" controls preload="none" width="1440" height="384" poster="/media/practice/abort-exit-poster.png" aria-label="重复观测间断下，保持、松爪、松爪后退的同时间三画面对照回放">浏览器不支持视频时，可打开原始实验记录中的 MP4。</video>

左侧保持夹持，方块停在半空；中间松爪，方块落到盒子外的地板；右侧松爪后抬升夹爪，方块仍在地板上。三个画面中的盒子位置没有变，退出前轨迹也经过逐行一致性检查。视频展示的是脚本控制的仿真夹爪，不是真实机械臂、视觉策略或学习得到的机器人控制器。

## 两层状态，各自回答不同的问题

| 决策层 | 输入 | 输出 |
| --- | --- | --- |
| 恢复门控 | 观测年龄、抓取证据、重新确认窗口、恢复次数 | 运行、等待或终止 |
| 退出执行 | 终止时保存的目标、经过的时间、退出策略 | 夹爪开合与位置目标 |

保持原来的恢复规则：只在 `transfer` 阶段主动检查抓取；观测每 20ms 采样，年龄达到 60ms 进入等待；恢复需要暂停后新鲜、连续的良好证据覆盖至少 100ms，每次等待至少 400ms；最多恢复两次，等待 800ms 仍未恢复则终止。

预算检查在冷却检查之前：两次恢复已经用完时，下一次满足恢复证据的机会直接触发预算终止，不需要再等满 400ms。这是沿用 E10 的规则，不是根据本轮结果临时调参。

终止本轮任务后不自动重抓，也不清零预算重新运行。`aborted` 不再退回 `running`，但物理模拟还要继续，才能看到退出动作的后果。

## 冻结条件：四种观测情况乘三种动作

场景、方块、盒子、执行器、控制路径与最终放置判据都沿用前序实验。物理步长 2ms，每回合持续 12 秒，每个组合运行一次，没有随机扰动或成功率统计。

| 条件 | 故障注入 | 用途 |
| --- | --- | --- |
| clean | 无 | 确认新增退出逻辑不改变正常路径 |
| repeated-gap | 4.3–6.94 秒，每 440ms 周期前 140ms 不发观测 | 触发多次暂停，最终耗尽恢复预算 |
| permanent-gap | 4.3 秒起不再发观测 | 触发重新确认截止时间 |
| lower-silence | 5.6–5.84 秒不发观测 | 保留 transfer-only 监控覆盖范围外的对照 |

这些故障删除的是观察包，没有瞬移方块或伪造物理位置。它们按绝对仿真时间注入；不同控制器可能因暂停而处于不同阶段，所以不能把结果解释为任意任务阶段都具有相同暴露时间。

三种动作只在终止后的下一物理步生效：

- `hold`：继续使用保存的夹持和位置目标。
- `open`：位置不变，夹爪开合目标设为 0。
- `open-retreat`：先松爪；200ms 后，在 600ms 内按 smoothstep 将高度目标提高 100mm。

`hold` 也不是断电停机。执行器仍在追踪目标、持续施加控制，这份实验没有测热量、力限值或能耗。

## 实际结果：终止一致，物理后果不同

| 条件 | 终止时间 | 恢复次数 | hold 最后状态 | open / open-retreat 最后状态 | 放置判据 |
| --- | ---: | ---: | --- | --- | --- |
| clean | 未终止 | 0 | 盒底接触 | 盒底接触 | 三种均通过 |
| repeated-gap | 5.422 秒 | 2 | 双指接触，方块约 165.00mm 高 | 地板接触，方块约 19.99mm 高 | 三种均未通过 |
| permanent-gap | 5.142 秒 | 0 | 双指接触，方块约 165.48mm 高 | 地板接触，方块约 19.99mm 高 | 三种均未通过 |
| lower-silence | 未终止 | 0 | 盒底接触 | 盒底接触 | 三种均通过 |

无故障与下降静默组最终方块中心高度约 25.98mm，与盒底接触。表中的“通过”检查的是最后 500ms 内位置、速度、无手指接触以及先前确实抬起等约束；不是只在最终截图里目测“好像进盒子了”。12 回合没有 MuJoCo 数值警告。

重复间断组的事件链可以逐步解释：

```text
4.342s HOLD → 4.742s RESUME
4.782s HOLD → 5.182s RESUME
5.222s HOLD → 5.422s ABORT (budget)
```

永久间断则在 4.342 秒暂停，经过 800ms 于 5.142 秒终止。两者终止原因不同，日志保留 `budget` 和 `revalidation_deadline`，不能统一吞成一个模糊的“失败”。

## 为什么抬高夹爪仍然不算更好的恢复

<img src="/media/practice/abort-exit.png" width="1500" height="600" loading="lazy" alt="重复间断条件下，三种退出动作的方块和夹爪高度曲线；5.422秒终止，松爪两组方块落地，后退只抬高夹爪。" />

`open-retreat` 在视觉上更“干净”：夹爪离开了方块。但它没有改变已经失去支撑的方块落向地板这一事实。高度曲线中，松爪与松爪后退的方块最终高度相同，夹爪高度才分开。

同样，`hold` 保留双指接触，不代表任务更接近完成。它把物体继续留在盒子外的半空。若要选择真实系统的退出方式，还需要允许放置区域、碰撞、抓力、关节限位、人员接近等信息；本场景无法证明任一动作“最安全”。

因此，这组实验没有胜出策略。它说明的是：退出策略应接受任务和环境约束，不能把一个动作模板当成所有失败的通用补救。

## 下降静默为什么必须留下

`lower-silence` 最终放置成功，却没有触发任何暂停或终止。原因不是静默无害，而是本轮沿用的门控只监控搬运阶段；下降阶段的静默没有进入主动判定范围。

这个结果限制了结论：E12 研究的是“同一终止决定之后的动作”，并没有把 E7 的阶段监控全面并入 E10。保留覆盖范围外的条件，可以防止读者误以为已得到全程故障处理器。后续要做阶段监控、恢复预算和退出动作的完整组合，仍需另冻协议、另跑矩阵。

## 证据怎样复核

每回合归档三个文件：`control.csv.gz` 包含 6,000 行逐步控制/位置/观测；`states.jsonl.gz` 包含 600 个回放状态；`summary.json` 保存终止事件、接触和结果。合计 72,000 行控制记录、7,200 个状态、36 份原始文件。

独立审计核对文件哈希，重新计算故障时间表、退出目标、最终放置与状态投影，并检查同条件三种动作在终止之前的轨迹：四种条件共 12 组两两比较均一致。对无终止条件，比较覆盖整个回合。它没有穷尽验证所有可能的门控输入。

```sh
python -m unittest discover -s experiments/vl01_abort_exit -p "test_*.py"
python experiments/vl01_abort_exit/run.py --out evidence/abort-exit-MY-RUN
python experiments/vl01_abort_exit/audit.py evidence/abort-exit-MY-RUN
python experiments/vl01_abort_exit/replay.py --evidence evidence/abort-exit-MY-RUN
```

归档使用 Python 3.12.14、NumPy 2.2.6、MuJoCo 3.3.7。图表依赖 Matplotlib，回放使用仓库已有的 imageio/FFmpeg 与 Pillow。核心实验不需要渲染；回放需要可用图形环境。关于 `mj_step` 与派生状态更新可查阅 [MuJoCo 仿真文档](https://mujoco.readthedocs.io/en/stable/programming/simulation.html)。

## 下一步该补什么

真正缺少的不是第四种固定动作，而是**终止时可用的环境信息和退出约束**。例如，是否存在已确认可接触的安全承托区域；观测失效时允许移动多远；物体掉落后是否应禁止再次闭爪。先把这些问题变成可检验条件，再比较策略，才可能从“停止以后做点什么”走向有依据的故障处理。

当前结论停留在固定仿真场景。没有 ROS2、真实机器人、学习策略或重抓取，也没有因此宣布完整 VL01、M4/M5 已完成。
