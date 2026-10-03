---
title: "具身智能實踐（九）：鬆爪命令成功，不等於放置完成"
description: "五條真實軌跡同時檢查單幀與持續窗口：錯誤觀測、延遲鬆爪和完成後的外力揭示驗收範圍。"
slug: "/embodied-ai/mujoco-release-verification"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:release-verification", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-exit-actions", "doc:embodied-ai/mujoco-recovery-budget"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/experiments/vl01_exit_release_budget) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/evidence/exit-release-budget-20261003) · [實驗檔案](/labs/release-verification)

上一輪研究了報警之後怎麼退出。這一輪回到正常任務末端：程式已經發出了鬆爪目標，何時可以向上層報告“物體放好了”？

如果直接在 `release()` 返回後設 `success=true`，得到的只是命令鏈路結果。手指可能卡住，物體可能還在下落，甚至已經落到托盤外。因此本輪增加一個只觀察、不改變控制器的完成驗收器。

## 1. 將命令、觀察與最終結果分開

固定腳本在6.5s進入釋放階段，手指目標隨後逐漸張開。模擬仍按2ms推進、每20ms產生觀測。兩個判據處理**同一條物理軌跡**，不會因判定不同而改變動作：

- 單幀：第一次收到滿足所有條件的新鮮觀測就報告完成。
- 持續窗口：連續合格觀測跨越至少250ms才報告完成；缺幀、過期或不合格會打斷窗口。

兩者的完成結果都鎖存。鎖存意味著“曾在某時刻滿足判據”，不是“以後永遠保持成功”。後面的外力對照專門檢驗這個區別。

## 2. 完成判據具體是什麼

先決條件是已進入計畫釋放階段，且此前方塊確實抬高過10cm。每份合格觀測還要求：

| 欄位 | 約束 |
|---|---|
| X/Y | 距托盤中心(0.24,0.12)m，每軸誤差小於45mm |
| Z | 距26mm的誤差小於6mm |
| 線速度 | 小於0.02m/s |
| 支撐 | 與 `bin_floor` 接觸 |
| 分離 | 不接觸 `left_pad` 或 `right_pad` |
| 新鮮度 | 取樣年齡小於60ms，時間戳遞增 |
| 連續性 | 相鄰有效取樣間隔不超過20ms |

這比“位置到了”更嚴格，但仍是從模擬真值投影出的教學判據，沒有相機估計誤差，也沒有驗證支撐力是否足夠。

250ms不是魔法常數。取樣間隔20ms，所以從第一份合格觀測到窗口通過，實際需要260ms，而不是把樣本數量直接乘出一個含糊的時長。

## 3. 五種條件的實際結果

| 條件 | 單幀報告完成 | 窗口報告完成 | 12s終點驗收 |
|---|---:|---:|---|
| 正常 | 6.842s | 7.102s | 通過 |
| 釋放後手指一直閉合 | 不報告 | 不報告 | 失敗 |
| 到7.0s才允許張開 | 7.042s | 7.302s | 通過 |
| 閉合故障中偽造一幀合格觀測 | 6.602s | 不報告 | 失敗 |
| 8.0s後施加短暫外力 | 6.842s | 7.102s | 失敗 |

這五條軌跡只有觀察判據的兩路評分，不是十次獨立物理試驗。沒有複製樣本來增加“實驗次數”。

<img src="/media/practice/release-verification.png" alt="單幀與持續窗口的完成時刻，以及同一軌跡的最終放置結果" width="1500" height="600" loading="lazy" />

## 4. 持續窗口擋住了什麼，又沒擋住什麼

在偽造觀測對照中，手指實際保持閉合，但6.602s的單份報告被改成：位於托盤中心、速度0、只接觸托盤底。這是明確注入的錯誤測量，不是說現實感測器必然產生這種噪聲。原始物理狀態另外保存，便於核對真假。

單幀判據立即接受；持續窗口在下一份真實的不合格觀測到來後被打斷，未報告完成。這只支持它對本次孤立錯誤報告的容忍能力，不能推斷它能抵禦持續錯誤或有系統偏差的感測器。

外力對照則完全不同：方塊先真的穩定放好，兩種判據都正確報告了當時的狀態。隨後8.0–8.08s施加沿X方向1N外力，最終狀態不再滿足放置要求。不能倒過來稱早先的報告必定是假陽性；它暴露的是鎖存事件和持續保證之間的範圍差別。

## 5. 成功應該是事件，還是持續狀態？

如果任務只負責把物體放下，完成事件可以交接給下一階段。如果任務還要保證物體在等待期間不被碰走，那麼驗收之後仍應監測，必要時撤銷當前狀態或發出新事件。

一個實用的介面可以分別保留 `completedAt`、`currentlyValid`與 `invalidatedAt`。本篇只實現前者，後兩者仍是下一步，不在介面上偽裝成已有安全功能。

也不要把連續合格窗口看成統計置信度。相鄰取樣高度相關，13個間隔不是13個獨立證明。

## 6. 重現與檢查

```sh
python experiments/vl01_exit_release_budget/run.py --out evidence/my-release-series
python experiments/vl01_exit_release_budget/audit.py evidence/my-release-series
```

在E9目錄查看 `received`與物理 `contacts/cube_*`，可以直接發現故意注入的那一幀差異。每回合的 `single_completion`、`window_completion`與 `placement`分開保存；獨立審計逐行重算窗口，而不是相信摘要裡的成功值。

下篇轉向[恢復次數與冷卻](/docs/embodied-ai/mujoco-recovery-budget)。它同樣要把“規則被遵守”與“任務完成”分開評估。

## 同方向繼續閱讀

- [具身智能實踐（八）：檢測到掉落以後，夾爪應該做什麼？](/docs/embodied-ai/mujoco-exit-actions)
- [具身智能實踐（十）：恢復次數受控了，為什麼任務反而沒完成？](/docs/embodied-ai/mujoco-recovery-budget)
