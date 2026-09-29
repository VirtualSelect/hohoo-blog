---
title: "具身實作（四）：訊息還在到，觀測已經過期了"
description: "45回合MuJoCo對照，分離取樣間隔、異常計數與觀測年齡；理解舊訊息為何掩蓋真實鬆爪，以及時間門檻仍有哪些限制。"
slug: /embodied-ai/mujoco-observation-freshness
status: published
published_at: "2026-09-29"
updated: "2026-09-29"
reading_minutes: 14
domain: embodied-ai
article_kind: case-study
difficulty: intermediate
provenance: experiment-result
related:
  [
    "doc:embodied-ai/mujoco-transfer-monitor",
    "doc:embodied-ai/mujoco-grasp-guard",
    "project:hohoo-embodied-agent",
    "lab:observation-freshness",
  ]
---

[上一輪](/docs/embodied-ai/mujoco-transfer-monitor)已讓程式在搬運時持續檢查接觸：連續三次異常，就取消後續搬運。但還有兩個問題。

如果感測器從每 20 ms 更新一次改成每 50 ms 一次，「三次」還是同一個等待時間嗎？如果訊息一直傳來「接觸正常」，卻反覆傳的是幾十毫秒前的舊訊息，程式應該相信它嗎？

這次用 **45 個真實 MuJoCo 模擬回合**做了對照。同一個三次門檻，警報等待從 22 ms 變成 102 ms；重送舊正常封包時，只看接觸內容的策略一直沒有警報。補上擷取時間檢查，才識別出證據已經過期。

[配套程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/53cc6cbf3fbb3b734b8c5dddfc7e4f0dbddf3f86/experiments/vl01_observation_freshness) · [原始紀錄與審計](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/53cc6cbf3fbb3b734b8c5dddfc7e4f0dbddf3f86/evidence/freshness-20260929) · [實驗檔案](/labs/observation-freshness)

## 1. 先看一個實際失效過程

下面摘取 20 ms 取樣、重送舊正常封包條件的紀錄。模擬在 4.800 秒開始強制鬆爪，但傳輸層繼續遞交先前的封包。秒數由紀錄中的 tick × 0.002 換算。

| 接收時刻 | 序號 | 原始擷取時刻 | 封包內雙側接觸 | 物理雙側接觸 | 觀測年齡 |
| -------- | ---- | ------------ | -------------- | ------------ | -------- |
| 4.782 s  | 239  | 4.782 s      | 有             | 有           | 0 ms     |
| 4.802 s  | 239  | 4.782 s      | 有             | 無           | 20 ms    |
| 4.822 s  | 239  | 4.782 s      | 有             | 無           | 40 ms    |
| 4.842 s  | 239  | 4.782 s      | 有             | 無           | 60 ms    |

訊息沒有中斷，內容也沒有變成「異常」。改變的是：**目前時間一直前進，支持「接觸正常」的證據卻停在 4.782 秒。**

三次計數策略沒有看到壞接觸，40 ms 異常跨度策略也沒有。具新鮮度檢查的策略在最後一列發出警報，原因是 `stale`，不是 `contact`。

年齡警報只證明「沒有足夠新的觀測支持繼續執行」，不單獨證明方塊已掉落。這次確實掉落，是另一條物理紀錄提供的證據。

## 2. 把取樣、接收與控制拆開

沿用原有零偏移場景、夾爪、動作時序與搬運前確認。所有回合都通過前置檢查，沒有改變拾取難度。

| 時間尺度       | 本輪設定        | 職責                                         |
| -------------- | --------------- | -------------------------------------------- |
| 物理與控制步長 | 2 ms            | 推進物理、讀取輸入、檢查年齡、輸出下一步目標 |
| 觀測封包週期   | 10 / 20 / 50 ms | 產生新的接觸觀測                             |
| 常規軌跡紀錄   | 20 ms           | 保存位置、速度與控制狀態                     |
| 搬運決策紀錄   | 2 ms            | 記錄收包、年齡、計數與警報                   |

新鮮度檢查必須在沒有訊息時也能執行。若只放在接收回呼中，完全靜默時就沒有機會檢查逾時。本例每個控制步都檢查；這不保證真實作業系統的即時排程能力。

