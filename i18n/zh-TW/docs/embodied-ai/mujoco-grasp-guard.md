---
title: 具身實作（二）：沒抓住，就別繼續搬運
description: 在 MuJoCo 中加入抬升與雙側接觸確認，用18回合對照檢驗停止空手搬運，並公開軌跡、影片、程式碼與限制。
slug: /embodied-ai/mujoco-grasp-guard
status: published
published_at: "2026-09-29"
updated: "2026-09-29"
reading_minutes: 12
domain: embodied-ai
article_kind: case-study
difficulty: intermediate
provenance: experiment-result
related:
  [
    "doc:embodied-ai/mujoco-first-pick-place",
    "project:hohoo-embodied-agent",
    "lab:grasp-guard",
  ]
---

[上一篇](/docs/embodied-ai/mujoco-first-pick-place)裡，夾爪偏了25 mm，沒有抓起方塊，卻照著時間表跑完搬運、下降和鬆手。程式沒有報錯，任務也沒有完成。

這次不調整摩擦係數、不換機器人、不訓練策略，只問：**在進入搬運階段之前，能否根據已觀察到的狀態，取消一次沒有意義的後續動作？**

18個模擬回合中，加入檢查後，兩個偏移條件的六次失敗都停止了搬運；無偏移條件三次仍完成放置，完整軌跡與原方案一致。抓取失敗沒有變成成功，改善的是失敗後的行為。

[程式碼與執行方法](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/eb186ee4927da99d4ba48e334fabf9442c929507/experiments/vl01_grasp_guard) · [18回合原始紀錄](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/eb186ee4927da99d4ba48e334fabf9442c929507/evidence/grasp-guard-20260929) · [實驗檔案](/labs/grasp-guard)

## 1. 到了下一步的時間，不等於具備下一步的條件

原本的高層控制只有時間表：

```text
接近 → 下降 → 合攏 → 抬升 → 搬運 → 放低 → 鬆手 → 退開
```

抬升結束後，程式預設「方塊應該已經在手上」。實際狀態卻可能是：夾爪在空中，方塊還在桌上。

MuJoCo的位置致動器本身使用位置回饋。「按時間開環執行」指的是**高層任務階段不根據抓取結果改變流程**，不是整個物理控制器沒有回饋。

新程式只修改這條階段邊：

```text
抬升結束
    ↓
抓取確認
    ├─ 通過：繼續原本的搬運、放置
    └─ 拒絕：保持致動器目標0.6秒，結束本回合
```

保持目標不是固定物體，也不是實體機器人的緊急停止命令。程式仍只設定致動器目標並進行物理步進，沒有修改方塊位姿或加入吸附約束。

## 2. 怎樣才算「確認抓住了」？

在模擬時間4.0秒、抬升結束時，讀取最近0.2秒的取樣紀錄。門控規則在執行前已寫入protocol.json：

| 檢查         | 本輪門檻                                            | 要排除的情況                 |
| ------------ | --------------------------------------------------- | ---------------------------- |
| 時間窗口完整 | 至少10筆；跨度至少0.18秒；相鄰間隔不超過0.0200001秒 | 只有一次幸運取樣，或紀錄中斷 |
| 最後一筆夠新 | 距判斷時刻不超過0.025秒                             | 使用過期狀態                 |
| 方塊確實離桌 | 每筆方塊中心z均大於0.1 m                            | 夾爪升高，方塊沒動           |
| 兩側持續接觸 | 每筆均包含left_pad與right_pad                       | 單側碰撞或短暫擦過           |
| 數值有效     | 高度有限，非NaN/Infinity                            | 無效數值繞過檢查             |

0.1 m是本場景的絕對世界座標門檻，不是「比任意桌面高10 cm」。更換場景、物體或夾爪後，需要重新制定。

接觸是MuJoCo偵測到的接觸對，**不是夾持力足夠的證明**。規則比只看高度更有約束，但不構成通用的穩定抓持判據。

核心判斷如下，完整程式另檢查時間連續性與非有限數值：

```python
window = [r for r in rows if now - 0.2 - 1e-9 <= r["time"] <= now]
high = all(r["cube_z"] > 0.1 for r in window)
both = all(
    {"left_pad", "right_pad"} <= set(r["contacts"].split("|"))
    for r in window
)
accepted = complete_window and finite_height and high and both
```

時間比較中的微小容差處理浮點累積誤差，不放寬高度條件。空窗口必須拒絕：Python的all([])會回傳True，不能單獨依賴它。

## 3. 為什麼用一段紀錄，而不是最後一幀？

「剛碰到」與「夾著抬起」在某一幀可能具有相似的接觸狀態。要求連續窗口通過，可排除本固定場景中的部分瞬時接觸。

代價是判斷延遲、可能漏掉取樣之間的短暫脫離，也可能拒絕原本能完成的抓取。因此0.2秒不是本實驗證明的最佳參數。

物理模擬每0.002秒步進，即500 Hz；每10步保存一次狀態，即50 Hz。門控使用這份50 Hz紀錄。實際窗口有3.802至3.982秒的10筆樣本，跨度0.18秒，最新一筆距4秒約0.018秒。

