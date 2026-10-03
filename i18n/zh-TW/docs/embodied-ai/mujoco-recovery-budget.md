---
title: "具身智能實踐（十）：恢復次數受控了，為什麼任務反而沒完成？"
description: "12回合對照無限恢復、兩次預算與400ms冷卻：分別記錄啟停、驗收窗口、終止原因和最終任務結果。"
slug: "/embodied-ai/mujoco-recovery-budget"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:recovery-budget", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-exit-actions", "doc:embodied-ai/mujoco-release-verification"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/experiments/vl01_exit_release_budget) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/evidence/exit-release-budget-20261003) · [實驗檔案](/labs/recovery-budget)

[恢復消融](/docs/embodied-ai/mujoco-recovery-ablation)已經提醒過我們，反覆恢復不能只看路徑是否平滑。系統還需要回答：最多嘗試幾次？恢復之前至少等待多久？什麼時候明確放棄？

本輪復用E5的新鮮觀測門控，加入恢復次數與最短保持時間。一個容易期待的結論是“限制越多越好”；實際結果沒有這么簡單。

## 1. 固定恢復的證據要求

搬運時觀測年齡達到60ms，進入保持；恢復必須有停止之後的新鮮、連續、合格觀測，取樣時間跨度至少100ms。雙指接觸、方塊高度和夾持距離仍必須通過。

恢復後，從實測夾爪位置重新規劃500ms搬運路徑，再執行既有下降、釋放、後退。每次保持最多800ms，超過就中止。三策略只改變次數/最短等待限制：

| 策略 | 最大恢復次數 | 最短保持時間 |
|---|---:|---:|
| `unlimited` | 本回合不設次數上限 | 0，仍需證據窗口 |
| `budget-two` | 2 | 0，仍需證據窗口 |
| `budget-two-cooldown` | 2 | 400ms，仍需證據窗口 |

“無限”仍受12秒回合時長和800ms單次保持期限約束，並非可以在真實系統里無限運行。預算計算的是實際獲準的恢復，不把每次收到包都當成一次恢復。

## 2. 四種通信條件

無擾動；一次丟包4.6–4.84s；從4.3s起每440ms丟前140ms、到6.94s結束；從4.3s起永久丟包。通信故障不直接修改物體狀態，也不偽造新的正常時間戳。

本輪仍只監測搬運，故障窗口綁定絕對模擬時間。不同保持時長會改變路徑進度與暴露，這點必須保留在解釋里，不能說是整個任務範圍內純粹的預算效應。

四條件各三策略，共12個確定性物理回合；其余場景、物理參數與初態相同。

## 3. 完整結果

| 條件 | 無次數上限 | 兩次預算 | 兩次預算＋冷卻 |
|---|---|---|---|
| 無擾動 | 0次恢復，完成 | 0次，完成 | 0次，完成 |
| 一次丟包 | 1次，完成 | 1次，完成 | 1次，完成 |
| 周期性丟包 | 6次，完成 | 2次，預算中止 | 2次，預算中止 |
| 永久丟包 | 0次，等待超時中止 | 同左 | 同左 |

周期丟包中，無上限策略雖然反覆啟停，最終仍完成放置；兩種有界策略按設計停止，方塊還被夾著，沒有完成任務。這不是需要藏起來的壞結果，而是清楚展示了“限制工作量”和“盡可能完成任務”的權衡。

<img src="/media/practice/recovery-budget.png" alt="周期丟包下三種策略的保持、恢復和預算中止時間線" width="1500" height="600" loading="lazy" />

## 4. 冷卻為什麼沒有擋住下一次立刻停機

周期故障中首次保持發生在4.342s。沒有冷卻的策略在4.542s恢復；冷卻策略等待至4.742s才恢復。然而下一次觀測過期在4.782s就發生了，恢復後只運行了40ms。

400ms最短保持約束的是“過去已經等夠多久”，並不能保證“未來至少穩定多久”。這次恢復時最新觀測仍新鮮，過去連續窗口也合格，下一段通信故障卻已經臨近。把冷卻時間叫作穩定性保證會超出它實際檢查的內容。

如果需要減少短暫恢復，可以研究更長的連續健康窗口、鏈路質量估計或明確的升級處理，但必須另做協議和對照。本篇沒有靠事後調參把曲線修漂亮。

## 5. 次數、冷卻和期限如何排序

`BudgetGate`復用已有門控，在滿足恢復證據時再檢查預算。預算已用完就進入 `aborted`；尚有預算但未達到最短保持時間，就繼續等待。800ms保持期限在基類中優先檢查，因此再好的觀測也不能越過已到期的等待上限。

```python
if resumes >= cap:
    abort("budget")
elif now - hold_tick < cooldown:
    keep_waiting()
else:
    resume_after_revalidation()
```

預算中止沿用保持目標，並沒有自動鬆爪。本例刻意沒有把[E8退出動作](/docs/embodied-ai/mujoco-exit-actions)直接混進來，否則最終放置變化又可能來自退出策略。下一步應將兩者明確組合，並重新驗證，而不是因為兩個模塊各自有測試，就宣布組合也可靠。

## 6. 驗收了什麼，沒有驗收什麼

16項測試包括門控邊界與證據篡改檢出。獨立審計檢查32回合的96份記錄、11份源檔案指紋；對E10逐次核對恢復次數、停止後連續取樣窗口、新鮮度、冷卻與等待期限。

這不是獨立重算整個物理過程或形式化安全證明。所有資料來自固定教學場景，沒有測硬件制動、負載變化、感測器誤差分布或跨場景成功率。完整VL01和M4/M5仍保持原有學習狀態。

```sh
python experiments/vl01_exit_release_budget/run.py --out evidence/my-budget-series
python experiments/vl01_exit_release_budget/audit.py evidence/my-budget-series
```

讀完可以試著先寫預期：如果預算設為0，在首次有足夠恢復證據時會怎樣？如果冷卻比保持期限還長呢？這些邊界已在單元測試中運行，它們比“加一個重試計數器”更接近實際控制器需要面對的問題。

## 同方向繼續閱讀

- [具身智能實踐（八）：檢測到掉落以後，夾爪應該做什麼？](/docs/embodied-ai/mujoco-exit-actions)
- [具身智能實踐（九）：鬆爪命令成功，不等於放置完成](/docs/embodied-ai/mujoco-release-verification)
