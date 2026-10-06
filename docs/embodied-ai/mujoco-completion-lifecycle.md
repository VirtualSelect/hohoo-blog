---
title: "具身智能实践（十一）：已经放好了，为什么还要撤销“完成”？"
description: "七条 MuJoCo 轨迹与双画面回放，将历史完成事件和当前有效状态分开，保留传感误报与过期边界。"
slug: "/embodied-ai/mujoco-completion-lifecycle"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-07"
reading_minutes: 11
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:completion-lifecycle", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-release-verification", "doc:embodied-ai/mujoco-recovery-budget"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/cd26180e8560155d18c45d34a33dc9ef25bbcdf6/experiments/vl01_completion_lifecycle) · [原始记录与审计](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/cd26180e8560155d18c45d34a33dc9ef25bbcdf6/evidence/completion-lifecycle-20261003) · [实验档案](/labs/completion-lifecycle)

上一轮释放验收有一个很具体的反例：物体先在托盘目标区域稳定了足够久，程序报告完成；随后外力把它推离合格区域，最终放置失败，但已经锁存的完成标志仍然为真。

这个标志没有记录错历史。错误在于上层把“曾经通过验收”当成“现在仍然可用”。本篇将两者拆开：`completed_at` 保留第一次完成事件，`state` 根据持续观测更新。新增七条真实 MuJoCo 轨迹，直接检查推力、静默、旧包重送和单帧错误报告。

## 1. 先看同一动作的两种结局

左侧正常运行，右侧在 8.0 到 8.08 秒向方块施加 x 方向 1N 外力。两者此前使用同一个场景、动作序列与验收条件。

<video src="/media/practice/completion-replay.mp4" controls preload="none" width="1280" height="448" poster="/media/practice/completion-replay-poster.png" aria-label="正常与外力扰动的MuJoCo记录回放，显示历史完成和当前有效状态">当前浏览器无法播放视频，请查看下方时间表及原始记录。</video>

回放直接读取归档的 qpos、qvel 和状态事件，再用 `mj_forward` 更新渲染，不重新推进动力学，不算新增实验回合。画面中的 `historical=True` 只表示曾经完成，`current=VALID/INVALID` 表示当前验收状态。视频没有声音，关键结果也完整列在下面。

两条轨迹都在 **7.102 秒**首次完成。右侧在 **8.022 秒**撤销当前有效性，历史完成时刻仍然保留。完整轨迹到 12 秒结束；最后 0.5 秒的放置验收，正常条件通过，外力条件失败。

## 2. 为什么一个布尔值不够

本轮用五个互斥状态表达当前观察结果：

| 状态 | 含义 | 上层不能误解成什么 |
| --- | --- | --- |
| NOT_READY | 尚未满足抬升与释放阶段前提 | 已经开始验收 |
| UNKNOWN | 缺乏足够新鲜或有效的观测 | 已知物体掉落 |
| INVALID | 新鲜观测违反放置条件 | 永久不可恢复 |
| VERIFYING | 有合格观测，正在积累持续窗口 | 已完成 |
| VALID | 连续窗口满足要求且观测仍新鲜 | 此后永远成功 |

`completed_at` 则是一个独立、只记录一次的历史字段。失败后的重新验收不会改写这个首次时刻。这样既能回答“任务曾在何时完成”，也能回答“现在能不能把结果交给下一阶段”。

注意，本例只观察，不自动执行重新抓取或恢复动作；状态撤销与动作决策是两层不同的职责。

## 3. 把空间、接触与时间条件写进契约

物理步长为 2ms，每 20ms 产生一次观测，持续窗口至少 250ms，观测年龄达到 60ms 即过期。使用整数 tick 计算边界，避免依赖浮点秒数是否恰好相等。

合格观测要求方块 x/y 距离目标中心 `(0.24, 0.12)` 分别小于 0.045m，z 距离 0.026m 小于 0.006m，速度小于 0.02m/s，接触 `bin_floor`，并且不接触左右手指。之前还必须曾抬高到 0.1m 以上，并进入释放阶段。

连续观测的捕获时刻间距不能超过 20ms；重复或乱序包不能刷新新鲜度。窗口至少 250ms，而采样以 20ms 为单位，因此本轮实际需要跨越 260ms。`VALID` 是这些具体条件下的观察状态，不是通用机器人安全认证。

旧版最终放置验收复用 VL01 的最后 0.5 秒位置、速度、抬升和无手指接触要求；当前观察器额外要求 `bin_floor` 接触。两者分别保存，不能把末端验收结果当作持续状态的别名。

## 4. 在新包到达之前先检查证据是否过期

更新顺序影响边界行为。先检查上一份可信捕获是否已过期，再处理新到达的包：

```python
if self.last is None or now - self.last >= self.age:
    self.start = None
    self.transition('UNKNOWN', now, 'no-fresh-evidence')
if packet is None:
    return
# 在这里验证包格式，并忽略重复、乱序或过期的捕获。
if not placed(packet):
    self.start = None
    self.transition('INVALID', now, 'fresh-violation')
    return
```

为什么不能“只要本次有新包，就认为没有断过”？因为包刚好在 60ms 截止时到达时，旧证据已经不能继续支持原来的稳定窗口。新包可以开启新的验证，不能把空档擦掉。

