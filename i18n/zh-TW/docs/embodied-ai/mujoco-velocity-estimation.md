---
title: "MuJoCo 速度估計：濾掉噪聲，也可能讓控制更差"
description: "54回合真實仿真對照位置差分、指數平滑與真值速度參考，解釋噪聲放大、估計滯後和穩定性驗收。"
slug: "/embodied-ai/mujoco-velocity-estimation"
status: "published"
published_at: "2026-10-09"
updated: "2026-10-09"
reading_minutes: 11
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-delayed-feedback", "doc:embodied-ai/mujoco-planar-pd"]
related: ["lab:mujoco-velocity-estimation", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-qualified-completion"]
---

[固定程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1931effc42f9d5974f20c09614dc2ebbdfcbf44b/experiments/planar_velocity_estimation) · [54 條壓縮原始軌跡](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1931effc42f9d5974f20c09614dc2ebbdfcbf44b/evidence/planar-velocity-20261009) · [實驗檔案](/labs/mujoco-velocity-estimation)

上一篇的預測器拿到了取樣時刻的真值速度，這是偏樂觀的條件。很多傳感器只給位置：拿相鄰位置相減，不就能得到速度了嗎？公式成立，但噪聲也被相減，並除以很短的時間間隔。把這個速度直接放進阻尼項，控制力可能抖得比位置更厲害。

這次沿用二維力控執行器，比較位置差分、平滑差分與真值速度參考。它是 **MuJoCo 實際仿真**，沒有機械臂、視覺、ROS2 或真實硬件。所有方法使用相同延遲位置、控制增益和限幅，不額外做位置外推。

## 從 3 毫米噪聲到速度誤差

傳感器每 20ms 取樣一次：

```text
測得位置 = 真實位置 + 位置噪聲
差分速度 = (本次測得位置 - 上次測得位置) / 0.02s
```

若兩次獨立位置噪聲的標準差都是 σ，則單軸差分噪聲的標準差為 `√2 × σ / Δt`。σ=3mm、Δt=20ms 時約為 **0.212m/s**。這只是噪聲傳播推導，實際估計誤差還含離散差分對運動的近似誤差，不能直接當作測量結果。

控制律是 `力 = 80 × 位置誤差 - 18 × 估計速度`，每軸限幅 ±5N。單軸 0.212m/s 的速度噪聲對應約 3.82N 的阻尼擾動，已經與限幅同量級。這解釋了為什么“位置看起來只差幾毫米”，控制卻可能反復觸頂。

## 平滑改變了什么

平滑方案先計算差分，再做指數移動平均（EMA）：

```text
α = 1 - exp(-Δt / τ)，τ 固定為 60ms
平滑速度 = (1 - α) × 上次平滑速度 + α × 本次差分速度
```

這里 Δt 使用**兩次取樣時間戳之差**，不是兩次收到資料的墻鐘間隔。首個樣本速度設為 0；重復或倒序時間戳被拒絕。平滑減少高頻變化，但它也會延后速度響應，尤其在加減速時，阻尼力不再及時反映當前運動。

整個閉環可以按這條路徑閱讀：

```text
物理狀態 → 位置加噪 → 帶取樣時間的延遲隊列
→ 取已到達樣本 → 速度估計 → PD 與力限幅
→ MuJoCo 物理推進 → 保存軌跡與驗收
```

只有 `oracle` 對照讀取取樣時刻的真值速度；差分和 EMA 不偷看 `qvel`。真實速度只另存到軌跡用于離線評價。全部控制決策只能使用已到達的樣本，審計會檢查觀測年齡。

## 固定協議，而不是看到失敗后重新調參

2 種延遲（0/80ms）× 3 種位置噪聲（0/3/10mm）× 3 種估計器 × 3 個種子，共 54 回合。每回合 4 秒、物理步長 2ms、控制周期 20ms，得到 108,000 行軌跡。無障礙、質量 1kg，目標位置為 `(0.6,0)`。

驗收沿用上一輪：**最后 300ms 的每個物理步**，位置距離都小于 15mm、速度范數都小于 0.04m/s。終點碰巧到達不算通過，最后一次誤差較小也不能替代整段穩定性。

以下各格為三種子的“通過回合數 / 3”：

| 延遲 | 位置噪聲 σ | 真值速度參考 | 位置差分 | 平滑差分 |
| --- | ---: | ---: | ---: | ---: |
| 0ms | 0mm | 3/3 | 3/3 | 3/3 |
| 0ms | 3mm | 3/3 | 0/3 | 0/3 |
| 0ms | 10mm | 1/3 | 0/3 | 0/3 |
| 80ms | 0mm | 0/3 | 0/3 | 0/3 |
| 80ms | 3mm | 0/3 | 0/3 | 0/3 |
| 80ms | 10mm | 0/3 | 0/3 | 0/3 |

合計 13 個回合通過。樣本很小且場景固定，這不是機器人泛化成功率。

## 兩個不能只看一半的結果

**平滑確實降低了部分估計噪聲。** 無延遲、10mm 噪聲下，三種子平均速度估計 RMSE 從差分的 0.9553m/s 降到 EMA 的 0.2471m/s；最后 300ms 的位置 RMS 也從 21.89mm 降到 10.01mm。可是兩組仍都是 0/3：位置 RMS 達標不代表每個時刻的位置和速度同時達標。

**平滑也可能把延遲問題放大。** 80ms 延遲、無噪聲時，差分的尾段位置 RMS 為 30.32mm，EMA 為 93.66mm；3mm 噪聲時分別為 26.00mm 與 123.31mm。平滑不是免費的降噪，它引入動態滯後，與已有延遲疊加。協議沒有掃描 τ 或重新調增益，所以只能報告當前參數組合的退化，不能斷言所有濾波器都會失敗。

![不同延遲與噪聲下，差分和平滑差分的尾段位置均方根誤差](/img/research/20261009/velocity-zh-TW.svg)

速度 RMSE 的參照是**取樣時刻**的真值速度，oracle 在這一指標上天然為零；它仍可能使用 80ms 前的速度，不能據此說當前速度準確。無噪聲、無延遲的差分也並非嚴格零誤差，因為位移差分是時間段平均速度，不等于端點瞬時速度。

## 如何重現和定位失敗

以下為 Windows PowerShell，明確指定虛擬環境的解譯器，不依賴啟用腳本。

```powershell
git clone https://github.com/VirtualSelect/hohoo-embodied-agent.git hohoo-embodied-agent-study
cd hohoo-embodied-agent-study
git checkout 1931effc42f9d5974f20c09614dc2ebbdfcbf44b
python -m venv .venv
$py = '.\.venv\Scripts\python.exe'
& $py -m pip install -r requirements-lock.txt
& $py -m unittest discover -s experiments/planar_velocity_estimation -p "test_*.py"
& $py experiments/planar_velocity_estimation/run.py --out outputs/velocity-my-run
& $py experiments/planar_velocity_estimation/audit.py outputs/velocity-my-run
```

本機驗證環境：Windows、Python 3.12.14、MuJoCo 3.3.7、NumPy 2.2.6；其他操作系統未復測。執行不打開渲染窗口，不需 GPU、模型金鑰或付費服務。預期 4 個估計器測試通過，輸出 54 回合、108000 行、13 個通過；審計再驗證每條軌跡的雜湊、時間、控制力和驗收結果。

`csv.gz` 是無損壓縮，可用 Python `gzip.open(..., 'rt')` 閱讀。重現輸出請用獨立目錄，避免覆蓋歸檔證據。若結果不同，先檢查鎖定依賴與固定提交，再看 `capture_t`、`estimated_vx/vy`、`raw_fx/fy` 與 `saturated`；不要先放寬驗收閾值。如果力量長期觸頂，查看速度估計是否被放大；如果曲線平滑但目標附近擺動，查看樣本年齡和估計滯後。

小練習：給三個連續樣本手算一次差分與 EMA，觀察突然減速時 EMA 為何仍保留舊速度。若要繼續實驗，應分別掃描取樣率、τ 和控制增益，並保留全部條件。當前結果沒有完成完整 VL01，也沒有證明真機安全；下一步是解釋並驗證閉環取舍，而不是僅把算法名換成更復雜的濾波器。
