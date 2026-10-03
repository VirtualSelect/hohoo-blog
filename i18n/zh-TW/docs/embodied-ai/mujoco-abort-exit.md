---
title: "具身智能實踐（十二）：恢復預算耗盡之後，夾爪應該做什麼？"
description: "12 個 MuJoCo 回合與三畫面回放，對比保持、鬆爪、鬆爪後退，區分終止決定與實際退出後果。"
slug: "/embodied-ai/mujoco-abort-exit"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 12
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:abort-exit", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-recovery-budget", "doc:embodied-ai/mujoco-exit-actions", "doc:embodied-ai/mujoco-completion-lifecycle"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/2cf78a9afce618ea8ce35a882f0db203b2a74f57/experiments/vl01_abort_exit) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/2cf78a9afce618ea8ce35a882f0db203b2a74f57/evidence/abort-exit-20261003) · [實驗檔案](/labs/abort-exit)

恢復預算耗盡，狀態機進入 `aborted`。接下來夾爪應該做什麼？繼續夾住、立即松開，還是松開後抬離現場？

之前的 E8 比較過退出動作，E10 限制過恢復次數，但兩者還沒有組合驗證。這一輪固定 E10 的監控與恢復條件，只替換**終止後的執行動作**，跑了 12 個 MuJoCo 回合。結果很直接：兩組搬運階段中斷條件下，三種退出動作都沒有完成放置；它們只是留下了不同的物理後果。

這篇記錄失敗的差別，也回答一個工程問題：**決定不再繼續任務，與決定執行什麼退出動作，為什麼必須分開建模。**

## 先看同一次終止的三種後果

下面不是制作出來的示意動畫。三個畫面來自 `repeated-gap` 條件的歸檔狀態：每 20ms 保存一次 `qpos/qvel/ctrl`，重放時呼叫 `mj_forward` 更新可視化，不再次推進物理模擬。影片按每隔一個記錄取一幀生成 25fps，三側使用相同時間點。

<video src="/media/practice/abort-exit-replay.mp4" controls preload="none" width="1440" height="384" poster="/media/practice/abort-exit-poster.png" aria-label="重複觀測間斷下，保持、鬆爪、鬆爪後退的同時間三畫面對照回放">瀏覽器不支援影片時，可打開原始實驗記錄中的 MP4。</video>

左側保持夾持，方塊停在半空；中間鬆爪，方塊落到盒子外的地板；右側鬆爪後抬升夾爪，方塊仍在地板上。三個畫面中的盒子位置沒有變，退出前軌跡也經過逐行一致性檢查。影片展示的是腳本控制的模擬夾爪，不是真實機械臂、視覺策略或學習得到的機器人控制器。

## 兩層狀態，各自回答不同的問題

| 決策層 | 輸入 | 輸出 |
| --- | --- | --- |
| 恢復門控 | 觀測年齡、抓取證據、重新確認窗口、恢復次數 | 運行、等待或終止 |
| 退出執行 | 終止時保存的目標、經過的時間、退出策略 | 夾爪開合與位置目標 |

保持原來的恢復規則：只在 `transfer` 階段主動檢查抓取；觀測每 20ms 取樣，年齡達到 60ms 進入等待；恢復需要暫停後新鮮、連續的良好證據覆蓋至少 100ms，每次等待至少 400ms；最多恢復兩次，等待 800ms 仍未恢復則終止。

預算檢查在冷卻檢查之前：兩次恢復已經用完時，下一次滿足恢復證據的機會直接觸發預算終止，不需要再等滿 400ms。這是沿用 E10 的規則，不是根據本輪結果臨時調參。

終止本輪任務後不自動重抓，也不清零預算重新運行。`aborted` 不再退回 `running`，但物理模擬還要繼續，才能看到退出動作的後果。

## 凍結條件：四種觀測情況乘三種動作

場景、方塊、盒子、執行器、控制路徑與最終放置判據都沿用前序實驗。物理步長 2ms，每回合持續 12 秒，每個組合運行一次，沒有隨機擾動或成功率統計。

| 條件 | 故障注入 | 用途 |
| --- | --- | --- |
| clean | 無 | 確認新增退出邏輯不改變正常路徑 |
| repeated-gap | 4.3–6.94 秒，每 440ms 周期前 140ms 不發觀測 | 觸發多次暫停，最終耗盡恢復預算 |
| permanent-gap | 4.3 秒起不再發觀測 | 觸發重新確認截止時間 |
| lower-silence | 5.6–5.84 秒不發觀測 | 保留 transfer-only 監控覆蓋範圍外的對照 |

這些故障刪除的是觀察包，沒有瞬移方塊或偽造物理位置。它們按絕對模擬時間注入；不同控制器可能因暫停而處於不同階段，所以不能把結果解釋為任意任務階段都具有相同暴露時間。

三種動作只在終止後的下一物理步生效：

- `hold`：繼續使用保存的夾持和位置目標。
- `open`：位置不變，夾爪開合目標設為 0。
- `open-retreat`：先鬆爪；200ms 後，在 600ms 內按 smoothstep 將高度目標提高 100mm。

`hold` 也不是斷電停機。執行器仍在追蹤目標、持續施加控制，這份實驗沒有測熱量、力限值或能耗。