本輪使用同一模擬時鐘，以整數 tick 比較。MuJoCo 的時間、物理狀態與控制輸入是不同欄位，因此能分別記錄，不把「送出指令」當成「動作完成」。[MuJoCo 3.3.7 狀態與控制說明](https://mujoco.readthedocs.io/en/3.3.7/programming/simulation.html#state-and-control)

## 3. 三種策略，分別補一條約束

| 策略      | 判定規則                                   | 新增約束                 |
| --------- | ------------------------------------------ | ------------------------ |
| count3    | 連續 3 個唯一壞觀測                        | 基線                     |
| elapsed40 | 連續壞觀測首尾擷取時間相差至少 40 ms       | 把樣本數量改成時間跨度   |
| fresh60   | elapsed40，加上最近觀測年齡達 60 ms 就警報 | 不把舊正常訊息當目前證據 |

三者只接受序號與擷取時刻同時前進的封包。重複封包不增加異常計數，也不重設最近擷取時刻。正常的新觀測清空異常累計，警報後保持鎖存。

elapsed40 不是「壞一次就啟動 40 ms 鬧鐘」。它需要新的壞觀測確認跨度；若後續完全沒有訊息，等待不能補出「持續異常」的證據。fresh60 另設年齡檢查處理這種未知狀態。

```python
# now 和 capture_tick 使用同一模擬時鐘；一個 tick = 2 ms
age_ticks = now - latest["capture_tick"]

# 收到新封包後先更新 latest，再檢查年齡
if policy == "fresh60" and age_ticks >= 30:
    alarm = True
    cause = "stale"
```

完整實作還處理無初始觀測、重複封包、亂序封包、未來時間戳與階段切換。這只是年齡分支，不是完整監測器。60 ms 是實驗參數，沒有經過硬體安全評估。

## 4. 45 回合究竟改變什麼？

矩陣是 3 個觀測週期 × 5 個輸入條件 × 3 種策略。**每格一次確定性執行**，沒有隨機化、信賴區間或機率成功率。

| 條件        | 物理輸入               | 傳給監測器的訊息                       |
| ----------- | ---------------------- | -------------------------------------- |
| clean       | 無擾動                 | 正常更新                               |
| empty-40ms  | 無擾動                 | [4.8, 4.84) 秒內應送出的封包報告空接觸 |
| forced-open | [4.8, 5.04) 秒強制鬆爪 | 正常報告實際模擬接觸                   |
| replay-good | 同樣強制鬆爪           | 4.8 秒起重送最後一個舊正常封包         |
| silence     | 同樣強制鬆爪           | 4.8 秒起不再遞送訊息                   |

empty-40ms 是內容錯誤，silence 是沒有訊息；replay-good 則是訊息在到、資訊沒更新。不能全都說成「沒偵測到接觸」。

故障使用 pre-step 時間，首個對應的 post-step 紀錄為 4.802 秒。傳輸故障持續到回合結束，強制鬆爪僅持續 0.24 秒。控制器不修改方塊座標，掉落來自模擬動力學。

警報後保持最後命令目標 0.6 秒，再結束回合。不凍結物理狀態、不重新抓取，也不宣稱硬體急停。

## 5. 三次異常，不是固定等待時間

受控鬆爪且訊息正常更新時，以下時間從 4.800 秒故障起點計算：

| 觀測週期 | count3 | elapsed40 | fresh60 |
| -------- | ------ | --------- | ------- |
| 10 ms    | 22 ms  | 42 ms     | 42 ms   |
| 20 ms    | 42 ms  | 42 ms     | 42 ms   |
| 50 ms    | 102 ms | 52 ms     | 52 ms   |

![固定故障相位下，計數策略的警報等待隨取樣週期增大，時間跨度策略仍有取樣量化](/media/practice/freshness-sampling-delay.png)

三次連續樣本首尾跨兩個取樣間隔，即 `(3 - 1) × 週期`。加上本次故障到首個樣本的 2 ms，分別為 22、42、102 ms。

elapsed40 在 10、20 ms 週期下，都能於首個壞樣本之後 40 ms 得到新證據；50 ms 週期必須等下一筆，所以等了 50 ms，再加前面的 2 ms。

**以時間表達門檻能減少與取樣頻率的耦合，但不會消除取樣量化。** 這不是任意故障相位的最壞延遲；本輪未掃描相位、排程抖動與通訊延遲。

## 6. 更快取樣也可能改變誤停結果

持續 40 ms 空接觸報告條件中，只有 **10 ms 週期的 count3** 誤停，其餘八格完成放置。

```text
10 ms 週期：4.802、4.812、4.822、4.832 為壞觀測
20 ms 週期：4.802、4.822 為壞觀測
50 ms 週期：4.802 為壞觀測
```

10 ms 情況的第三個壞觀測已滿足 count3；另外兩個週期沒有湊到三個。elapsed40 看到的壞觀測首尾跨度最多 30 ms，下一筆已正常，因此沒有警報。

這不是「取樣越慢越安全」，降低頻率也可能推遲真正故障的發現。固定計數門檻會隨感測器頻率改變，隱含改變對短暫異常的容忍時長。

## 7. 為什麼慢取樣反而更早觸發年齡警報？

重送舊正常封包與完全靜默時，count3、elapsed40 都未警報。fresh60 在兩種傳輸故障下得到相同時間：

| 觀測週期 | 最後有效擷取 | 達到 60 ms 年齡時警報 | 從故障到警報 |
| -------- | ------------ | --------------------- | ------------ |
| 10 ms    | 4.792 s      | 4.852 s               | 52 ms        |
| 20 ms    | 4.782 s      | 4.842 s               | 42 ms        |
| 50 ms    | 4.752 s      | 4.812 s               | 12 ms        |

50 ms 週期不是更擅長偵測掉落，而是故障發生時，手裡的觀測已舊了 48 ms，距離 60 ms 門檻只差 12 ms。

必須同時報告**故障時刻、最後擷取時刻與警報時刻**。只比較最後一欄，會把取樣相位差異當成策略能力。

![20 ms舊封包重送：真實接觸已消失，收到的封包仍報告正常，擷取年齡持續增加](/media/practice/freshness-timeline.png)

接觸與年齡曲線來自 elapsed40 回合；垂直線標出配對 fresh60 回合的實際警報時刻。兩者在決策分歧前的物理狀態一致。陰影代表強制鬆爪區間，不表示傳輸故障於 5.04 秒結束。

年齡門檻也要容納正常更新。最大正常週期 50 ms 與 60 ms 門檻之間僅有 10 ms 餘量；真實傳輸及排程抖動可能耗盡它，本輪尚未驗證。

## 8. 如何確認不是程式自行評分？

獨立審計器不匯入執行器或監測器。它從紀錄重建封包來源、序號、擷取時刻、採用狀態、異常跨度與年齡，再計算警報及任務驗收。

實際通過：

- 45 回合獨立核驗，沒有 MuJoCo warning。
- 45 對策略在首次決策分歧前，保存的物理狀態前綴一致。
- 9 條無擾動完整軌跡與上一輪成功基線完全一致。
- 17 項新邊界測試與原有 24 項測試通過。
- 180 份已提交原始檔案的位元組雜湊與審計紀錄一致。

所有無擾動回合完成放置；所有物理鬆爪條件都未完成放置。新鮮度檢查改變的是「證據過期後是否繼續」，沒有讓任務恢復成功。

這些是實作及紀錄的一致性檢查，不是實體機器人安全認證。

## 9. 自己重現，再問下一個問題

沿用工程的 Python 3.12、MuJoCo 3.3.7 與鎖定依賴。協議在執行前提交，版本與環境寫入 `manifest.json`，不需要模型 API。

```powershell
.venv/Scripts/python.exe -m unittest discover -s experiments/vl01_observation_freshness -p test_monitor.py -v
.venv/Scripts/python.exe experiments/vl01_observation_freshness/run.py --out outputs/my-freshness
.venv/Scripts/python.exe experiments/vl01_observation_freshness/audit.py outputs/my-freshness
.venv/Scripts/python.exe experiments/vl01_observation_freshness/render.py outputs/my-freshness
```

輸出目錄必須不存在。參見 [程式碼與重現說明](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/53cc6cbf3fbb3b734b8c5dddfc7e4f0dbddf3f86/experiments/vl01_observation_freshness/README.md) 與 [逐回合審計](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/53cc6cbf3fbb3b734b8c5dddfc7e4f0dbddf3f86/evidence/freshness-20260929/audit.json)。`control.csv` 保存每個搬運控制步；`trajectory.csv` 與 `states.jsonl` 為 50 Hz 物理快照，不是完整 500 Hz 狀態序列。圖表讀取真實紀錄，不重跑物理，也不是場景錄影。

本輪仍用模擬真值及同一時鐘。未涵蓋跨機時鐘同步、序號重啟、偽造新時間戳、真實網路、視覺、自然摩擦滑移或恢復策略。監測仍只覆蓋搬運階段。

下一步先區分「延遲但仍可用」與「必須重新觀測」，再定義恢復條件。不能在新訊息剛恢復時，自動接著執行舊動作。此問題已寫回原 VL01 待辦，尚未當成實驗結論發布。
