---
title: "MuJoCo失联策略：零力不等于停止"
description: "27回合比较旧观测控制、超时置零与衰减，展示观测超时和物理制动的差别。"
slug: "/embodied-ai/mujoco-stale-force"
status: "published"
published_at: "2026-10-11"
updated: 2026-11-13
reading_minutes: 10
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-controller-holdout"]
related: ["lab:planar-reliability", "project:hohoo-embodied-agent"]
---

<span id="published-correction"></span>

> **2026-11-13 修订代码已发布。** [固定版本与运行说明](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/335e756bb7e86ded9128b7c9b978636a4069fa61/experiments/planar_reliability)现可获取。下文“本地分支／尚未发布”的说明保留为2026-11-12复核时的状态；历史固定命令仍用于原实验归档，不能用于查找新修订。使用修订时，在配套仓库根目录执行`git checkout 335e756bb7e86ded9128b7c9b978636a4069fa61`，再按对应目录README运行，输出使用新目录。历史结果与AI辅助披露不变。

[固定代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/experiments/planar_reliability) · [原始证据](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/evidence/planar-reliability-20261011) · [实验档案](/labs/planar-reliability)

通信断了，控制器还在用最后一条位置与速度估计。把输出力设为零，是否就能称为安全停止？在这个无摩擦二维场景中，答案很直接：**零力意味着不再加速，不意味着速度变成零。**

本篇沿用开发集选中的控制参数，专门比较陈旧观测下的三种力策略。所有物理运动都由MuJoCo推进，没有位置传送或伪造停止结果。

## 失联检测看的是哪一个时钟

每个样本带捕获时间，收到之后才能用于控制。控制决策时刻减捕获时间得到年龄；重复使用同一个样本不会刷新这个年龄。

```text
传感器采样 → 40ms延迟队列 → 已到达样本 → 估计/控制
                                      ↓
                              当前时刻 - 捕获时刻
```

固定40ms延迟、3mm位置噪声；控制周期20ms，物理步长2ms。年龄超过100ms时才触发陈旧策略，因此100ms恰好边界仍沿用正常控制。条件有正常通信、0.4–1.0秒丢包、0.4秒后永久丢包；三种子×三条件×三策略，共27回合。

噪声在丢包时仍按固定顺序抽取，只是不把样本放入队列。这样不同策略不会因为随机数消耗顺序不同而得到另一个噪声实验。

## 三种选择，各自改变哪一步

| 策略 | 年龄≤100ms | 年龄>100ms |
| --- | --- | --- |
| hold | 正常PD与限幅 | 继续按最后观测算PD |
| zero | 正常PD与限幅 | 力直接置零 |
| fade | 正常PD与限幅 | 已限幅的力衰减至观测年龄200ms |

这里的200ms仍从**样本捕获时刻**算起，不是“发现陈旧后再等200ms”。年龄超过100ms后，已限幅的力乘以 `max(0, (0.200-age)/0.100)`；衰减区间是年龄100–200ms。浮点计算在边界可能留下约`1e-15 N`的残值，核对fade时应使用数值容差，不能靠`fx == 0`寻找边界。

hold不是保持当前位置，它保持的是使用旧信息的控制规则。当前位置已经变了，旧观测误差却还在，控制可能持续向错误方向推。

zero和fade都不是闭环刹车。它们没有新速度观测，也不加入未知的摩擦或制动力模型。程序不会为了得到“停止”图像而把 `qvel` 直接清零。

## 短暂丢包和永久失联，结论不同

下表为三个种子的最后300ms位置RMS均值，单位毫米，不是成功率：

| 通信条件 | hold | zero | fade |
| --- | ---: | ---: | ---: |
| 正常 | 2.04 | 2.04 | 2.04 |
| 0.4–1.0s突发丢包 | 2.02 | 2.06 | 2.05 |
| 0.4s后永久失联 | **16,025.96** | 2,748.98 | 2,370.92 |

![永久失联下的实际仿真位置轨迹](/img/research/20261011/stale-force.zh-CN.svg)

正常组结果完全相同，因为样本年龄没有跨过阈值。短暂丢包后，重新获得观测，尾段位置误差又变小；但表格只描述尾段，不应掩盖中间路径。

永久失联时，hold继续推着系统走远；zero停止施力后仍按已有动量滑行；fade改变了力的撤出过程，也没有制动保证。本轮全部27回合都未满足“位置和速度逐步同时达标”的完整契约，包含位置误差看上去很小的正常组。不能把任何一列称作安全赢家。

## 为什么要保留这个看上去简单的反例

“发送零命令”“控制器停止运行”“执行器进入制动模式”“物体已经停稳”是四种不同事件。软件只验证了第一个，不能把文案写成最后一个。实际机器人还要考虑执行器语义、通信看门狗、机械制动、重力、接触和认证流程；本场景没有这些机制。

这里的100/200ms是冻结教学参数，不是安全标准。换一个质量、目标、初始速度或故障相位，位移就会变。仅测0.4秒这个丢包起点也不足以界定最坏停止距离。

