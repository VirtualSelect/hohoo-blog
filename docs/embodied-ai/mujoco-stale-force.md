---
title: "MuJoCo失联策略：零力不等于停止"
description: "27回合比较旧观测控制、超时置零与衰减，展示观测超时和物理制动的差别。"
slug: "/embodied-ai/mujoco-stale-force"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-controller-holdout"]
related: ["lab:planar-reliability", "project:hohoo-embodied-agent"]
---

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
| fade | 正常PD与限幅 | 已限幅的力线性衰减，200ms后为零 |

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

选择永久失联zero策略，找出 `fx/fy` 首次归零的行，再看之后的 `vx/vy`。在无摩擦、无重力模型里，速度应继续存在，审计通过 `F=m*a` 验证这一点。若你的曲线立刻停住，检查是否无意清空了状态，或场景包含额外阻尼。

选择突发丢包fade策略，核对恢复时的捕获时间：不能把旧样本的重复接收当作通信恢复。下一步若要设计制动策略，需要明确可用观测和执行器能力，不能在控制器中偷偷读取仿真真值来补齐传感器缺口。

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

若导入失败，先检查安装与运行是否使用同一个 `$py`。失败输出保留，重跑时换新目录。数值按协议容差复核，耗时是本机观察，不要求复现相同速度。

代码与文章由AI辅助整理，结论以归档且可审计的实际运行记录为限。本轮没有新增付费模型请求，也不代表作者已亲手复现或完成人工审校。
