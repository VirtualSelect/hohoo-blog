---
title: "具身實作（三）：抓住之後，還要一直確認嗎？"
description: "27回合MuJoCo對照：以單次觀測缺失與受控鬆爪，檢驗持續監測、誤停與40毫秒確認延遲，公開程式碼、軌跡與重放。"
slug: /embodied-ai/mujoco-transfer-monitor
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
    "doc:embodied-ai/mujoco-grasp-guard",
    "doc:embodied-ai/mujoco-first-pick-place",
    "project:hohoo-embodied-agent",
    "lab:transfer-monitor",
  ]
---

[上一篇](/docs/embodied-ai/mujoco-grasp-guard)給搬運加了一道門：先確認方塊已經抬起，而且兩側夾爪持續接觸，再進入下一階段。

但這道門只回答了「**剛才抓住了嗎**」。如果確認之後，方塊在半路掉下來，原來的程式仍會繼續搬運。一個時刻的成立條件，不會自動成為整個過程的保證。

這次實際執行了27個 MuJoCo 回合：比較一次性檢查、立即停止、連續三次異常才停止，並把「觀測暫時出錯」與「夾爪真的鬆開」分成兩個條件。結果揭示的取捨是：**反應越快，越容易被短暫異常打斷；等待確認，就會多走一段路。**

[配套程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/581e8e383b397eff947880d888f5c089204bba98/experiments/vl01_transfer_monitor) · [27回合原始紀錄](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/581e8e383b397eff947880d888f5c089204bba98/evidence/transfer-monitor-20260929) · [實驗檔案](/labs/transfer-monitor)

## 1. 前置條件與過程條件是兩回事

原有流程在模擬時間4.0秒，檢查最近0.2秒的高度與雙側接觸。這一輪保留該檢查，每個回合都通過了它。

新增檢查發生在搬運階段，也就是4.0–5.5秒：每隔20毫秒重新查看左右指墊是否都接觸方塊。物理模擬仍每隔2毫秒步進，**檢查頻率與物理步長不是同一個概念**。

```text
抬升結束 → 前置確認 → 搬運
                       ├─ 條件仍成立：執行下一個目標
                       └─ 條件持續失效：鎖定警報 → 保持目標 → 結束回合
```

「保持」是凍結剛送出的致動器目標，再執行物理模擬0.6秒；不是凍結物體座標，也不是把速度瞬間歸零。

## 2. 先把兩種故障分開

場景、夾爪、摩擦係數、0 mm拾取偏移、動作時序與成功定義沿用上一輪，只比較下列輸入條件與監測策略。

| 條件                        | 注入位置                | 實際改變什麼                               |
| --------------------------- | ----------------------- | ------------------------------------------ |
| clean：無擾動               | 不注入                  | 正常抓取與搬運                             |
| observation-gap：單次空報告 | 4.802秒的一個觀測樣本   | 傳給監測器的接觸集合清空，真實物理接觸不變 |
| forced-open：受控鬆爪       | 模擬時間 [4.8, 5.04) 秒 | 兩側夾爪位置目標覆寫為0，持續0.24秒        |

第二種條件仍然有時間戳記與觀測紀錄，模擬的是「這一幀報告沒有接觸」，**不等於通訊中斷、未收到資料或感測器逾時**。後幾種情況需要新鮮度檢查，本輪尚未實作。

第三種條件透過位置致動器讓夾爪鬆開，方塊在 MuJoCo 動力學與接觸計算中掉落，程式沒有把方塊移到地面。不過，強制鬆爪不是自然摩擦滑移模型，因此以下只討論這種可重複的夾持失效。