这种顺序在 `boundary-gap` 中产生两个同 tick 的事件：8.042 秒先 UNKNOWN，再 VERIFYING。汇总曲线每个物理 tick 只画最后状态，因此看不到宽度为零的 UNKNOWN 段；逐事件列表保留了这次重置。不要只看图而忽略日志粒度。

## 5. 七种条件的实际结果

两种观察器处理同一物理轨迹，因此是七个回合，不是十四个。所有条件第一次完成都是 7.102 秒，旧版完成标志此后不再变化。

<img src="/media/practice/completion-lifecycle.png" alt="七种条件下当前验收状态的时间条：外力触发无效，静默和旧包触发未知，恢复后重新验证；历史首次完成均为7.102秒" width="1500" height="600" loading="lazy" />

| 条件 | 关键变化时刻（秒） | 最后放置验收 |
| --- | --- | --- |
| 正常 | 7.102 VALID，此后保持 | 通过 |
| 外力推移 | 8.022 INVALID | 失败 |
| 8.0–8.4 秒静默 | 8.042 UNKNOWN → 8.402 VERIFYING → 8.662 VALID | 通过 |
| 同期重复旧正常包 | 与静默相同 | 通过 |
| 单帧错误坏观测 | 8.002 INVALID → 8.022 VERIFYING → 8.282 VALID | 通过 |
| 推移后插入单帧假正常包 | 8.202 VERIFYING → 8.222 INVALID，未重新有效 | 失败 |
| 截止边界恢复收包 | 8.042 UNKNOWN/VERIFYING → 8.302 VALID | 通过 |

静默与重送旧包具有相同结果，说明“持续收到网络包”不能替代“持续获得新观测”。推移后的单帧假正常包只能启动验证，不能凭一帧重建有效状态。

## 6. 最重要的负结果：坏观测也会触发撤销

`false-bad` 没有改变物理世界，只把 8.002 秒那一份收到的 x 坐标改成 0.4m。真实方块仍稳定，但立即撤销策略仍然进入 INVALID，并花到 8.282 秒才重新有效。

这是保守撤销的代价，不能只展示推力案例就称为“误报问题已解决”。本实现对重新建立有效性使用持续窗口，对撤销却采用单帧触发；它容忍孤立的假正常报告，却不容忍孤立的假异常报告。

下一步可以比较撤销滞回或连续异常确认，但必须同时衡量真实偏移的检测延迟。此前搬运实验已展示过这类权衡，本轮没有顺手选择一个“看起来更好”的阈值来隐藏误报。

## 7. 哪些是物理证据，哪些是传感故障

每个回合分别保存三类文件：2ms 控制与物理记录、20ms 的完整 qpos/qvel 状态，以及状态事件汇总。收到的 packet 与真实 cube 位置、速度、接触分别记录。

独立审计不用控制器或 MuJoCo，读取 21 份逐回合文件，重算状态、完成时刻、最终放置和故障时间表，并核对源码/原始文件哈希。它还验证五组物理轨迹一致：正常对四种纯传感故障，推移对推移后假正常包。这样才能说明传感故障组没有暗中改变控制结果。

九个状态边界测试加三个证据测试通过；后者包含“修改状态并重算文件哈希仍被发现”和“漏掉一个实验条件被发现”。哈希只说明文件一致，独立重算才检查部分内容是否自洽。这仍不是对物理接触力、所有故障或真实硬件的形式证明。

## 8. 从代码重跑与复核

使用具身仓库现有环境：Python 3.12、MuJoCo 3.3.7、NumPy 2.2.6。从 `hohoo-embodied-agent` 根目录执行：

```powershell
python experiments/vl01_completion_lifecycle/run.py --out evidence/MY-E11
python experiments/vl01_completion_lifecycle/audit.py evidence/MY-E11
$env:E11_EVIDENCE = (Resolve-Path evidence/MY-E11).Path
python -m unittest discover -s experiments/vl01_completion_lifecycle -p "test_*.py"
python experiments/vl01_completion_lifecycle/replay.py --evidence evidence/MY-E11
```

以上是 PowerShell 命令；其他终端用对应方式设置 `E11_EVIDENCE`。回放额外使用已有的 imageio/FFmpeg 和 Pillow；数字实验不依赖渲染。不设置该环境变量时，三个证据测试会跳过，九个状态测试仍运行。也可以将变量指向现有归档单独复核。输出目录必须不存在，保留旧结果。

关于推进物理与仅更新派生量的区别，见 [MuJoCo 官方 simulation 文档](https://mujoco.readthedocs.io/en/stable/programming/simulation.html)。本轮回放使用后者展示存档状态，没有重新模拟一条“更好看”的轨迹。

这次完成的是验收状态生命周期，完整 VL01、真机安全、退出动作与恢复预算的组合仍未完成。可以把下一阶段的接收条件写得更清楚了：既读取历史事件，也验证交接时刻的当前证据；不能只读取一个永不清零的 success。

## 修复进展 · 2026-10-07

2026-10-07 修正：先处理同一时刻的新观测再判断过期；E14 记录释放意图时刻，排除释放前采样的迟到包。20 项判定器检查及原 E11/E14 协议的 7/8 回合复跑通过独立审计。旧证据仍对应原固定版本，不据此扩大到真机或完整里程碑。

[修正版代码与回归命令](https://github.com/VirtualSelect/hohoo-embodied-agent/blob/907c10a8fb25e1cec242e335b1a52b21b122fdc6/REVIEW-FIXES-20261007.md)。
