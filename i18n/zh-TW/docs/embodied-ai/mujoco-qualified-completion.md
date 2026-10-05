---
title: "具身智能實踐（十四）：方塊落進盒子，就能宣布任務完成嗎？"
description: "8條MuJoCo軌跡、三個旁路判定器與真實回放，區分歷史放置、當前證據和恢復流程中的完成資格。"
slug: "/embodied-ai/mujoco-qualified-completion"
status: "published"
published_at: "2026-10-05"
updated: "2026-10-05"
reading_minutes: 13
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:qualified-completion", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-phase-recovery", "doc:embodied-ai/mujoco-completion-lifecycle"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/9800095689ce3893f9e7a6ec681355e76c6fcff6/experiments/vl01_qualified_completion) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/9800095689ce3893f9e7a6ec681355e76c6fcff6/evidence/qualified-completion-20261005) · [實驗檔案](/labs/qualified-completion)

上一輪[下降階段恢復](/docs/embodied-ai/mujoco-phase-recovery)留下了一個容易誤判的結果：控制器已經終止，方塊卻落進了盒子。如果只截取最後一幀，這看起來像一次成功放置。

這一輪把“完成”接回整個執行過程。核心問題是：**物理目標滿足過、當前仍滿足、控制器有資格宣布完成，是否應該用同一個布林值表示？**

## 先看最有區分度的案例

在下降鬆爪條件中，方塊於 6.102s 滿足持續放置證據；控制器於 6.442s 因重新驗收超時進入 `ABORTED`。12s 時方塊仍在目標區域，但計畫中的釋放流程沒有正常執行。

因此三個讀值分別為：

```text
曾滿足物理放置：true
當前物理放置：  VALID
有資格的完成：  ABORTED，且沒有完成時間
```

不是把物理成功改寫成失敗，而是保留它回答的問題：物體在哪里，與任務是如何走到這裡的，是兩條不同證據。

## 三個判定器觀察同一條軌跡

本輪重用 E13 的階段感知控制與 E11 的[完成有效期](/docs/embodied-ai/mujoco-completion-lifecycle)。只增加旁路觀察器，不讓觀察器改變動作。

| 判定器 | 需要什麼 | 完成後是否繼續檢查 |
| --- | --- | --- |
| 歷史物理放置 | 曾抬起，持續滿足位置、速度和接觸條件 | 不撤銷歷史事實 |
| 當前物理放置 | 相同物理條件與新鮮觀測 | 會進入 INVALID 或 UNKNOWN |
| 有資格的當前完成 | 當前物理證據，加正常釋放意圖與未終止的執行流程 | 會失效；ABORTED 是終態 |

這是 **8 條物理軌跡，每條 3 個判定讀值**，不能寫成 24 次獨立實驗。歷史判定直接保留物理觀察器是否曾有效，避免為了同一事實再維護一套物理規則。

## 怎樣定義“釋放過”

不能沿用“模擬時間超過 6.5s 就算釋放”。恢復會重建後續軌跡，正常釋放的時間可能隨之改變。

本輪只有當實際執行處於 `running`、當前動作階段為 `release`，且夾爪指令小於 0.005m 時，才記錄釋放意圖：

```python
if gate.state == 'running' and phase == 'release' and target[3] < .005:
    released = True
```

這個標記來自下發指令，**不是硬件確認，也不證明夾爪真的打開**。物理接觸和穩定性仍要靠後續觀測驗收。抬起前提也來自收到的新鮮觀測，而不是直接讀取模擬真值替觀察器作弊。

終止處理則獨立於物理判斷：

```python
if aborted or self.aborted:
    self.aborted = True
    self.start = None
    self.transition('ABORTED', now, 'controller-terminal')
    return
self.update(now, released, lifted, packet)
```

如果此前已經完成過，歷史時間仍保留；但當前狀態不能在終止後被新的“好觀測”重新變成成功。本次鬆爪案例此前並未取得完成資格，因此完成時間為空。

## 實驗設置與故障範圍

每回合 12s，MuJoCo 3.3.7 以 2ms 步長推進。每 20ms 發送一條觀測；證據超過或等於 60ms 未更新即過期。連續放置窗口為 250ms，受取樣間隔影響，本輪實際從第一條好觀測到確認需要 260ms。

物理謂詞繼續使用原場景：x、y 與盒心偏差小於 45mm；z 與 26mm 的偏差小於 6mm；速度小於 0.02m/s；接觸盒底，且不接觸左右夾指。最終物理驗收檢查最後 500ms，而完成觀察器使用收到的包。

| 條件 | 注入內容 |
| --- | --- |
| 正常 | 無故障 |
| 下降短暫缺測 | 5.6—5.84s 不發送觀測 |
| 下降鬆爪 | 5.6—5.84s 將夾爪命令改為打開 |
| 下降永久缺測 | 5.6s 後不再發送觀測 |
| 釋放後推動 | 8—8.08s 施加 x 方向 1N 外力 |
| 釋放後靜默 | 8—8.4s 不發送觀測 |
| 單條壞觀測 | 8.202s 把收到的 x 位置改為 0.5m，物理狀態不變 |
| 重放舊觀測 | 8—8.4s 重複發送 8s 前最後一個包，保留舊取樣時間 |

