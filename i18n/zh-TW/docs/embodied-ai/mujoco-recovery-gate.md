---
title: "具身智能實作（五）：通訊恢復了，為何還不能立刻繼續搬運？"
description: "18回合 MuJoCo 對照：舊正常包使基線反覆啟停卻最終成功；以連續新證據與剩餘路徑規劃重新定義恢復。"
slug: /embodied-ai/mujoco-recovery-gate
status: published
published_at: "2026-09-30"
updated: "2026-09-30"
reading_minutes: 12
domain: embodied-ai
article_kind: case-study
difficulty: intermediate
related: ["doc:embodied-ai/mujoco-observation-freshness","doc:embodied-ai/mujoco-transfer-monitor","lab:recovery-gate","project:hohoo-embodied-agent"]
---

[上一輪](/docs/embodied-ai/mujoco-observation-freshness)已能識別過期觀測並停止搬運。問題隨之改變：**通訊恢復了，原來的動作是否就可以繼續？**

這輪的重要反例是：收到訊息就恢復的策略，在舊正常封包重送時恢復9次，其中8次沒有滿足新鮮抓取證據，最後卻仍完成放置。只看終點，會把中間的反覆啟停全部藏起來。

[完整程式碼與重現方法](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/020db41b883221afde673e33ff6f322e004f12ad/experiments/vl01_recovery_gate) · [原始資料與圖表](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/020db41b883221afde673e33ff6f322e004f12ad/evidence/recovery-20260930) · [獨立稽核](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/020db41b883221afde673e33ff6f322e004f12ad/evidence/recovery-20260930/audit.json)

## 1. 從「應該停」到「何時能繼續」

一次通訊間斷可能是方塊仍夾在手裡，只是訊息暫時沒有送達；也可能夾爪已鬆開，而新狀態尚未被接收。恢復連線只是傳輸層事件，不能直接滿足搬運的前置條件。

因此要依序回答：收到的是新觀測還是舊訊息；新觀測是否持續支持「還抓著方塊」；舊軌跡對應的時刻是否已過去？前兩項決定能否恢復，第三項決定恢復後的目標。

## 2. 場景與凍結協定

沿用同一 MuJoCo 笛卡兒夾爪、方塊、托盤與原始動作。環境為 Python 3.12.14、MuJoCo 3.3.7、NumPy 2.2.6；正式執行前於提交 `8142cdb` 凍結協定。

| 項目 | 設定 |
|---|---|
| 物理與控制步長 | 2ms |
| 觀測取樣 | 20ms |
| 故障開始 | 4.8s，搬運階段 |
| 訊息間斷 | [4.8, 5.04)，240ms |
| 過期門檻 | 觀測年齡達到60ms |
| 持續異常門檻 | 壞觀測跨度達到40ms |
| 恢復確認 | 至少100ms連續有效新觀測 |
| 最長等待 | 停止後600ms |
| 共同終點 | 10.8s |
| 對照規模 | 6條件 × 3策略 = 18回合，每格一次 |

這是固定條件的確定性模擬，不是18次獨立隨機試驗，也不估計部署成功率。觀測來自模擬真值，不包含相機辨識。

## 3. 六種條件各改變什麼？

| 條件 | 處理 |
|---|---|
| clean | 無擾動 |
| delay-40ms | 每份觀測固定延遲40ms送達 |
| reordered | 故障開始後每第三包延遲80ms，允許新包先到 |
| gap | 間斷期間不投遞，恢復後只送新觀測，不追發積壓封包 |
| stale-replay | 間斷後重送最後一個正常舊包，直到5.2s |
| gap-and-drop | 通訊間斷，同時實際打開夾爪 |

掉落由致動器鬆爪造成，方塊仍依接觸與重力運動，沒有直接改寫位置。延遲與亂序不強制產生停機；沒有停機也是需要保留的結果。

## 4. 三種策略如何決定恢復？

**鎖存停止（latched）**：觸發停止後保持目標，600ms後中止，不恢復。

**收到即恢復（receipt）**：只要合法訊息抵達就恢復，不檢查是否重複、過期或仍支持抓取，並沿用牆鐘時間的原軌跡。這是刻意保留的反例基線。

**重新驗收（revalidate）**：擷取順序嚴格遞增且晚於此次停止；年齡小於60ms；雙側接觸成立、方塊高度大於0.12m、與夾爪中心距離小於0.05m；連續跨度至少100ms，相鄰擷取間隔不超過20ms。

條件失效就清空確認窗口。600ms截止時先判斷中止，不能在同一tick壓線恢復。這些值是教學場景協定，不是通用機器人安全門檻。

## 5. 舊包為何造成反覆啟停？

下列是 `stale-replay` 的實際紀錄：

