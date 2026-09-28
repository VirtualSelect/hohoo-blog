---
title: 具身智能实践（一）：在 MuJoCo 中抓起方块，再故意抓偏
description: 用真实物理接触完成一次抓取放置，再对照0、25、50 mm目标偏移，保存视频、状态轨迹和明确的成功判定。
slug: /embodied-ai/mujoco-first-pick-place
status: published
published_at: '2026-09-28'
updated: '2026-09-28'
reading_minutes: 18
learning_step: first-simulation
domain: embodied-ai
article_kind: tutorial
difficulty: beginner
related: ["project:hohoo-embodied-agent", "doc:embodied-ai/openvla-action-pipeline"]
---

让一个物体在画面里移动并不难。更值得弄明白的是：它为什么移动？夹爪有没有真正接触方块？发出了正确的动作，任务为什么仍然会失败？

这次从一个小而完整的物理任务开始：让夹爪抓起红色方块，搬到蓝色盒子上方，松手，并确认方块落定。然后只改一个条件——拾取目标向右偏25 mm或50 mm——观察相同程序会发生什么。

:::note 实际运行范围
实验于北京时间2026-09-28在本机使用 MuJoCo 3.3.7 执行。使用教学级笛卡尔夹爪，不是商用机械臂；没有真实硬件、视觉识别、LLM规划、ROS2或策略训练。它是具身学习的控制与数据基础练习，不是“已经训练出了具身智能”。
:::

## 1. 先看真正发生过的过程

下面是无偏移组的第一回合原始仿真画面，约9.2秒。点击播放才加载视频，没有自动播放。

<video controls preload="none" playsinline src="/media/practice/vl01-baseline.mp4" poster="/media/practice/vl01-lift.png" width="960" height="640" aria-label="MuJoCo 无偏移抓取放置：夹起红块，搬运，放入蓝盒">当前浏览器无法播放，请使用下面的原始视频链接。</video>

文字替代：夹爪张开并下降到红色方块两侧，闭合后把方块抬离地面；搬运到蓝色盒子上方，下降、松手，再上退，方块留在盒内。视频无音轨。

