---
title: "MuJoCo 延迟观测：知道旧位置，能预测现在吗？"
description: "24条配对轨迹比较即时/80ms延迟、位置噪声和常速度外推，保留超调下降但任务仍失败的结果。"
slug: "/embodied-ai/mujoco-delayed-feedback"
status: "published"
published_at: "2026-10-07"
updated: "2026-11-12"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:mujoco-delayed-feedback", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-obstacle-clearance"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/experiments/planar_reach) · [原始证据](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/evidence/planar-reach-20261007) · [实验档案](/labs/mujoco-delayed-feedback)

控制器调得稳定、路径也能走通，是否就足够？前两篇用的是即时仿真真值。这次移除障碍，保持同一控制器，只改变它什么时候看见位置，以及看到的位置是否带噪。

对照包括0/80ms延迟、0/10mm高斯位置噪声，以及“直接使用旧观测”和“用旧速度外推到现在”。三个固定种子7、19、41，总计24条轨迹。**外推降低了一部分超调，但所有80ms延迟条件仍未达到本轮稳定完成标准。**

## 先分清三个时间

~~~text
capture：仿真状态被采样
    + 80ms
delivery：这个包对控制器可见
decision：控制器在当前20ms周期使用最后可用包
~~~

新包还没到达时，控制器不能偷偷读取当前真值。CSV同时记录物理位置和observed位置，capture_t应早于当前时刻。第一个观测到达前输出零力；这是协议的一部分，会影响运动起始时间。

位置噪声只加到传给控制器的报告，不改变物理真值。旧速度来自同一捕获时刻的仿真真值，且没有速度噪声，是偏乐观的传感器假设；并不是实现了视觉测速。

## 两种估计器

hold直接使用最后到达的位置，直到下个包出现。predict使用：

~~~text
estimated_position = captured_position
                   + captured_velocity × (now - capture_time)
~~~

两种策略的D项都使用旧速度。predict没有更新速度、没有加速度模型，也没有Kalman滤波。控制力在变化时，常速度近似本来就会偏离真实运动；延迟还会让速度反馈滞后。

## 实测结果不能只看一个数

| 延迟 / 噪声 | hold稳定通过 | predict稳定通过 |
| --- | --- | --- |
| 0ms / 无噪声 | 3/3 | 3/3 |
| 0ms / 10mm | 1/3 | 1/3 |
| 80ms / 无噪声 | 0/3 | 0/3 |
| 80ms / 10mm | 0/3 | 0/3 |

无噪声的三种子产生相同条件，不是三个独立随机样本。噪声组三种子也只是敏感性检查，不是带置信度的成功率。

80ms无噪声时，最大超调从hold的210.7mm降到predict的52.0mm；但最终误差由2.79mm变为26.76mm，两者都没有满足“最后0.3秒始终误差<15mm且速度<40mm/s”。只展示超调下降就宣布恢复成功，会误导读者。

0ms带噪声时，部分失败轨迹的最终位置误差只有1.36mm或0.30mm，仍未通过稳定窗口。它说明“最后看起来很准”与“持续稳定”不同。应同时看整个尾段的位置和速度，而非挑一帧。

![固定种子7的实际目标误差轨迹，比较延迟、噪声与外推](/media/practice/planar-observation.svg)

图示仅种子7，全部种子保存在CSV，不用图中一条线代替全部结果。

## 怎样复核这个结论

audit.py独立检查每行capture_t不晚于物理时刻，再从x/y/vx/vy重算最后窗口。不要用控制器的估计位置替代真值验收，否则估计器可能“自己证明自己成功”。

### 在尾段找到第一次速度越界

固定选原归档中的`19-observation.csv`：0ms延迟、10mm位置噪声、hold、种子19。先预测：如果终点位置和速度都合格，为什么`success`仍是false？

先准备好页首指引指定的固定提交，再在具身工程根目录运行这个只读片段。它只用Python标准库读取已有CSV，不用安装MuJoCo或NumPy，也不重跑仿真；完整归档校验仍用下方audit命令。

