---
title: "MuJoCo控制調參：最優候選不等於驗證通過"
description: "54個開發回合選擇參數，36個留出回合復核位置誤差與穩定完成契約。"
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

[固定程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/experiments/planar_reliability) · [原始證據](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/evidence/planar-reliability-20261011) · [實驗檔案](/labs/planar-reliability)

上一輪發現EMA能降低位置差分的噪聲，卻可能放大延遲閉環的擺動。直接宣布“濾波不好”並不充分：濾波器改變了動態響應，而控制增益還沿用舊值。本篇把濾波時間常數和PD增益一起掃描，再用沒有參與選擇的種子和條件檢查結果。

這是二維力控執行器的 **MuJoCo實際模擬**。沒有機械臂、相機、ROS2或真機。位置觀測參與控制，速度真值只用於離線驗收。

## 為什么不能只找一條漂亮曲線

控制律仍是 `F = kp*(目標-觀測位置) - kd*估計速度`，每軸限制在±5N。降低kp可能減小過沖，但也可能變慢；改變kd會改變阻尼，也會改變估計噪聲轉成力的幅度；增大EMA時間常數能平滑，卻引入更多滯後。

如果看完所有結果後挑一組成功軌跡展示，讀者不知道這個參數是不是只對那一條噪聲有效。因此協議先凍結選擇規則：只按開發集最後300ms的位置RMS均值選最小者，平分時按kp/kd/tau順序。**選擇指標與最終成功條件是兩件事。**

```text
18組參數 × 3個開發種子 → 固定選擇規則 → 選中一組
                                       ↓
                     3個新種子 × 6種條件，與舊基線比較
```

## 開發集上選中了什么

kp取20/40/80，kd取8/18，tau取20/60/120ms，共18組。開發條件固定80ms觀測延遲、3mm位置噪聲，種子7/19/41，每回合4秒；物理步長2ms、控制周期20ms。

選中結果為 **kp=20、kd=8、tau=20ms**。原基線是80、18、60ms。這裡是降低增益、縮短平滑的組合結果，不能把全部改善單獨歸功於某一個參數。

更值得保留的是：**54個開發回合沒有一個通過完整尾段契約**。選擇規則仍能挑出位置RMS更低的候選，但“最佳候選”並不等於“已經成功”。我們沒有因此調整驗收閾值。

這裡先為每個回合計算尾段位置RMS，再對同一候選的三個開發種子取均值；不是把所有物理步混在一起算一次RMS。選中參數的開發分數是1.888mm，它與下表的保留集均值3.61mm來自不同資料，不能混用。

## 留出檢查確實更好，卻仍有邊界

留出種子為73/97/131；條件擴展為0/80ms延遲與0/3/10mm噪聲。每組參數18回合，兩組共36回合。

| 參數來源 | 留出回合通過數 | 尾段位置RMS的跨回合均值 |
| --- | ---: | ---: |
| 上輪固定基線 | 3/18 | 54.70mm |
| 本輪開發集選中參數 | 7/18 | 3.61mm |

把總數拆開看：選中參數的7個通過回合中，6個來自無位置雜訊的條件。只看有雜訊的12個保留回合，基線為0/12，選中參數為1/12。位置誤差明顯降低，並不表示有雜訊觀測下已經穩定完成。

<details><summary>展開六組保留條件</summary>

| 延遲 / 位置雜訊σ | 基線通過 | 選中參數通過 |
| --- | ---: | ---: |
| 0ms / 0mm | 3/3 | 3/3 |
| 0ms / 3mm | 0/3 | 1/3 |
| 0ms / 10mm | 0/3 | 0/3 |
| 80ms / 0mm | 0/3 | 3/3 |
| 80ms / 3mm | 0/3 | 0/3 |
| 80ms / 10mm | 0/3 | 0/3 |

每格保留三個種子73/97/131的原始回合數。對同一控制器和延遲，σ=0時三份解壓CSV逐字相同，種子沒有產生新的擾動。因此選中參數的無雜訊6/6是兩個固定條件各重複三次，不是六個獨立隨機成功樣本；原7/18仍作為原始記錄計數保留。

</details>

![開發參數掃描與留出條件中的位置誤差](/img/research/20261011/controller-holdout.zh-TW.svg)

