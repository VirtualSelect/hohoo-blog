---
title: "MuJoCo 第二场景：目标位置相同，为什么有的控制器停不住？"
description: "用二维力控执行器比较质量与PD阻尼，记录饱和、超调和稳定完成，避免把经过目标当作任务成功。"
slug: "/embodied-ai/mujoco-planar-pd"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:mujoco-planar-pd", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-qualified-completion"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/experiments/planar_reach) · [原始证据](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/evidence/planar-reach-20261007) · [实验档案](/labs/mujoco-planar-pd)

前十四轮主要围绕抓取流程中的观测、恢复与完成契约。本轮换一个更容易看清控制规律的场景：一个有质量的球形执行器，可以沿x/y两个轴移动，用两个motor施加力，从(0,0)到(0.6,0)。

这里没有机械臂关节链、逆运动学、抓取、视觉或ROS2。它是第二个真实运行的MuJoCo教学场景，不把M4/M5或完整VL01标成完成。目标是先回答一个基础问题：**朝目标施力，为什么会冲过去，甚至一直来回摆？**

## 从误差到力，中间隔着动力学

本轮控制律为 F = Kp × (目标位置−观测位置) − Kd × 观测速度。Kp=80固定，Kd比较0、18、36；质量比较1kg和2kg。每轴力限制±5N，物理步长2ms，控制每20ms更新一次，运行4秒。

~~~text
位置目标 → 位置误差 × Kp ─┐
观测速度 → 速度 × (-Kd) ──┼→ 限幅±5N → MuJoCo动力学 → 新位置/速度
                         └───────────────────────────────↑
~~~

只有P项时，靠近目标意味着力变小，却不意味着速度已经为零。穿过目标后才产生反向力，可能已经积累了很大动量。D项根据速度提前“刹车”；过大的D也可能让响应变慢。质量变化则改变同样力下的加速度。

经典连续线性模型中，临界阻尼与2√(质量×Kp)相关。但本例还有限幅和离散采样，不应直接把这个公式当成所有条件的最优参数。本篇只比较三个冻结值，不做自动调参。

## 怎样判断真的停住

不是最后一帧碰到目标就算通过。最后0.3秒的每条记录都需要位置误差小于15mm、速度小于40mm/s。CSV记录每2ms真值、施力、观测捕获时刻和饱和标记，可独立重算。

| 质量 | Kd | 最大x超调 | 最终位置误差 | 稳定完成 |
| --- | --- | --- | --- | --- |
| 1kg | 0 | 740.6mm | 677.95mm | 否 |
| 1kg | 18 | 0mm | <0.01mm | 是 |
| 1kg | 36 | 0mm | 0.06mm | 是 |
| 2kg | 0 | 630.9mm | 569.47mm | 否 |
| 2kg | 18 | 74.0mm | <0.01mm | 是 |
| 2kg | 36 | 0mm | 0.04mm | 是 |

![从实际CSV生成的位置轨迹，比较质量和阻尼](/media/practice/planar-gain.svg)

无阻尼两组未稳定；相同Kd=18在更大质量时出现明显超调，虽然4秒末仍通过。不能只比较最终误差，也不能把同一固定场景的六次运行说成泛化成功率。

## 读scene.xml：动作到底是什么

两个slide joint约束平面运动，motor输入是力；不是把qpos瞬移到目标。球半径35mm，场景重力为零，基础关节阻尼为零，因而更容易隔离控制器的速度反馈。Kp与Kd写在Python控制器，限力同时由程序和MuJoCo actuator范围约束。

MuJoCo配置含义可查[3.3.7 XML参考](https://mujoco.readthedocs.io/en/3.3.7/XMLreference.html)。如果把motor换成position actuator，接口含义已经改变，不能继续用“动作值等于牛顿”的解释。

## 练习、复现与局限

打开01-gain.csv，在前几行核对力是否饱和；接近目标时再看速度与力的方向。把质量改大，在新目录运行，先预测是否超调，再看轨迹。不要用缩短观察时长让困难案例“没来得及失败”。

本轮全状态来自仿真真值，控制参数固定，没有机器人摩擦辨识和硬件验证。若导入失败，检查同一个Python环境是否安装锁定依赖；数值运行不需要OpenGL。下一篇保持控制器不变，加入[障碍与执行器尺寸](/docs/embodied-ai/mujoco-obstacle-clearance)。

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