MuJoCo 的 `ctrl` 提供致動器控制輸入，狀態與接觸則從模擬資料讀取；因此能分開記錄「送出什麼目標」及「環境實際發生什麼」。[MuJoCo 3.3.7 模擬介面說明](https://mujoco.readthedocs.io/en/3.3.7/programming/simulation.html#state-and-control)

## 3. 三個監測策略

| 策略      | 搬運前確認 | 搬運中處理                             |
| --------- | ---------- | -------------------------------------- |
| once      | 保留       | 記錄接觸，但不再中斷                   |
| immediate | 保留       | 一次缺少任意一側接觸就發出警報         |
| debounced | 保留       | 連續三次異常才發出警報；一次正常就歸零 |

缺少任意一側接觸都算異常，地板或手掌接觸不能代替指墊接觸。核心計數如下：

```python
both = {"left_pad", "right_pad"} <= set(contacts.split("|"))
bad_streak = 0 if both else bad_streak + 1

if required and bad_streak >= required:
    alarm = True
```

完整程式還處理兩個邊界。第一，警報成立後保持鎖定；之後接觸恢復，也不自動繼續搬運，避免抖動的觀測讓任務反覆啟停。恢復需要另一套決策，本輪沒有實作。

第二，只在 transfer 階段套用此規則。主動釋放時本來就應該失去接觸；全程使用同一個條件會把正常鬆手判成故障。本輪也沒有監測放低階段，不能稱為全流程監測。

## 4. 實際結果：誤停與漏檢都看得見

3條件 × 3策略 × 3次重複，共27回合。初始條件未隨機化，重複用於確認一致性，不能視為統計獨立樣本或泛化成功率。

| 條件           | once            | immediate           | debounced       |
| -------------- | --------------- | ------------------- | --------------- |
| 無擾動         | 3次完成放置     | 3次完成放置         | 3次完成放置     |
| 單次空接觸報告 | 3次完成放置     | 3次誤停，未完成放置 | 3次完成放置     |
| 持續0.24秒鬆爪 | 3次繼續空手搬運 | 3次取消後續搬運     | 3次取消後續搬運 |

最後一行中，**三種策略都沒有完成放置**。方塊掉到地面，取消搬運並沒有把它抓回來。只看「放置是否成功」看不到失敗後的行為差異；只看「有沒有警報」，又會漏掉第二行的誤停。

無擾動的9條完整狀態軌跡與上一輪成功基線一致。單次空報告條件中，once和debounced的6條軌跡也與無擾動一致。比較的是保存的 `qpos/qvel/ctrl` 與階段紀錄，不只是最後位置接近。

## 5. 多等兩次觀測，代價是什麼？

以下取受控鬆爪條件的第一次重複，其餘兩次得到相同狀態序列。時間都是模擬時間。

| 策略      | 首個異常樣本 | 警報時間 | 首個異常至警報 | 首個異常後的水平累計路程 |
| --------- | ------------ | -------- | -------------- | ------------------------ |
| once      | 4.802 s      | 無       | 不適用         | 132.135 mm               |
| immediate | 4.802 s      | 4.802 s  | 0 ms           | 11.902 mm                |
| debounced | 4.802 s      | 4.842 s  | 40 ms          | 22.534 mm                |

**0 ms不代表零物理偵測延遲**。故障從4.800秒開始，第一筆異常紀錄是4.802秒；表格從首個異常樣本起算。僅憑50 Hz紀錄，也無法還原取樣間隔內接觸改變的精確時刻。

三個異常樣本分別在4.802、4.822、4.842秒，首尾相差兩個取樣間隔，因此是40 ms，不是60 ms。本次時序下，故障注入到debounced警報為42 ms；這不是通用的延遲上限。

水平累計路程依相鄰樣本計算：

```text
Σ sqrt((x[i+1] - x[i])² + (y[i+1] - y[i])²)
```

起點是首個異常樣本，終點是各自回合結束：once為9.2秒，immediate為5.402秒，debounced為5.442秒。**觀察終點不同**，這個量表示本次實際後續路徑，不是固定時間視窗的速度指標，也不是硬體煞停距離。

![受控鬆爪後，方塊高度曲線接近，但三種策略的夾爪水平運動不同](/media/practice/transfer-monitor-comparison.png)

陰影為強制鬆爪區間。上圖的方塊都掉落，中圖呈現夾爪相對首個異常位置的位移，下圖是異常計數，警報後保持鎖定值。圖中位移與表中累計路程定義不同，在這條近乎單向的路徑上接近，不能一般化混用。

## 6. 為什麼停止指令發出了，夾爪還在動？

immediate在第一個異常樣本就發出警報，夾爪卻仍移動約11.9 mm。程式保持的是**目標位置**，不是當前實際位置或速度。

位置致動器仍有追蹤誤差，系統也仍有速度。凍結目標後，物理系統會繼續反應。debounced在警報後還移動約11.85 mm；表中22.534 mm也包含等待確認期間的運動。

應分別記錄：觀測何時異常、控制目標何時改變、實體之後如何運動。一行「停止成功」不足以證明它已經停止，更不能證明掉落風險已消除。

## 7. 查看真實座標重放

以下影片讀取每回合保存的50 Hz座標，沒有插值或重新執行物理步驟。綠圈是夾爪中心、紅方塊是物體中心、十字是目標；這是 **XZ平面投影，不是機器人幾何或三維場景錄影**。

### 一次性確認：方塊掉落，夾爪繼續前往目標

<video controls preload="none" playsinline src="/media/practice/transfer-monitor-once.mp4" poster="/media/practice/transfer-monitor-once.png" width="960" height="640" aria-label="一次性檢查的實際座標重放">無法播放時，可從原始證據目錄下載影片。</video>

### 連續三次確認：警報後保持目標，提前結束回合

<video controls preload="none" playsinline src="/media/practice/transfer-monitor-debounced.mp4" poster="/media/practice/transfer-monitor-debounced.png" width="960" height="640" aria-label="連續異常確認的實際座標重放">無法播放時，可從原始證據目錄下載影片。</video>

影片時長分別為9.2秒與5.46秒，由幀數除以50 FPS得到。第二段最後一筆物理紀錄是5.442秒，播放器時長與紀錄終點的差異來自取樣影格封裝，不能拿影片時長當警報時間。

本輪環境無法使用OpenGL三維渲染，因此提供CPU軌跡視覺化；完整狀態仍保留，可在具備圖形環境的機器上依工程說明重放。

## 8. 不只相信程式自己的summary

獨立審計不匯入監測器或執行程式，而是讀取CSV、狀態與事件，重算故障、觀測、計數、警報、保持目標、路徑與放置驗收。

實際通過的檢查包括：

- 27回合紀錄完整，沒有MuJoCo warning。
- 18對策略在第一次決策分歧前，保存的物理狀態完全一致。
- 9條無擾動完整軌跡重現上一輪成功基線。
- 6條容忍單次空報告的軌跡與無擾動一致。
- 18次同條件重複比較一致，另有11項監測器邊界測試通過。

這些檢查提升本次紀錄的可核驗程度，但不能排除所有實作問題，也不能證明模擬模型符合真實機器人。

## 9. 在自己的電腦上重現

使用工程既有的Python 3.12與鎖定依賴，在倉庫根目錄執行。開始前先讀[凍結協定](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/581e8e383b397eff947880d888f5c089204bba98/experiments/vl01_transfer_monitor/protocol.json)。

```powershell
.venv/Scripts/python.exe -m unittest discover -s experiments/vl01_transfer_monitor -p test_monitor.py -v
.venv/Scripts/python.exe experiments/vl01_transfer_monitor/run.py --out outputs/my-transfer-monitor
.venv/Scripts/python.exe experiments/vl01_transfer_monitor/audit.py outputs/my-transfer-monitor
.venv/Scripts/python.exe experiments/vl01_transfer_monitor/render.py outputs/my-transfer-monitor
```

輸出目錄必須不存在，程式拒絕覆蓋舊回合，也不需要模型API Key。完整依賴、狀態重放與產物含義見[工程說明](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/581e8e383b397eff947880d888f5c089204bba98/experiments/vl01_transfer_monitor/README.md)。

先檢查 `manifest.json` 的版本與原始碼雜湊，再讀 `trajectory.csv`、`events.json` 和 `audit.json`。Git保留了本輪證據檔案的原始換行，避免轉換造成紀錄雜湊不符。

## 10. 這次能說什麼，下一次該問什麼？

在固定條件中，持續監測取消了失去接觸後的搬運；三次確認容忍單次空報告，同時比立即停止多等待40 ms。**這證明一項具體取捨，沒有證明「三次」是最優門檻。**

尚未覆蓋觀測延遲、連續缺失、摩擦變化、不同速度、放低階段、視覺或真實機器人。只有故障停止，沒有重新抓取、恢復規劃或實體急停。完整VL01與M4/M5路線保持原狀態。

下一步應凍結規則後掃描異常持續時間與取樣間隔，再補上觀測新鮮度檢查。先弄清「可以等多久、資料多久算過期」，再討論恢復。規劃已寫回既有研究待辦，本輪未把它算作完成結果。