這是同一目標族、少量固定種子的對照，不是機器人泛化成功率。即使均值降至3.61mm，也仍有11個回合不滿足完整條件。驗收要求最後300ms每一個物理步同時滿足距離<15mm和速度<0.04m/s，不能用平均位置誤差代替。

控制沒有偷看真值速度，EMA使用觀測的捕獲時間差；延遲佇列只有已到達的樣本能更新控制。獨立審計從CSV重新計算估計速度、控制力和驗收，並在這個無接觸、無阻尼場景下驗證 `Δv=F*Δt/m`。

## 這次比較支援什么解釋

結果支援“舊控制器與濾波/延遲組合需要重新匹配”，不支援“kp越小越好”或“20ms適用於任何機器人”。kp/kd/tau是聯合變化，本輪沒有用單變量消融給它們分配貢獻。開發和留出都來自同一個模擬模型，尚未覆蓋質量、執行器誤差、摩擦和更復雜目標。

後兩篇分別改變通信與質量，觀察這組參數的邊界。不會把新條件再次用於選擇後，仍稱它們為“未見條件”。

### 一個能自己驗證的練習

先預測兩個結果：只用開發集能否重選出20/8/20ms？把無雜訊記錄分開後，7/18還是否足以說明抗雜訊能力？

準備好頁首指引指定的固定提交後，在具身倉庫根目錄用Python 3.12執行下面的唯讀片段。它只用標準函式庫讀取既有JSON，不安裝MuJoCo、不重跑模擬；每組先核對開發種子，參數選擇不讀取保留回合。

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

預期輸出中tau用秒、score用mm：

```text
selected 20 8 0.02 score_mm 1.888
tuning 54 passed 0
noisy_holdout baseline 0 / 12
noisy_holdout selected 1 / 12
```

再看選中參數的開發回合`000.csv.gz`（種子7）：尾段位置RMS只有1.813mm，最大速度卻是61.341mm/s，超過40mm/s門檻。這就是「選參指標更好」仍不滿足完整契約的具體反例，不是看到失敗後另換一個閾值。這個窗口的最大位置誤差也只有2.641mm，失敗來自速度項。

從CSV複算時，沿用本篇原實作的`t > 3.7 + 1e-9`：取3.702–4.000秒的150個步後狀態。它與延遲觀測篇包含3.7秒端點的151點窗口不同；不要改了取樣約定，再要求RMS逐值一致。

片段只複算既有彙總與分組，不取代下方逐行軌跡稽核。若結果不同，先檢查固定版本、開發/保留種子與分組；不要先放寬閾值。無損壓縮CSV保留每個物理步，展示曲線不能取代驗收。

## 最小重現與排錯

首次重現請展開頁首的[固定版本指引](#reading-content)，整塊執行一次。它建立新的固定版本目錄，將結果寫入`outputs/my-run`並稽核。同組三篇文章共用一份凍結協議，只需執行一次，再依各篇的證據分組查看。

準備好這個固定版本與環境後，可以在倉庫根目錄單獨執行原3項檢查：

```powershell
& .\.venv\Scripts\python.exe -m unittest discover -s experiments/planar_reliability -p "test_*.py"
```

若只想核驗既有歸檔，無需先重新模擬。在相符的固定版本與環境下執行下面的唯讀稽核，預期輸出`PASS`：

```powershell
& .\.venv\Scripts\python.exe experiments/planar_reliability/audit.py evidence/planar-reliability-20261011
```

本機Windows已驗證：Python 3.12.14 + MuJoCo 3.3.7 + NumPy 2.2.6；原歸檔153回合、306000行。其他作業系統未複測。原始碼雜湊統一LF，證據雜湊依原始位元組；不要改寫manifest掩蓋差異。頁首已說明該版本的協議參數限制，本機修訂尚未發布，原稽核通過不表示任意變更設定也有效。

若匯入失敗，先檢查安裝與執行是否都使用該目錄的`.venv`解譯器。失敗輸出保留，重跑時換新目錄。數值依協議容差複核，耗時是本機觀察，不要求重現相同速度。

程式碼與文章由AI輔助整理，結論以歸檔且可審計的實際運行記錄為限。本輪沒有新增付費模型請求，也不代表作者已親手重現或完成人工審校。