步進後呼叫mj_forward，讓派生的位置與接觸資料對齊保存狀態。其與mj_step的差別可查閱[MuJoCo 3.3.7 API文件](https://mujoco.readthedocs.io/en/3.3.7/APIreference/APIfunctions.html#mj-forward)。

## 4. 對照必須保證前面的抓取沒有改變

沿用原場景、控制目標、放置成功判據與三種偏移：

- baseline：計算並記錄同一門控結果，但仍繼續搬運。
- guarded：應用門控，拒絕後保持目標0.6秒並結束。
- 0 / 25 / 50 mm × 兩種控制 × 三次重複，共18回合。

沒有隨機化。三次重複用於檢查確定性重現，不是三個不同環境的成功率樣本。

獨立審計腳本沒有匯入控制器的evaluate函式，而是從CSV重新判斷，並核對：

1. 九對回合在4秒前的全部紀錄一致。
2. 九條新baseline CSV與上一篇對應軌跡逐位元組相同。
3. 三對無偏移成功回合的**完整軌跡**一致。
4. 拒絕回合沒有transfer階段，保持期間橫向目標不再前移。

才能把差別歸因於應用檢查，而不是無意中更改了抓取動作。

## 5. 停止空手搬運，沒有修好抓取

| 拾取偏移 | baseline放置完成 | guarded放置完成 | guarded取消搬運 | baseline判定後水平路程 |
| -------- | ---------------: | --------------: | --------------: | ---------------------: |
| 0 mm     |              3/3 |             3/3 |             0/3 |             268.330 mm |
| 25 mm    |              0/3 |             0/3 |             3/3 |             246.221 mm |
| 50 mm    |              0/3 |             0/3 |             3/3 |             224.722 mm |

水平路程是從4秒起，將相鄰紀錄中夾爪XY位移長度相加。偏移失敗的guarded回合約10⁻⁸ mm，接近數值殘餘，不能寫成真實硬體定位精度。

失敗組4.6秒結束；baseline為9.2秒。差值包含取消流程的時間，**不是推論加速或機器人節能量測**。

![25毫米偏移：方塊都沒抬起，只有baseline繼續水平搬運](/media/practice/grasp-guard-comparison.png)

圖由25 mm條件第一個配對回合的CSV生成。上半部是方塊中心高度，下半部是夾爪相對判斷時刻位置的水平距離；虛線為4秒。圖中的位移與表中的累積路程定義不同；此軌跡接近直線，所以最終數值相近。

## 6. 看同一次失敗的兩種後續動作

**原流程：** 方塊留在原地，空夾爪繼續前往藍盒。

<video controls preload="none" playsinline src="/media/practice/grasp-guard-baseline.mp4" poster="/media/practice/grasp-guard-lift.png" width="960" height="640" aria-label="25毫米偏移baseline：空夾爪繼續搬運">無法播放時，請開啟原始證據目錄的影片。</video>

**加入檢查：** 抬升結束未通過，夾爪保持位置，回合結束。

<video controls preload="none" playsinline src="/media/practice/grasp-guard-stopped.mp4" poster="/media/practice/grasp-guard-stop.png" width="960" height="640" aria-label="25毫米偏移guarded：拒絕搬運並保持位置">無法播放時，請開啟原始證據目錄的影片。</video>

兩段均為實際執行錄影，25 FPS，沒有插入模擬成功畫面。[證據目錄](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/eb186ee4927da99d4ba48e334fabf9442c929507/evidence/grasp-guard-20260929)還有其他條件的狀態、截圖與影片。

## 7. 重現與定位失敗

沿用Python 3.12 / MuJoCo 3.3.7環境，在獨立工程根目錄執行：

```powershell
.venv/Scripts/python.exe -m unittest discover -s experiments/vl01_grasp_guard -p "test_*.py"
.venv/Scripts/python.exe experiments/vl01_grasp_guard/run.py --out evidence/my-guard-run --render
.venv/Scripts/python.exe experiments/vl01_grasp_guard/audit.py evidence/my-guard-run
```

輸出目錄必須不存在。manifest.json記錄提交、原始碼hash與版本；每個回合包含trajectory.csv、states.jsonl、events.json、summary.json。8項單元測試涵蓋正常抓持及單側接觸、臨界高度、舊紀錄、空窗口、亂序、重複時間、瞬時接觸、未來紀錄與非有限高度等邊界。

拒絕時先看gate.reasons，再對照window_start/window_end、min_cube_z_m、both_pad_samples，不要只看success。

重放已保存狀態：

```powershell
.venv/Scripts/python.exe experiments/vl01_grasp_guard/replay.py evidence/grasp-guard-20260929/guarded-025mm-run-1/states.jsonl --out outputs/guard-replay.mp4
```

重放還原qpos/qvel/ctrl，不是重新執行策略，不能算額外一次試驗。

## 8. 距離真正閉環機器人還有多遠？

本輪直接讀取模擬器方塊位姿與接觸對，屬於**特權狀態觀測**。真實機器人可能需要視覺估計、夾爪寬度、電流或力感測器；它們有雜訊、延遲和缺失，不能照搬數值。

三個明確缺口：

- 搬運前只確認一次；通過後若滑落，目前仍不會中途停止。
- 拒絕後沒有重新抓取或恢復規劃，失敗仍是失敗。
- 固定場景的兩種偏移，遠不足以估計誤報、漏報或穩健性。

本輪建立的是可核對的任務前置條件：**下一步需要什麼事實，就在執行前檢查什麼事實。** 下一項先加入可重複的搬運中滑落擾動，驗證持續監測，再討論恢復策略。
