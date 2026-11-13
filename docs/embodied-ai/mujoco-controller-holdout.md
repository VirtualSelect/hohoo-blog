---
title: "MuJoCo控制调参：最优候选不等于验证通过"
description: "54个开发回合选择参数，36个留出回合复核位置误差与稳定完成契约。"
slug: "/embodied-ai/mujoco-controller-holdout"
status: "published"
published_at: "2026-10-11"
updated: "2026-11-12"
reading_minutes: 10
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-velocity-estimation"]
related: ["lab:planar-reliability", "project:hohoo-embodied-agent"]
---

[固定代码](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/experiments/planar_reliability) · [原始证据](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/evidence/planar-reliability-20261011) · [实验档案](/labs/planar-reliability)

上一轮发现EMA能降低位置差分的噪声，却可能放大延迟闭环的摆动。直接宣布“滤波不好”并不充分：滤波器改变了动态响应，而控制增益还沿用旧值。本篇把滤波时间常数和PD增益一起扫描，再用没有参与选择的种子和条件检查结果。

这是二维力控执行器的 **MuJoCo实际仿真**。没有机械臂、相机、ROS2或真机。位置观测参与控制，速度真值只用于离线验收。

## 为什么不能只找一条漂亮曲线

控制律仍是 `F = kp*(目标-观测位置) - kd*估计速度`，每轴限制在±5N。降低kp可能减小过冲，但也可能变慢；改变kd会改变阻尼，也会改变估计噪声转成力的幅度；增大EMA时间常数能平滑，却引入更多滞后。

如果看完所有结果后挑一组成功轨迹展示，读者不知道这个参数是不是只对那一条噪声有效。因此协议先冻结选择规则：只按开发集最后300ms的位置RMS均值选最小者，平分时按kp/kd/tau顺序。**选择指标与最终成功条件是两件事。**

```text
18组参数 × 3个开发种子 → 固定选择规则 → 选中一组
                                       ↓
                     3个新种子 × 6种条件，与旧基线比较
```

## 开发集上选中了什么

kp取20/40/80，kd取8/18，tau取20/60/120ms，共18组。开发条件固定80ms观测延迟、3mm位置噪声，种子7/19/41，每回合4秒；物理步长2ms、控制周期20ms。

选中结果为 **kp=20、kd=8、tau=20ms**。原基线是80、18、60ms。这里是降低增益、缩短平滑的组合结果，不能把全部改善单独归功于某一个参数。

更值得保留的是：**54个开发回合没有一个通过完整尾段契约**。选择规则仍能挑出位置RMS更低的候选，但“最佳候选”并不等于“已经成功”。我们没有因此调整验收阈值。

这里先为每个回合计算尾段位置RMS，再对同一候选的三个开发种子取均值；不是把所有物理步混在一起算一次RMS。选中参数的开发分数是1.888mm，它与下表的留出均值3.61mm来自不同数据，不能混用。

## 留出检查确实更好，却仍有边界

留出种子为73/97/131；条件扩展为0/80ms延迟与0/3/10mm噪声。每组参数18回合，两组共36回合。

| 参数来源 | 留出回合通过数 | 尾段位置RMS的跨回合均值 |
| --- | ---: | ---: |
| 上轮固定基线 | 3/18 | 54.70mm |
| 本轮开发集选中参数 | 7/18 | 3.61mm |

把总数拆开看：选中参数的7个通过回合中，6个来自无位置噪声的条件。只看有噪声的12个留出回合，基线为0/12，选中参数为1/12。位置误差明显降低，并不表示有噪观测下已经稳定完成。

<details><summary>展开六组留出条件</summary>

| 延迟 / 位置噪声σ | 基线通过 | 选中参数通过 |
| --- | ---: | ---: |
| 0ms / 0mm | 3/3 | 3/3 |
| 0ms / 3mm | 0/3 | 1/3 |
| 0ms / 10mm | 0/3 | 0/3 |
| 80ms / 0mm | 0/3 | 3/3 |
| 80ms / 3mm | 0/3 | 0/3 |
| 80ms / 10mm | 0/3 | 0/3 |

每格保留三个种子73/97/131的原始回合数。对同一控制器和延迟，σ=0时三份解压CSV逐字相同，种子没有产生新的扰动。因此选中参数的无噪6/6是两个固定条件各重复三次，不是六个独立随机成功样本；原7/18仍作为原始记录计数保留。

</details>

![开发参数扫描与留出条件中的位置误差](/img/research/20261011/controller-holdout.zh-CN.svg)

这是同一目标族、少量固定种子的对照，不是机器人泛化成功率。即使均值降至3.61mm，也仍有11个回合不满足完整条件。验收要求最后300ms每一个物理步同时满足距离<15mm和速度<0.04m/s，不能用平均位置误差代替。

控制没有偷看真值速度，EMA使用观测的捕获时间差；延迟队列只有已到达的样本能更新控制。独立审计从CSV重新计算估计速度、控制力和验收，并在这个无接触、无阻尼场景下验证 `Δv=F*Δt/m`。

