---
title: "MuJoCo 绕障：路径上的点能过去，执行器就能过去吗？"
description: "六条实际接触轨迹对照直达、贴边和留余量路径，解释几何尺寸、跟踪误差与碰撞之间的关系。"
slug: "/embodied-ai/mujoco-obstacle-clearance"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:mujoco-obstacle-clearance", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-planar-pd"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/experiments/planar_reach) · [原始证据](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/evidence/planar-reach-20261007) · [实验档案](/labs/mujoco-obstacle-clearance)

上一节让执行器在空场景停到了目标。现在在x=0.3米处放一个矩形障碍，目标仍在x=0.6米。控制器完全不变：质量1kg、Kp=80、Kd=18，仍只输出±5N内的力。

最直观的失败是“直接冲过去”被挡住。更值得学习的是第二种失败：为球心安排一条刚好擦过障碍边缘的折线路径，球却仍卡住了。**几何路径必须考虑物体体积，执行中的跟踪误差还需要额外余量。**

## 三种路径

障碍沿x的半宽40mm，沿y的半宽分别40mm或90mm；执行器球半径35mm。

| 路径 | 中间目标 |
| --- | --- |
| direct | 直接使用终点(0.6,0) |
| corner | (0.16,h) → (0.44,h) → 终点 |
| clearance | (0.16,h+0.1) → (0.44,h+0.1) → 终点 |

h是障碍的y半宽。corner把球心高度设在障碍边界，却没有留球半径；clearance增加100mm，不宣称这是最短路径或最小安全距离。接近当前途经点15mm内才切换到下一个点。

## 为什么不是画一条漂亮折线就够了

~~~text
规划球心的线 → 与障碍边界不相交？
执行器有半径 → 需要障碍膨胀或身体碰撞检查
真实运动有惯性 → 实际轨迹可能切弯、超调或偏离线段
~~~

对于球形执行器，按半径膨胀障碍能把体积问题转成点路径问题，但还必须考虑控制误差。本文采用显式留余量的固定途经点，没有实现搜索算法、最优规划或通用碰撞检测库。

## MuJoCo实际发生了什么

每个条件运行4秒；物理接触来自MuJoCo求解，不通过代码把执行器穿过障碍。

| 障碍y半宽 | 路径 | 接触步数 | 最终目标误差 | 稳定完成 |
| --- | --- | --- | --- | --- |
| 40mm | direct | 1850 | 374.79mm | 否 |
| 40mm | corner | 1680 | 376.86mm | 否 |
| 40mm | clearance | 0 | <0.01mm | 是 |
| 90mm | direct | 1850 | 374.79mm | 否 |
| 90mm | corner | 1670 | 385.19mm | 否 |
| 90mm | clearance | 0 | <0.01mm | 是 |

接触步数是2ms记录中存在接触的样本数量，不是独立碰撞次数。卡住后持续接触会贡献很多步。终点误差也不能单独说明碰撞强度；本轮没有测力峰值或真机损伤风险。

![六条实际二维轨迹，贴边路径与有余量路径的区别](/media/practice/planar-path.svg)

两种宽度下，固定的余量路径都通过，其他四条失败。这支持“本场景要计入身体尺寸与余量”，不能推导任意地图都能安全绕行。

## 复现时怎样看控制逻辑

run.py的waypoints只决定当前目标；真正位置仍由mj_step积分。日志中的waypoint是控制器阶段，x/y是实际物理位置，不能把目标轨迹图当实际轨迹图。

图表使用CSV的x/y绘制；预期direct停在障碍左侧，corner靠边但受接触限制，clearance绕上方到终点。若出现直接穿墙，先检查geom的contype/conaffinity是否关闭，而不是据此宣布规划成功。

## 小练习与边界

把执行器半径增大但保持路径不变。先计算球心所需的最小几何高度，再考虑15mm途经点切换容差；最后运行检查接触记录。另一练习是把控制器阻尼减小，看原先无接触的路径是否仍能跟踪。

本轮没有自动寻找可行路径，没有动态障碍、机器人姿态、狭窄通道或硬件安全论证。下一篇将传感器从即时真值改成[有噪声与延迟的观测](/docs/embodied-ai/mujoco-delayed-feedback)，观察规划正确之外的另一种失败。

## 从干净目录复现

使用 Python 3.12。入口一次运行这组三个主题的对照，各篇只解读自己的子集，不把同一份记录重复当作新增回合。

~~~sh
git clone https://github.com/VirtualSelect/hohoo-embodied-agent.git hohoo-embodied-agent-study
cd hohoo-embodied-agent-study
git checkout 831789c2a1efb4564c4cfabc2298e48e16ada879
python -m pip install -r requirements-lock.txt
python experiments/planar_reach/run.py --out outputs/my-run
python experiments/planar_reach/audit.py outputs/my-run
python experiments/planar_reach/plot.py outputs/my-run
~~~

输出目录必须不存在。本机验证环境为 Windows，Linux/macOS尚未复测。不需要模型密钥或付费服务。manifest中的代码冻结提交早于上方含证据的归档提交，源码哈希对应实际执行文件。