## 實際結果：終止一致，物理後果不同

| 條件 | 終止時間 | 恢復次數 | hold 最後狀態 | open / open-retreat 最後狀態 | 放置判據 |
| --- | ---: | ---: | --- | --- | --- |
| clean | 未終止 | 0 | 盒底接觸 | 盒底接觸 | 三種均通過 |
| repeated-gap | 5.422 秒 | 2 | 雙指接觸，方塊約 165.00mm 高 | 地板接觸，方塊約 19.99mm 高 | 三種均未通過 |
| permanent-gap | 5.142 秒 | 0 | 雙指接觸，方塊約 165.48mm 高 | 地板接觸，方塊約 19.99mm 高 | 三種均未通過 |
| lower-silence | 未終止 | 0 | 盒底接觸 | 盒底接觸 | 三種均通過 |

無故障與下降靜默組最終方塊中心高度約 25.98mm，與盒底接觸。表中的“通過”檢查的是最後 500ms 內位置、速度、無手指接觸以及先前確實抬起等約束；不是只在最終截圖里目測“好像進盒子了”。12 回合沒有 MuJoCo 數值警告。

重複間斷組的事件鏈可以逐步解釋：

```text
4.342s HOLD → 4.742s RESUME
4.782s HOLD → 5.182s RESUME
5.222s HOLD → 5.422s ABORT (budget)
```

永久間斷則在 4.342 秒暫停，經過 800ms 於 5.142 秒終止。兩者終止原因不同，紀錄保留 `budget` 和 `revalidation_deadline`，不能統一吞成一個模糊的“失敗”。

## 為什麼抬高夾爪仍然不算更好的恢復

<img src="/media/practice/abort-exit.png" width="1500" height="600" loading="lazy" alt="重複間斷條件下，三種退出動作的方塊和夾爪高度曲線；5.422秒終止，鬆爪兩組方塊落地，後退只抬高夾爪。" />

`open-retreat` 在視覺上更“干凈”：夾爪離開了方塊。但它沒有改變已經失去支撐的方塊落向地板這一事實。高度曲線中，鬆爪與鬆爪後退的方塊最終高度相同，夾爪高度才分開。

同樣，`hold` 保留雙指接觸，不代表任務更接近完成。它把物體繼續留在盒子外的半空。若要選擇真實系統的退出方式，還需要允許放置區域、碰撞、抓力、關節限位、人員接近等資訊；本場景無法證明任一動作“最安全”。

因此，這組實驗沒有勝出策略。它說明的是：退出策略應接受任務和環境約束，不能把一個動作模板當成所有失敗的通用補救。

## 下降靜默為什麼必須留下

`lower-silence` 最終放置成功，卻沒有觸發任何暫停或終止。原因不是靜默無害，而是本輪沿用的門控只監控搬運階段；下降階段的靜默沒有進入主動判定範圍。

這個結果限制了結論：E12 研究的是“同一終止決定之後的動作”，並沒有把 E7 的階段監控全面並入 E10。保留覆蓋範圍外的條件，可以防止讀者誤以為已得到全程故障處理器。後續要做階段監控、恢復預算和退出動作的完整組合，仍需另凍協議、另跑矩陣。

## 證據怎樣復核

每回合歸檔三個檔案：`control.csv.gz` 包含 6,000 行逐步控制/位置/觀測；`states.jsonl.gz` 包含 600 個回放狀態；`summary.json` 保存終止事件、接觸和結果。合計 72,000 行控制記錄、7,200 個狀態、36 份原始檔案。

獨立審計核對檔案哈希，重新計算故障時間表、退出目標、最終放置與狀態投影，並檢查同條件三種動作在終止之前的軌跡：四種條件共 12 組兩兩比較均一致。對無終止條件，比較覆蓋整個回合。它沒有窮盡驗證所有可能的門控輸入。

```sh
python -m unittest discover -s experiments/vl01_abort_exit -p "test_*.py"
python experiments/vl01_abort_exit/run.py --out evidence/abort-exit-MY-RUN
python experiments/vl01_abort_exit/audit.py evidence/abort-exit-MY-RUN
python experiments/vl01_abort_exit/replay.py --evidence evidence/abort-exit-MY-RUN
```

歸檔使用 Python 3.12.14、NumPy 2.2.6、MuJoCo 3.3.7。圖表依賴 Matplotlib，回放使用倉庫已有的 imageio/FFmpeg 與 Pillow。核心實驗不需要渲染；回放需要可用圖形環境。關於 `mj_step` 與派生狀態更新可查閱 [MuJoCo 模擬文檔](https://mujoco.readthedocs.io/en/stable/programming/simulation.html)。

## 下一步該補什麼

真正缺少的不是第四種固定動作，而是**終止時可用的環境資訊和退出約束**。例如，是否存在已確認可接觸的安全承托區域；觀測失效時允許移動多遠；物體掉落後是否應禁止再次閉爪。先把這些問題變成可檢驗條件，再比較策略，才可能從“停止以後做點什麼”走向有依據的故障處理。

當前結論停留在固定模擬場景。沒有 ROS2、真實機器人、學習策略或重抓取，也沒有因此宣布完整 VL01、M4/M5 已完成。