[下载原始视频](https://github.com/VirtualSelect/hohoo-embodied-agent/raw/17144c47a2294f157420946b15f78c49d8d17dd5/evidence/vl01-20260928-v2/bias-000mm-run-1/episode.mp4) · [独立工程与复现说明](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/17144c47a2294f157420946b15f78c49d8d17dd5/experiments/vl01_pick_place) · [九次回合的完整证据](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/17144c47a2294f157420946b15f78c49d8d17dd5/evidence/vl01-20260928-v2)

视频只是观察入口。成功与否由保存的状态和规则判断，不能只看“好像抓起来了”。

## 2. 为什么第一课不用复杂机械臂？

本例的夹爪有五个可控制关节：

- x、y、z三个平移关节，让夹爪在世界中移动。
- 左、右两个夹指关节，向中间闭合。

这种结构常称为笛卡尔或直角坐标机构。它让“向右移动2厘米”可以直接对应一个平移关节目标，暂时省去多关节机械臂的逆运动学。

代价也很明确：这个模型没有真实机械臂的关节耦合、自碰撞、线缆、传动与工作空间限制，不能拿它证明真机抓取性能。我们用这个简化换来的是，第一轮可以把注意力放在**动作、物理接触、观察和成功定义**上。

场景中红色方块边长40 mm、质量0.05 kg；蓝盒底板表面在z=0.006 m，方块落定后中心约在z=0.026 m。方块有自由关节，会受重力和接触影响。程序没有把方块焊到夹爪上，也没有在搬运过程中改写它的位置。

## 3. 从 Java 调接口，换到仿真循环

你已经熟悉“构造请求 → 发送 → 读取响应”。仿真中也需要明确输入与输出，但动作会改变下一时刻的环境：

```text
控制目标 → 执行器施力 → 物理步进 → 新状态
   ↑                                ↓
   └──────── 下一步控制与记录 ────────┘
```

这里先区分三个概念：

| 概念 | 本例里的具体内容 | 容易混淆的地方 |
| --- | --- | --- |
| 状态 state | 关节位置/速度、方块位置、接触 | 模拟器内部可以直接读取，不代表真机传感器都能知道 |
| 观测 observation | 本次记录选取的位置、速度、接触和画面 | 是状态的一部分或变换，不等于完整世界 |
| 动作 action | x/y/z及两指的位置目标 | 不是“把方块坐标直接设为终点” |

本轮直接读模拟器状态，没有从相机图像中识别方块。把这一步叫“视觉感知成功”就会越过证据范围。

MuJoCo 的 `MjModel` 保存模型配置，`MjData` 保存运行状态。核心循环的意思是：

```python
data.ctrl[:] = [
    target_x,
    target_y,
    target_z - 0.16,
    grip_target,
    grip_target,
]
mujoco.mj_step(model, data)
mujoco.mj_forward(model, data)

cube = data.body("cube").xpos.copy()
hand = data.site("grip_center").xpos.copy()
```

`mj_step` 推进动力学；随后刷新派生量，使记录的世界坐标与本次步进后的 `qpos` 对齐。`copy()` 很关键：保存数组引用可能让过去的观测随下一次步进一起改变。

## 4. 为什么 z 目标要减0.16？

场景把夹爪父级位置设在世界高度0.16 m。它的z关节位移是相对这个基点的量：

```text
夹爪世界高度 = 基点高度 + z关节位移
0.024 m      = 0.160 m + (-0.136 m)
```

想让夹爪中心下降到0.024 m，应给z执行器 `-0.136`，不是 `0.024`。后者会让夹爪往更高处走。

本例约定世界系+z向上，长度单位全部是米。两个夹指虽然都接收正的闭合量，轴方向却相反：左指沿+x移动，右指沿−x移动，才能相向靠近。

这就是读具身代码时应优先问的三个问题：**数字是什么单位？属于哪个坐标系？表示位置、位移还是力？**

位置执行器接收关节目标，通过模型里的增益与阻尼产生作用力；目标和实际位置可以不同。能设置目标，不意味着环境一定实现了目标。

## 5. 九个阶段构成一个回合

高层控制使用事先固定的阶段时间表：

| 阶段 | 时长 | 目标 |
| --- | --- | --- |
| approach | 1.0 s | 张开夹爪，移动到拾取点上方 |
| descend | 1.0 s | 降到方块两侧 |
| close | 0.8 s | 两指闭合 |
| lift | 1.2 s | 抬到0.18 m |
| transfer | 1.5 s | 平移到蓝盒上方 |
| lower | 1.0 s | 降到0.04 m |
| release | 0.7 s | 松开夹指 |
| retreat | 1.0 s | 夹爪上退 |
| settle | 1.0 s | 等待方块落定并观察 |

阶段之间用平滑插值过渡目标，减少位置指令突然跳变。这里没有训练得到的策略。

关节执行器有位置反馈，但**高层阶段表没有“没抓住就再试”的闭环**。因此偏移组会出现空夹爪继续走完搬运流程：控制程序执行完了，任务却没有完成。这两个事实可以同时成立。

## 6. 在运行前定义什么叫成功

本例把成功拆成一段历史条件和一段最终条件：

1. 方块中心曾经高于0.10 m，确认确实离开了地面。
2. 最后0.5秒的所有记录中，方块x、y分别距盒中心小于0.045 m。
3. 同一段记录中，方块中心z距0.026 m小于0.006 m。
4. 线速度小于0.02 m/s。
5. 夹指与方块无接触。
6. 没有 MuJoCo 警告或非有限状态。

最后的条件每20 ms记录一次，因此是**采样窗口上的判定**，不宣称连续时间绝无瞬间接触。盒内判断使用保守的中心位置容差，未实现适用于任意旋转物体的完整几何包含测试。

为什么这么麻烦？只看高度可能把“抬起来但一直夹着”算成功；只看盒内位置又可能把“初始就放在盒里”算成功。测试专门覆盖这两种误判。

## 7. 固定其他条件，只改拾取偏移

三组的拾取目标x偏移分别为0、25、50 mm，方块位置和盒子位置不变。放置目标始终相同。场景、摩擦、质量、执行器、时间表与成功规则保持一致。

每组运行三次，初始状态完全相同，没有随机扰动。三次相同结果说明这一设置下可以重复运行，**不是三个独立随机样本，也不构成通用抓取成功率**。

物理步长2 ms，即500 Hz；每10步记录一次状态，即50 Hz；视频25 FPS。每回合9.2秒，包含460条采样轨迹。

## 8. 真正观察到了什么

以下来自正式记录v2，每组展示第一回合数值；同组另外两回合结果相同：

| 拾取偏移 | 是否抬过0.10 m | 最终方块到盒中心XY距离 | 满足全部成功条件的回合 |
| --- | --- | --- | --- |
| 0 mm | 是 | 0.673 mm | 3 / 3 |
| 25 mm | 否 | 260.337 mm | 0 / 3 |
| 50 mm | 否 | 262.063 mm | 0 / 3 |

这里的XY距离是**方块到盒子中心**的距离，不是夹爪定位误差，更不是商用机械臂的重复定位精度。0.673 mm只能描述这个教学场景的这组运行。

<img src="/media/practice/vl01-trajectories.png" alt="三组真实轨迹：无偏移组方块高度上升并靠近盒中心；25和50毫米组保持近地面，未完成搬运。" width="1500" height="1020" loading="lazy">

上图由保存的CSV生成，每组画一回合。上半图看方块有没有被抬起，下半图看它有没有靠近盒中心。它们合在一起，比只看夹爪运动更接近任务结果。图表仍不能取代松手、落定等其他条件。

25 mm偏移组的对应过程：

<video controls preload="none" playsinline src="/media/practice/vl01-bias25.mp4" poster="/media/practice/vl01-bias25-lift.png" width="960" height="640" aria-label="MuJoCo 25毫米偏移：夹爪未抬起方块，仍继续执行搬运阶段">当前浏览器无法播放，请使用原始证据目录中的视频。</video>

文字替代：下降位置偏向一侧，方块发生小幅移动；夹爪上抬时没有带走方块，之后仍按固定时间表移动到蓝盒并松手。方块留在原区域，任务失败。视频无音轨。

**观察**是“方块没有抬起”。结合场景和接触记录，可以进一步研究偏移如何改变夹持，但不能仅凭一次失败就断言所有机器人在25 mm偏差下都会失败。本轮也没有测出“最大容错偏移”，因为只运行了三个离散点。

## 9. 在自己的电脑上复现

已验证环境：Windows x64、Python 3.12、MuJoCo 3.3.7。先进入独立仓库：

```powershell
git clone https://github.com/VirtualSelect/hohoo-embodied-agent.git
cd hohoo-embodied-agent
git checkout 17144c47a2294f157420946b15f78c49d8d17dd5
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
```

先跑契约测试，再运行实验：

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s experiments/vl01_pick_place -p test_contract.py
.\.venv\Scripts\python.exe experiments/vl01_pick_place/run.py --out outputs/my-first-run --render
.\.venv\Scripts\python.exe experiments/vl01_pick_place/analyze.py outputs/my-first-run
```

没有可用OpenGL环境时，可以先去掉 `--render`，验证物理与轨迹部分。Linux/macOS需要调整虚拟环境解释器路径，本轮没有在这些系统实测。

输出目录必须不存在，程序拒绝覆盖旧证据。安装之后不需要模型API，也不下载训练权重。单次运行会生成：

| 产物 | 作用 |
| --- | --- |
| manifest.json / protocol.json | 版本、实际代码提交、文件哈希和固定协议 |
| trajectory.csv | 带阶段、动作目标、物体/夹爪位置、速度和接触的50Hz记录 |
| states.jsonl | 保存的qpos、qvel、ctrl，可独立重放 |
| events.json | 各阶段开始时间与目标 |
| summary.json | 本回合结果与失败类型 |
| episode.mp4 / 阶段PNG | 每组第一回合的实际画面 |
| audit.json / trajectories.png | 从保存轨迹复核结果并生成图表 |

高度峰值在500Hz运行循环中计算，图像来自50Hz采样；不要把两者的小数位当作完全相同精度。

需要回看保存的轨迹时：

```powershell
.\.venv\Scripts\python.exe experiments/vl01_pick_place/replay.py evidence/vl01-20260928-v2/bias-000mm-run-1/states.jsonl --out outputs/replay.mp4
```

这次渲染读取已经保存的状态，**属于重放，不是额外一次策略实验**。

## 10. 这次完成了什么，下一次验证什么？

已经完成：一个能实际运行的仿真场景、一个固定控制器、九次回合记录、失败对照、视频与可重放轨迹。它复用已有VL01，不再创建一份同名实验规划。

尚未完成：视觉定位、状态估计、失败后重新规划、ROS2、真实机械臂、数据集训练和Sim2Real。整个VL01路线和M4/M5不因这个最小案例自动变成“全部完成”。

下一次最值得验证的改动是：**在lift结束后检查方块是否真的抬起；如果没有，就停止搬运并报告失败。** 先让高层控制使用已经能读取的反馈，再讨论更复杂的智能。

<details><summary>自检：把夹爪的位置直接设成目标，是不是就完成了控制？</summary>

还没有。目标、实际夹爪位置和方块状态是三个不同的量。本例修改的是执行器目标，物体通过接触和动力学运动，成功还要根据任务条件独立判定。

</details>

<details><summary>自检：为什么这次可以不调用大模型？</summary>

这个固定任务可以用明确的阶段程序完成。先验证动作、观测和物理执行边界，后面再让模型选择任务或工具。使用了模拟器本身不等于训练了智能策略。

</details>

## 参考资料

- [MuJoCo 3.3.7 建模说明](https://mujoco.readthedocs.io/en/3.3.7/modeling.html)：用于核对MJCF、局部坐标和关节模型。
- [MuJoCo Python接口](https://mujoco.readthedocs.io/en/3.3.7/python.html)：MjModel/MjData、步进、数组引用与渲染接口。
- [本次场景、协议及程序](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/17144c47a2294f157420946b15f78c49d8d17dd5/experiments/vl01_pick_place)：本文数值与限制以固定版本和原始记录为准。
