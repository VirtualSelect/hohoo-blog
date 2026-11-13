---
title: "MuJoCo 延遲觀測：知道舊位置，能預測現在嗎？"
description: "24條配對軌跡比較即時/80ms延遲、位置噪聲和常速度外推，保留超調下降但任務仍失敗的結果。"
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

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/experiments/planar_reach) · [原始證據](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/evidence/planar-reach-20261007) · [實驗檔案](/labs/mujoco-delayed-feedback)

控制器調得穩定、路徑也能走通，是否就足夠？前兩篇用的是即時仿真真值。這次移除障礙，保持同一控制器，只改變它什麼時候看見位置，以及看到的位置是否帶噪。

對照包括0/80ms延遲、0/10mm高斯位置噪聲，以及“直接使用舊觀測”和“用舊速度外推到現在”。三個固定種子7、19、41，總計24條軌跡。**外推降低了一部分超調，但所有80ms延遲條件仍未達到本輪穩定完成標準。**

## 先分清三個時間

~~~text
capture：仿真狀態被采樣
    + 80ms
delivery：這個包對控制器可見
decision：控制器在當前20ms周期使用最後可用包
~~~

新包還沒到達時，控制器不能偷偷讀取當前真值。CSV同時記錄物理位置和observed位置，capture_t應早于當前時刻。第一個觀測到達前輸出零力；這是協議的一部分，會影響運動起始時間。

位置噪聲只加到傳給控制器的報告，不改變物理真值。舊速度來自同一捕獲時刻的仿真真值，且沒有速度噪聲，是偏樂觀的感測器假設；并不是實現了視覺測速。

## 兩種估計器

hold直接使用最後到達的位置，直到下個包出現。predict使用：

~~~text
estimated_position = captured_position
                   + captured_velocity × (now - capture_time)
~~~

兩種策略的D項都使用舊速度。predict沒有更新速度、沒有加速度模型，也沒有Kalman濾波。控制力在變化時，常速度近似本來就會偏離真實運動；延遲還會讓速度反饋滯後。

## 實測結果不能只看一個數

| 延遲 / 噪聲 | hold穩定通過 | predict穩定通過 |
| --- | --- | --- |
| 0ms / 無噪聲 | 3/3 | 3/3 |
| 0ms / 10mm | 1/3 | 1/3 |
| 80ms / 無噪聲 | 0/3 | 0/3 |
| 80ms / 10mm | 0/3 | 0/3 |

無噪聲的三種子產生相同條件，不是三個獨立隨機樣本。噪聲組三種子也只是敏感性檢查，不是帶置信度的成功率。

80ms無噪聲時，最大超調從hold的210.7mm降到predict的52.0mm；但最終誤差由2.79mm變為26.76mm，兩者都沒有滿足“最後0.3秒始終誤差<15mm且速度<40mm/s”。只展示超調下降就宣布恢復成功，會誤導讀者。

0ms帶噪聲時，部分失敗軌跡的最終位置誤差只有1.36mm或0.30mm，仍未通過穩定窗口。它說明“最後看起來很準”與“持續穩定”不同。應同時看整個尾段的位置和速度，而非挑一幀。

![固定種子7的實際目標誤差軌跡，比較延遲、噪聲與外推](/media/practice/planar-observation.svg)

圖示僅種子7，全部種子保存在CSV，不用圖中一條線代替全部結果。

## 怎樣復核這個結論

audit.py獨立檢查每行capture_t不晚于物理時刻，再從x/y/vx/vy重算最後窗口。不要用控制器的估計位置替代真值驗收，否則估計器可能“自己證明自己成功”。

### 在尾段找到第一次速度越界

固定選原歸檔中的`19-observation.csv`：0ms延遲、10mm位置雜訊、hold、種子19。先預測：如果終點位置和速度都合格，為什麼`success`仍是false？

先準備好頁首指引指定的固定提交，再在具身工程根目錄執行這個唯讀片段。它只用Python標準函式庫讀取既有CSV，不用安裝MuJoCo或NumPy，也不重跑模擬；完整歸檔校驗仍用下方audit指令。

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

預期選中`19-observation.csv`，輸出中的位置誤差與速度分別用mm、mm/s表示：

| 記錄 | t/s | 位置誤差/mm | 速度/(mm/s) |
| --- | ---: | ---: | ---: |
| 尾段第一次越界 | 3.714 | 3.944 | 40.392 |
| 最後一列 | 4.000 | 1.356 | 12.325 |

終點兩項都合格，卻不能撤銷3.714秒已經發生的速度越界。這個尾段的151個狀態樣本中，位置越界0個、速度越界24個。程式沿用原審計的`t >= 3.7 - 1e-9`，包含視窗兩端；151是取樣點數，時間區間仍是0.3秒。`1e-9`僅處理時間的浮點表示，位置15mm與速度40mm/s的閾值沒有放寬。

這裡定位的是既有失敗的原因，不把新一輪模擬當作完成練習的前提。若繼續改變延遲，應使用新輸出目錄並保留獨立協議與全部結果。

## 下一步值得驗證，而不是直接宣稱實現

可以研究帶加速度的估計、速度噪聲、狀態濾波、降低控制增益或基于觀測年齡停止。但每一種都引入新假設與參數，需要成組對照。當前predict不是魯棒控制或安全保證；二維執行器也不能代表真實機械臂。

本輪把第二場景、參數、軌跡與負結果完整公開，後續應先解釋具體失敗機制，再決定增加哪一種估計器，避免把“算法名更多”當作能力提升。

後續已發表的[速度估計篇](/docs/embodied-ai/mujoco-velocity-estimation)進一步比較位置差分與EMA；[開發集與保留集調參](/docs/embodied-ai/mujoco-controller-holdout)再檢查增益和濾波參數的組合。兩篇都保留了失敗與適用邊界；這裡提出的加速度模型與其他新控制策略仍需另外驗證。

## 從干凈目錄復現

首次重現請展開頁首的[固定版本指引](#reading-content)，整塊執行一次。它使用Python 3.12虛擬環境，在新的帶提交編號目錄中執行36回合，並稽核`outputs/my-run`。這組三篇文章解釋同一批記錄的不同子集，不需要為每篇再次複製倉庫或重新模擬。

若已有相符的固定版本與環境，只想核對原歸檔，可在該倉庫根目錄執行下面的唯讀稽核；它也是前面練習的證據來源：

```powershell
& .\.venv\Scripts\python.exe experiments/planar_reach/audit.py evidence/planar-reach-20261007
```

如已依頁首流程產生新結果，可以為這份新結果繪圖。此指令讀取`outputs/my-run`，並在其中寫入圖像；不適用於唯讀核驗原歸檔：

```powershell
& .\.venv\Scripts\python.exe experiments/planar_reach/plot.py outputs/my-run
```

本機驗證環境為Windows，Linux/macOS尚未複測。不需要模型金鑰或付費服務。重跑時另用新目錄，不覆寫既有結果。manifest中的程式碼凍結提交早於上方含證據的歸檔提交，原始碼雜湊對應實際執行檔案。