### 读轨迹的小练习

不能直接搜索整条轨迹的“第一次零力”：启动时尚未收到观测，力和速度本来都是零。应先选永久失联、zero策略，再找**已有有效样本且年龄超限的控制行**，最后观察力与速度。

CSV的`t`记录的是物理步结束时刻；这行命令在该步开始时决定，所以控制时刻为 `t - 0.002`。只在`control_tick=1`的行检查年龄，不能把步后的状态时间直接当作控制判定时间。

在本文固定提交的工程根目录，用Python 3.12运行下面的只读片段即可，不需要启动MuJoCo或重新仿真：

```python
import csv
import gzip
import json
from pathlib import Path

root = Path("evidence/planar-reliability-20261011")
protocol = json.loads((root / "manifest.json").read_text(encoding="utf-8"))["protocol"]
records = json.loads((root / "results.json").read_text(encoding="utf-8"))
record = next(r for r in records if r["section"] == "dropout"
              and r["dropout"] == "permanent"
              and r["policy"] == "zero" and r["seed"] == 73)
with gzip.open(root / record["trace"], "rt", encoding="utf-8") as stream:
    rows = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(stream)]
dt = protocol["timestep"]
stale = next(r for r in rows if r["control_tick"] == 1
             and r["capture_t"] >= 0
             and r["t"] - dt - r["capture_t"] > protocol["fresh_limit"] + 1e-9)
later = rows[rows.index(stale) + round(0.1 / dt)]
for label, row in (("startup", rows[0]), ("stale", stale), ("later", later)):
    print(label, row["t"], row["fx"], row["vx"])
```

这会选中`111.csv.gz`，依次打印启动、首次年龄超限控制、再过100ms的记录。下表对`vx`保留六位小数：

| CSV t/s | fx/N | vx/(m/s) |
| ---: | ---: | ---: |
| 0.002 | 0 | 0 |
| 0.502 | 0 | 0.853823 |
| 0.602 | 0 | 0.853823 |

最后一个样本捕获于0.380秒；0.480秒判定年龄恰为100ms，尚未触发，0.500秒才到120ms，对应步后日志0.502秒。力归零后，速度没有归零，才是这里要读出的反例。原独立审计另从逐步记录验证`F=m*a`；若自己的轨迹瞬间停住，应检查额外阻尼或是否清空了状态，不能用启动时的零速度代替失联后的结果。

选择突发丢包fade策略，核对恢复时的捕获时间：不能把旧样本的重复接收当作通信恢复。下一步若要设计制动策略，需要明确可用观测和执行器能力，不能在控制器中偷偷读取仿真真值来补齐传感器缺口。

## 修改配置前，先确认执行语义

上面的固定提交用于复现原冻结协议。其中`fresh_limit/fade_end`虽然保存在JSON里，控制函数仍写死100/200ms；物理步长、执行器限幅、位置/速度验收和开发集条件也有相似问题。原协议默认值与这些常数一致，因此原结果表仍有效；**单改这个提交的protocol.json，并不能保证改变了实际实验。**

本地已修订runner、控制与独立审计：参数同时用于物理执行和验收，非法步长组合会在运行前拒绝。默认153回合重新运行后，结果与全部解压CSV仍和原归档一致。此修订尚未发布；以上固定链接和下面命令仍指向历史版本。要研究新的阈值，需先取得匹配的新代码，用新目录运行，不能改旧manifest或把回归用例当成研究成果。

## 最小复现与排错

从干净检出目录运行以下PowerShell命令。输出目录必须尚不存在。同组的三篇文章共用一份冻结协议，只需运行一次，再按各篇的证据分组查看。

```powershell
git clone https://github.com/VirtualSelect/hohoo-embodied-agent.git hohoo-embodied-agent-study
cd hohoo-embodied-agent-study
git checkout 1d1faab57e20b352761e9abc736c6d277b505e6b
python -m venv .venv
$py = '.\.venv\Scripts\python.exe'
& $py -m pip install -r requirements-lock.txt
& $py -m unittest discover -s experiments/planar_reliability -p "test_*.py"
& $py experiments/planar_reliability/run.py --out outputs/reliability-my-run
& $py experiments/planar_reliability/audit.py outputs/reliability-my-run
```

本机Windows已验证：Python 3.12.14 + MuJoCo 3.3.7 + NumPy 2.2.6；3项单测、153回合、306000行；独立审计预期输出 `PASS`。其他操作系统未复测。若只想核验归档，不重新实验，可将审计参数换为 `evidence/planar-reliability-20261011`。源码哈希统一LF，证据哈希按原字节；不要改写manifest掩盖差异。

若导入失败，先检查安装与运行是否使用同一个 `$py`。失败输出保留，重跑时换新目录。本文的秒数是仿真时间，不是电脑执行脚本所需的墙钟时间；运动轨迹按冻结协议和数值容差复核。

代码与文章由AI辅助整理，结论以归档且可审计的实际运行记录为限。本轮没有新增付费模型请求，也不代表作者已亲手复现或完成人工审校。