```python
import csv
import json
import math
from pathlib import Path

root = Path("evidence/planar-reach-20261007")
protocol = json.loads((root / "manifest.json").read_text(encoding="utf-8"))["protocol"]
records = json.loads((root / "results.json").read_text(encoding="utf-8"))
record = next(r for r in records if r["config"]["family"] == "observation"
              and r["config"]["mode"] == "hold" and r["config"]["delay"] == 0
              and r["config"]["noise"] == 0.01 and r["config"]["seed"] == 19)
with (root / record["file"]).open(encoding="utf-8", newline="") as stream:
    rows = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(stream)]
def distance(r):
    return math.hypot(r["x"] - protocol["goal"][0], r["y"] - protocol["goal"][1])
def speed(r):
    return math.hypot(r["vx"], r["vy"])
limits = protocol["success"]
tail = [r for r in rows if r["t"] >= protocol["duration"] - limits["last_seconds"] - 1e-9]
first = next(r for r in tail if distance(r) >= limits["distance_m"] or speed(r) >= limits["speed_m_s"])
print(record["file"])
for label, row in (("first_failure", first), ("last", rows[-1])):
    print(label, f'{row["t"]:.3f}', f'{distance(row) * 1000:.3f}', f'{speed(row) * 1000:.3f}')
print("tail", len(tail), "position_failures", sum(distance(r) >= limits["distance_m"] for r in tail),
      "speed_failures", sum(speed(r) >= limits["speed_m_s"] for r in tail))
```

预期选中`19-observation.csv`，输出中的位置误差和速度分别用mm、mm/s表示：

| 记录 | t/s | 位置误差/mm | 速度/(mm/s) |
| --- | ---: | ---: | ---: |
| 尾段第一次越界 | 3.714 | 3.944 | 40.392 |
| 最后一行 | 4.000 | 1.356 | 12.325 |

终点两项都合格，却不能撤销3.714秒已经发生的速度越界。这个尾段的151个状态样本中，位置越界0个、速度越界24个。代码沿用原审计的`t >= 3.7 - 1e-9`，包含窗口两端；151是采样点数，时间区间仍是0.3秒。`1e-9`仅处理时间的浮点表示，位置15mm与速度40mm/s的阈值没有放宽。

这里定位的是已有失败的原因，不把新一轮仿真当作完成练习的前提。若继续改变延迟，应使用新输出目录并保留独立协议与全部结果。

## 下一步值得验证，而不是直接宣称实现

可以研究带加速度的估计、速度噪声、状态滤波、降低控制增益或基于观测年龄停止。但每一种都引入新假设与参数，需要成组对照。当前predict不是鲁棒控制或安全保证；二维执行器也不能代表真实机械臂。

本轮把第二场景、参数、轨迹与负结果完整公开，后续应先解释具体失败机制，再决定增加哪一种估计器，避免把“算法名更多”当作能力提升。

后续已发表的[速度估计篇](/docs/embodied-ai/mujoco-velocity-estimation)进一步比较位置差分与EMA；[开发集与留出集调参](/docs/embodied-ai/mujoco-controller-holdout)再检查增益和滤波参数的组合。两篇都保留了失败与适用边界；这里提出的加速度模型和其他新控制策略仍需另行验证。

## 从干净目录复现

首次复现请展开页首的[固定版本指引](#reading-content)，整块执行一次。它使用Python 3.12虚拟环境，在新的带提交编号的目录中运行36回合，并审计`outputs/my-run`。这组三篇文章解释同一批记录的不同子集，不需要为每篇再次克隆或重新仿真。

若已有匹配的固定版本与环境，只想核对原归档，可在该仓库根目录运行下面的只读审计；它也是前面练习的证据来源：

```powershell
& .\.venv\Scripts\python.exe experiments/planar_reach/audit.py evidence/planar-reach-20261007
```

如已按页首流程生成新结果，可以为这份新结果绘图。此命令读取`outputs/my-run`，并在其中写入图像；不用于只读核验原归档：

```powershell
& .\.venv\Scripts\python.exe experiments/planar_reach/plot.py outputs/my-run
```

本机验证环境为Windows，Linux/macOS尚未复测。不需要模型密钥或付费服务。重跑时另用新目录，不覆盖已有结果。manifest中的代码冻结提交早于上方含证据的归档提交，源码哈希对应实际执行文件。