| 時刻 | 事件 |
|---|---|
| 4.782s | 間斷前最後一個正常觀測被擷取 |
| 4.842s | 年齡達到60ms，觸發停止 |
| 5.042s | 舊包再送達，收到即恢復立即放行；擷取年齡已260ms |
| 其後 | 過期證據再次觸發停止，後續重複投遞又放行 |
| 5.302s | 重新驗收取得100ms連續新證據，第一次恢復 |

收到即恢復累計9次恢復，其中8次使用過期證據。必須同時檢查事件與最終任務結果。

![三種條件下的實際停止與恢復決定：舊包重送導致基線反覆啟停，重新驗收等待連續新證據](/media/practice/recovery-decisions.png)

圖表來自控制紀錄；橫軸是模擬時間，不是相機畫面或實體機器人錄影。

## 6. 為何要重新規劃剩餘路徑？

保持目標期間，程式時間與物理狀態仍在變化。直接查詢當下牆鐘時間的舊目標，可能跳過尚未執行的路徑段。

本實作從**恢復時實測夾爪位置**生成前往原搬運終點的1.5s軌跡，再接回下降、鬆爪、撤離與穩定階段。hold保持致動器目標，並不凍結物理狀態。

![通訊恢復後的夾爪實測路徑：重新驗收從目前狀態繼續，真正掉落時維持停止](/media/practice/recovery-paths.png)

此策略同時改變恢復條件與軌跡，不能將所有差異歸因於100ms窗口。要分離原因，需要分別開關門控與重新規劃的消融對照。

## 7. 完整18回合結果

| 條件 | 鎖存停止 | 收到即恢復 | 重新驗收 |
|---|---|---|---|
| 無擾動 | 放置成功 | 成功 | 成功 |
| 固定40ms延遲 | 成功 | 成功 | 成功 |
| 每第三包延遲80ms | 成功 | 成功 | 成功 |
| 240ms通訊間斷 | 中止，未放置 | 1次恢復，成功 | 1次恢復，成功 |
| 舊正常包重送 | 中止，未放置 | 9次恢復，8次證據不足；最終成功 | 1次恢復，成功 |
| 間斷並鬆爪 | 中止，未放置 | 6次恢復，均證據不足；未放置 | 不恢復，中止 |

「證據不足」定義為恢復時年齡達60ms，或抓取狀態謂詞不成立，不代表實體機器人必然危險。

純通訊間斷時重新驗收於5.142s恢復，舊包重送為5.302s；真正鬆爪則於5.442s到達期限並中止。最後一項未完成放置，仍可能代表門控正確拒絕不成立的繼續動作。

## 8. 如何核對決策前的狀態？

獨立稽核不呼叫 `Gate` 決策實作，而是讀取CSV和儲存狀態：

- 從軌跡重新計算18回合終點條件；
- 12組策略決策前狀態前綴相同，qpos、qvel、ctrl最大絕對差為0；
- 兩個重新驗收窗口滿足順序、時間、年齡與抓取謂詞；
- 記錄108份原始檔案SHA-256，另核對舊包忽略與中止期限；
- 新增18項邊界測試與先前41項測試皆通過。

這能發現紀錄與邏輯邊界問題，不是另一套物理引擎的交叉驗證。

## 9. 重現與原始產物

在具身工程根目錄執行，使用新輸出目錄：

```bash
.venv/Scripts/python experiments/vl01_recovery_gate/test_gate.py
.venv/Scripts/python experiments/vl01_recovery_gate/run.py --out evidence/my-recovery-run
.venv/Scripts/python experiments/vl01_recovery_gate/audit.py evidence/my-recovery-run
.venv/Scripts/python experiments/vl01_recovery_gate/render.py evidence/my-recovery-run
```

`control.csv` 為2ms決策紀錄；`states.jsonl` 與 `trajectory.csv` 為20ms狀態；事件檔記錄停止、恢復、中止，重新規劃檔保留起點。

跨平台可執行 `portable-audit.py evidence/recovery-20260930`，只在暫存目錄恢復能匹配原雜湊的LF/CRLF換行，再執行凍結稽核，不修改證據。

## 10. 結論邊界與下一個問題

在固定場景中，持續收到訊息不足以支持恢復；連續新抓取證據與剩餘路徑規劃能區分通訊間斷與抓取丟失。

尚未驗證真實網路、時鐘偏差、視覺誤差、不同物體或故障相位。沒有重新抓取、ROS2橋接，也沒有完成完整M4/M5。下一步優先做門控與重新規劃的消融，而非立即換上更複雜的機器人。

步進與狀態基礎可參考 [MuJoCo 3.3.7 模擬文件](https://mujoco.readthedocs.io/en/3.3.7/programming/simulation.html)。程式碼、協定與原始資料共同限定本文結論。
