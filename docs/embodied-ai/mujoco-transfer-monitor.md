---
title: "具身实践（三）：抓住之后，还要一直确认吗？"
description: "27回合MuJoCo对照：用单次观测缺失与受控松爪，检验持续监测、误停和40毫秒确认延迟，并公开代码、轨迹与重放。"
slug: /embodied-ai/mujoco-transfer-monitor
status: published
published_at: "2026-09-29"
updated: "2026-09-29"
reading_minutes: 14
domain: embodied-ai
article_kind: case-study
difficulty: intermediate
provenance: experiment-result
related:
  [
    "doc:embodied-ai/mujoco-grasp-guard",
    "doc:embodied-ai/mujoco-first-pick-place",
    "project:hohoo-embodied-agent",
    "lab:transfer-monitor",
  ]
---

[上一篇](/docs/embodied-ai/mujoco-grasp-guard)给搬运加了一道门：先确认方块已经抬起，且两侧夹爪持续接触，再进入下一阶段。

但这道门只回答了“**刚才抓住了吗**”。如果确认之后，方块在半路掉下来，原来的程序仍会继续搬运。一个时刻的成立条件，并不会自动变成整个过程的保证。

这次实际运行了 27 个 MuJoCo 回合：比较一次性检查、立即停止、连续三次异常才停止，并把“观测暂时出错”和“夹爪真的松开”分成两个条件。最有价值的结果不是成功率提高，而是看清两个代价：**响应越快，越容易被短暂异常打断；等待确认，则会多走一段路。**

[配套代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/581e8e383b397eff947880d888f5c089204bba98/experiments/vl01_transfer_monitor) · [27 回合原始证据](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/581e8e383b397eff947880d888f5c089204bba98/evidence/transfer-monitor-20260929) · [实验档案](/labs/transfer-monitor)

## 1. 前置条件与过程条件是两件事

原有流程在仿真时间 4.0 秒检查最近 0.2 秒的高度与双侧接触。这一轮保留该检查，每个回合都通过了它。

新增的检查发生在搬运阶段，也就是 4.0–5.5 秒：每隔 20 毫秒，重新查看左右指垫是否都接触方块。物理仿真仍每隔 2 毫秒步进，**检查频率和物理步长不是同一个概念**。

```text
抬升结束 → 前置确认 → 搬运
                       ├─ 条件仍成立：执行下一个目标
                       └─ 条件持续失效：锁定报警 → 保持目标 → 结束回合
```

这里的“保持”是冻结刚发送的执行器目标，继续运行物理仿真 0.6 秒；不是冻结物体坐标，也不是让速度瞬间归零。

## 2. 先把两种故障分开

场景、夹爪、摩擦系数、0 mm 拾取偏移、动作时序和成功定义沿用上一轮。只比较下列输入条件与监测策略。

| 条件                        | 注入位置                | 实际改变什么                               |
| --------------------------- | ----------------------- | ------------------------------------------ |
| clean：无扰动               | 不注入                  | 正常抓取与搬运                             |
| observation-gap：单次空报告 | 4.802 秒的一个观测样本  | 传给监测器的接触集合置空，真实物理接触不变 |
| forced-open：受控松爪       | 仿真时间 [4.8, 5.04) 秒 | 两侧夹爪位置目标覆盖为 0，持续 0.24 秒     |

第二种条件仍然有时间戳和观测记录。它模拟的是“这一帧报告没有接触”，**不等于通信中断、未收到数据或传感器超时**。后几种情况需要新鲜度检查，本轮尚未实现。

第三种条件通过位置执行器让夹爪松开，方块在 MuJoCo 的动力学和接触计算中掉落。程序没有把方块移到地面。不过，强制松爪也不是自然摩擦滑移模型，因此下面只讨论这一种可重复的夹持失效。