## 最終狀態揭示了哪些差別

| 條件 | 最終物理驗收 | 歷史放置 | 當前物理狀態 | 有資格的當前完成 |
| --- | --- | --- | --- | --- |
| 正常 | 通過 | 是 | VALID | VALID |
| 下降短暫缺測 | 通過 | 是 | VALID | VALID |
| 下降鬆爪 | 通過 | 是 | VALID | ABORTED |
| 下降永久缺測 | 未通過 | 否 | UNKNOWN | ABORTED |
| 釋放後推動 | 未通過 | 是 | INVALID | INVALID |
| 釋放後靜默 | 通過 | 是 | VALID | VALID |
| 單條壞觀測 | 通過 | 是 | VALID | VALID |
| 重放舊觀測 | 通過 | 是 | VALID | VALID |

<img src="/media/practice/qualified-completion.png" width="1500" height="600" loading="lazy" alt="下降鬆爪與釋放後推動的狀態時間線，區分物理放置有效與具備執行資格的完成。">

有兩種不同的誤讀：鬆爪組說明“當前物理有效”仍不足以代表正常任務完成；推動組說明“歷史完成”不足以代表目標現在仍滿足。三個判定器正好把兩種問題拆開。

正常組的物理完成時間是 7.102s，有資格的完成時間為 7.302s。後者在釋放意圖成立後重新收集窗口，而不借用釋放前的穩定證據。下降短暫缺測恢復後對應為 7.142s 和 7.342s。增加的等待是判定規則的結果，不是機械臂動作變慢。

## 終點相同，中間狀態可以不同

只看最終表會漏掉三個重要過程：

- **釋放後靜默**：8.042s 變為 UNKNOWN；8.402s 收到新包後重新收集；8.662s 才恢復 VALID。
- **重放舊包**：狀態時間與靜默組一致。資料一直到達，但舊的取樣時間不能刷新證據有效期。
- **單條壞觀測**：8.202s 立即 INVALID；8.222s 開始重新驗收；8.482s 恢復 VALID。方塊始終未被推動，這暴露了當前規則對單點噪聲的敏感性。

因此 `completed_at` 和 `current_validity` 都需要保留。一個用於記錄歷史，另一個用於決定下游動作現在還能否依賴這個結果。

## 觀看已記錄狀態回放

<video src="/media/practice/qualified-completion-replay.mp4" controls preload="none" width="1440" height="384" poster="/media/practice/qualified-completion-poster.png" aria-label="正常、下降鬆爪和釋放後推動三種場景的已記錄狀態回放">瀏覽器不支援影片時，可從原始證據目錄下載回放。</video>

左側正常、中間下降鬆爪、右側釋放後推動；這三幅畫面是**不同故障場景**，不是同一故障下三種控制策略的對照。標簽顯示當前完成資格。暫停在 8.4s 左右，可以同時看到正常有效、偶然放置但已終止、完成後被推離目標三種情況。

影片從存檔的 qpos、qvel 和 ctrl 恢復畫面，只呼叫 `mj_forward`，不再推進物理模擬，不計為新增回合。

## 如何重現與核查

在具身工程根目錄使用已有虛擬環境：

```text
python -m unittest discover -s experiments/vl01_qualified_completion -p test_completion.py
python experiments/vl01_qualified_completion/run.py --out evidence/my-completion-run
python experiments/vl01_qualified_completion/audit.py evidence/my-completion-run
python experiments/vl01_qualified_completion/replay.py --evidence evidence/my-completion-run
```

歸檔含 **48,000 行控制／觀測記錄、4,800 個回放狀態**，以及逐回合摘要、哈希和凍結版本。審計從原始 CSV 獨立重建三個狀態序列與最終物理驗收；七組契約測試覆蓋釋放前提、終止不可逆、歷史保留、缺測、壞觀測、舊包與時間倒退。

查看 `lower-drop/control.csv.gz` 時，將 `state_after`、`release_intent`、`current_physical`、`qualified` 並排放在一起，比只看 summary 中的 `placement` 更能解釋結果。

## 這一輪仍沒有解決什麼

觀察器目前只輸出狀態，不會在釋放後 INVALID 時自動重抓取或撤離。控制器仍可能顯示 `running`，而完成觀察器已經 INVALID；這是不同狀態機的職責邊界，不應合並成一個欄位。

單條壞包就撤銷有效性是否過於敏感，需要帶噪聲分布的獨立實驗。釋放意圖也需要在更真實的系統里升級為執行確認。當前固定模擬沒有證明真機安全、通用成功率或完整 VL01 已完成。

下一步優先驗證：**下游動作如何訂閱有效性變化，並在失效後安全停止或重新規劃**。這比繼續增加一個“成功百分比”更能檢驗完成契約是否真正被系統使用。