## 这次比较支持什么解释

结果支持“旧控制器与滤波/延迟组合需要重新匹配”，不支持“kp越小越好”或“20ms适用于任何机器人”。kp/kd/tau是联合变化，本轮没有用单变量消融给它们分配贡献。开发和留出都来自同一个仿真模型，尚未覆盖质量、执行器误差、摩擦和更复杂目标。

后两篇分别改变通信与质量，观察这组参数的边界。不会把新条件再次用于选择后，仍称它们为“未见条件”。

### 一个能自己验证的练习

先预测两个结果：只用开发集能否重选出20/8/20ms？把无噪记录分开后，7/18还是否足以说明抗噪能力？

准备好页首指引指定的固定提交后，在具身仓库根目录用Python 3.12运行下面的只读片段。它只用标准库读取已有JSON，不安装MuJoCo、不重跑仿真；每组先核对开发种子，参数选择不读取留出回合。

```python
import itertools
import json
import math
from pathlib import Path
from statistics import fmean

root = Path('evidence/planar-reliability-20261011')
rows = json.loads((root / 'results.json').read_text(encoding='utf-8'))
p = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))['protocol']
selection = json.loads((root / 'selection.json').read_text(encoding='utf-8'))
tuning = [r for r in rows if r['section'] == 'tuning']
scores = []
for params in itertools.product(p['kp'], p['kd'], p['tau']):
    group = [r for r in tuning if (r['kp'], r['kd'], r['tau']) == params]
    assert len(group) == len(p['dev_seeds'])
    assert {r['seed'] for r in group} == set(p['dev_seeds'])
    scores.append((fmean(r['tail_rms_m'] for r in group), *params))
score, kp, kd, tau = min(scores)
assert {'kp': kp, 'kd': kd, 'tau': tau} == selection['selected']
assert math.isclose(score, selection['dev_score_m'], rel_tol=0, abs_tol=1e-12)
print('selected', kp, kd, tau, 'score_mm', f'{score * 1000:.3f}')
print('tuning', len(tuning), 'passed', sum(r['success'] for r in tuning))
for method in ('baseline', 'selected'):
    noisy = [r for r in rows if r['section'] == 'holdout' and r['method'] == method and r['noise'] > 0]
    assert {r['seed'] for r in noisy}.isdisjoint(p['dev_seeds'])
    print('noisy_holdout', method, sum(r['success'] for r in noisy), '/', len(noisy))
```

预期输出中tau用秒、score用mm：

```text
selected 20 8 0.02 score_mm 1.888
tuning 54 passed 0
noisy_holdout baseline 0 / 12
noisy_holdout selected 1 / 12
```

再看选中参数的开发回合`000.csv.gz`（种子7）：尾段位置RMS只有1.813mm，最大速度却是61.341mm/s，超过40mm/s门槛。这就是“选参指标更好”仍不满足完整契约的具体反例，不是看到失败后另换一个阈值。这个窗口的最大位置误差也只有2.641mm，失败来自速度项。

从CSV复算时，沿用本篇原实现的`t > 3.7 + 1e-9`：取3.702–4.000秒的150个步后状态。它与延迟观测篇包含3.7秒端点的151点窗口不同；不要改了取样约定，再要求RMS逐值一致。

片段只复算既有汇总与分组，不替代下方逐行轨迹审计。若结果不同，先检查固定版本、开发/留出种子和分组；不要先放宽阈值。无损压缩CSV保留每个物理步，展示曲线不能替代验收。

## 最小复现与排错

首次复现请展开页首的[固定版本指引](#reading-content)，整块执行一次。它建立新的固定版本目录，将结果写入`outputs/my-run`并审计。同组的三篇文章共用一份冻结协议，只需运行一次，再按各篇的证据分组查看。

准备好这个固定版本和环境后，可以在仓库根目录单独运行原3项检查：

```powershell
& .\.venv\Scripts\python.exe -m unittest discover -s experiments/planar_reliability -p "test_*.py"
```

若只想核验已有归档，无需先重新仿真。在匹配的固定版本和环境下运行下面的只读审计，预期输出`PASS`：

```powershell
& .\.venv\Scripts\python.exe experiments/planar_reliability/audit.py evidence/planar-reliability-20261011
```

本机Windows已验证：Python 3.12.14 + MuJoCo 3.3.7 + NumPy 2.2.6；原归档153回合、306000行。其他操作系统未复测。源码哈希统一LF，证据哈希按原字节；不要改写manifest掩盖差异。页首已说明该版本的协议参数限制，本地修订尚未发布，原审计通过不表示任意改配置也有效。

若导入失败，先检查安装与运行是否都使用该目录的`.venv`解释器。失败输出保留，重跑时换新目录。数值按协议容差复核，耗时是本机观察，不要求复现相同速度。

代码与文章由AI辅助整理，结论以归档且可审计的实际运行记录为限。本轮没有新增付费模型请求，也不代表作者已亲手复现或完成人工审校。