MuJoCo 的 `ctrl` 用于提供执行器控制输入；状态和接触则从仿真数据读取。这也让“发送了什么目标”和“环境实际发生了什么”能够分开记录。[MuJoCo 3.3.7 仿真接口说明](https://mujoco.readthedocs.io/en/3.3.7/programming/simulation.html#state-and-control)

## 3. 三个监测策略，只有一个阈值不同

| 策略      | 搬运前的确认 | 搬运中的处理                       |
| --------- | ------------ | ---------------------------------- |
| once      | 保留         | 记录接触，但不再中断               |
| immediate | 保留         | 一次缺少任意一侧接触就报警         |
| debounced | 保留         | 连续三次异常才报警；一次正常就清零 |

缺少任意一侧接触都算异常，地板或手掌接触不能代替指垫接触。核心逻辑可以压缩成：

```python
both = {"left_pad", "right_pad"} <= set(contacts.split("|"))
bad_streak = 0 if both else bad_streak + 1

if required and bad_streak >= required:
    alarm = True
```

完整代码还处理了两个容易漏掉的约束。

第一，报警一旦成立就锁存。随后接触恢复也不会自动恢复搬运；否则抖动的观测会让任务反复启停。恢复需要另一套明确的决策，本实验没有实现。

第二，只在 transfer 阶段启用这一规则。主动释放时，本来就应该失去接触。把同一个条件不加区分地检查到任务结束，可能把正常松手判成故障。本轮也没有覆盖放低阶段，不能称为全流程监测。

## 4. 实际结果：误停与漏检都看得见

实验矩阵为 3 条件 × 3 策略 × 3 次重复，共 27 回合。初始条件没有随机化，重复用于检查一致性，不能把这些次数解读成统计独立样本或泛化成功率。

| 条件             | once             | immediate            | debounced        |
| ---------------- | ---------------- | -------------------- | ---------------- |
| 无扰动           | 3 次完成放置     | 3 次完成放置         | 3 次完成放置     |
| 单次空接触报告   | 3 次完成放置     | 3 次误停，未完成放置 | 3 次完成放置     |
| 持续 0.24 秒松爪 | 3 次继续空手搬运 | 3 次取消后续搬运     | 3 次取消后续搬运 |

最后一行中，**三种策略都没有完成放置**。方块掉到了地面，取消搬运没有把它抓回来。若只用“放置是否成功”这一个指标，就看不到失败后的行为差异；若只用“有没有报警”，又会漏掉第二行的误停。

无扰动的 9 条完整状态轨迹与上一轮成功基线一致。单次空报告条件下，once 和 debounced 的 6 条轨迹也与无扰动一致。相同的是保存下来的 `qpos/qvel/ctrl` 与阶段记录，不只是最后的位置相近。

## 5. 多等两次观测，代价是什么？

下面取受控松爪条件的第一个重复，另外两次重复得到相同状态序列。时间单位为仿真时间。

| 策略      | 首个异常样本 | 报警时间 | 从首个异常到报警 | 首个异常之后的水平累计路程 |
| --------- | ------------ | -------- | ---------------- | -------------------------- |
| once      | 4.802 s      | 无       | 不适用           | 132.135 mm                 |
| immediate | 4.802 s      | 4.802 s  | 0 ms             | 11.902 mm                  |
| debounced | 4.802 s      | 4.842 s  | 40 ms            | 22.534 mm                  |

这里的 **0 ms 不是零物理检测延迟**。故障在 4.800 秒开始，而第一条异常记录在 4.802 秒；表格是从首个异常样本开始计时。真实接触改变的精确时刻也不能仅靠 50 Hz 日志还原。

三个异常样本位于 4.802、4.822、4.842 秒。首尾相差两个采样间隔，所以是 40 ms，不是 60 ms。在本次相位对齐条件下，从注入故障到 debounced 报警是 42 ms；这不是所有运行环境中的延迟上限。

水平累计路程按相邻样本计算：

```text
Σ sqrt((x[i+1] - x[i])² + (y[i+1] - y[i])²)
```

起点是首个异常样本，终点是各自回合结束：once 为 9.2 秒，immediate 为 5.402 秒，debounced 为 5.442 秒。**观察终点不同，这个量表示本次实际执行的后续路径，不是固定时间窗口的速度指标，也不是硬件制动距离。**

![受控松爪后，方块高度近似重合，而三个策略的夹爪水平运动不同](/media/practice/transfer-monitor-comparison.png)

图中阴影是强制松爪区间。上图的方块都掉落；中图显示夹爪从首个异常位置继续移动的差别；下图显示异常计数，报警后保持锁存值。图里的位移与表里的累计路程定义不同，在这条基本单向的轨迹上接近，但不能一般化地混用。

## 6. 为什么停止指令发出了，夹爪还在动？

immediate 已在首个异常样本报警，却仍继续移动了约 11.9 mm。原因不需要假设模型“没听懂”：程序保持的是**目标位置**，不是当前实际位置或速度。

报警时，位置执行器仍有跟踪误差，系统也有速度。冻结目标后，物理系统会继续响应。debounced 报警之后还移动了约 11.85 mm；表中的 22.534 mm 同时包含了等待确认期间的运动。

这说明至少应分别记录三个量：观测何时异常、控制目标何时改变、实体随后怎样运动。只打印一行“停止成功”，不足以证明它已经停止，更不足以证明落物风险已经解除。

## 7. 看轨迹重放，而不是只看结论

以下视频直接读取每回合保存的 50 Hz 坐标，没有插值或重新执行物理步骤。绿圈表示夹爪中心、红方块表示物体中心、十字表示目标；它们是 **XZ 平面投影，不是机器人几何或三维场景录像**。

### 一次性确认：方块掉落后，夹爪继续前往目标

<video controls preload="none" playsinline src="/media/practice/transfer-monitor-once.mp4" poster="/media/practice/transfer-monitor-once.png" width="960" height="640" aria-label="一次性检查的实际坐标重放">无法播放时，可从原始证据目录下载视频。</video>

### 连续三次确认：报警后保持目标，提前结束回合

<video controls preload="none" playsinline src="/media/practice/transfer-monitor-debounced.mp4" poster="/media/practice/transfer-monitor-debounced.png" width="960" height="640" aria-label="连续异常确认的实际坐标重放">无法播放时，可从原始证据目录下载视频。</video>

视频时长分别为 9.2 秒和 5.46 秒，由帧数除以 50 FPS 得到。第二段最后一条物理记录是 5.442 秒，播放器时长与记录终点的微小差别来自采样帧封装，不能拿视频时长当报警时间。

本轮环境的 OpenGL 三维渲染不可用，因此提供的是 CPU 轨迹可视化；完整状态仍然保留，可在具备图形环境的机器上按工程说明重放。

## 8. 别把程序自己的 summary 当作唯一证据

独立审计脚本不导入监测器或运行程序，而是读取 CSV、状态和事件，重新计算故障注入、接触观测、计数、报警、保持目标、路径与放置验收。

实际检查通过的内容包括：

- 27 回合日志均完整，没有 MuJoCo warning。
- 18 对策略在第一次决策分歧之前，保存的物理状态完全一致。
- 9 条无扰动完整轨迹复现上一轮成功基线。
- 6 条容忍单次空报告的轨迹与无扰动一致。
- 18 次同条件重复比较一致，另有 11 项监测器边界测试通过。

这些检查提高了本次记录的可核验程度，但不能排除所有实现问题，也不能证明仿真模型符合真实机器人。

## 9. 在自己的电脑上复现

使用工程已有的 Python 3.12 与锁定依赖，进入仓库根目录。运行前可以先查看 [冻结协议](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/581e8e383b397eff947880d888f5c089204bba98/experiments/vl01_transfer_monitor/protocol.json)。

```powershell
.venv/Scripts/python.exe -m unittest discover -s experiments/vl01_transfer_monitor -p test_monitor.py -v
.venv/Scripts/python.exe experiments/vl01_transfer_monitor/run.py --out outputs/my-transfer-monitor
.venv/Scripts/python.exe experiments/vl01_transfer_monitor/audit.py outputs/my-transfer-monitor
.venv/Scripts/python.exe experiments/vl01_transfer_monitor/render.py outputs/my-transfer-monitor
```

输出目录必须不存在，脚本拒绝覆盖旧回合。这里不需要模型 API Key。完整依赖、状态重放和产物含义见 [工程说明](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/581e8e383b397eff947880d888f5c089204bba98/experiments/vl01_transfer_monitor/README.md)。

优先检查 `manifest.json` 的版本与源码哈希，再看 `trajectory.csv`、`events.json` 和 `audit.json`。Git 中保留了本轮证据文件的原始换行，避免自动转换导致记录哈希失配。

## 10. 这次能说什么，下一次该问什么？

在这个固定条件下，持续监测确实取消了失去接触后的搬运；三次确认容忍了单次空报告，同时比立即停止多等待了 40 ms。**它证明了一个具体取舍，没有证明“三次”就是最优阈值。**

仍未覆盖观测延迟、连续丢失、摩擦变化、不同速度、放低阶段、视觉感知或真实机器人。只有故障停止，没有重新抓取、恢复规划或物理急停。完整 VL01 和 M4/M5 路线保持原状态。

下一步更值得做的是：冻结规则后扫描异常持续时间与采样间隔，再补充观测新鲜度检查。先弄清“允许等多久、数据多久算过期”，再讨论如何恢复。相关规划已写回现有研究待办，本轮没有把它们算作已完成结果。
