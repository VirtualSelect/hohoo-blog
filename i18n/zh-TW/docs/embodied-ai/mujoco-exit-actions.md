---
title: "具身智能實踐（八）：檢測到掉落以後，夾爪應該做什麼？"
description: "15回合固定場景對照保持、鬆爪、鬆爪後退：報警相同，退出動作不同，最終放置也不同。"
slug: "/embodied-ai/mujoco-exit-actions"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:exit-actions", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-recovery-budget", "doc:embodied-ai/mujoco-release-verification"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/experiments/vl01_exit_release_budget) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634/evidence/exit-release-budget-20261003) · [實驗檔案](/labs/exit-actions)

[階段契約實驗](/docs/embodied-ai/mujoco-phase-contracts)已經解決了“正常下降被高度規則誤停”的問題，但留下了更實際的失敗：晚下降時正確報警，方塊最後仍同時接觸托盤和兩側手指，沒通過放置驗收。

繼續給監測器加條件無法直接解決它。本輪固定報警規則，只換報警之後的致動器目標，觀察控制鏈路真正發生什麼。

## 1. 為什麼保持目標不等於靜止或安全

本場景使用位置致動器，控制量是夾爪位置與手指閉合目標。保存最後一個目標，並不意味著關閉物理模擬、清零速度或移除驅動力。

在晚下降鬆爪故障中，故障結束後，保持策略又恢復到報警時保存的閉合目標。手指於是繼續向該目標運動，最後仍碰著方塊。不能把這個結果描述為有意識的重新抓取，更不能稱為硬件急停。

MuJoCo每一步根據模型與控制輸入推進動力學；本輪沒有通過修改 `qpos`把物體傳送到期望位置。相關介面背景見 [MuJoCo模擬文檔](https://mujoco.readthedocs.io/en/stable/programming/simulation.html)。

## 2. 只改變退出動作

報警仍使用E7的分階段規則：搬運要求雙指接觸、方塊高度大於12cm、夾持距離小於5cm；下降去掉高度要求。異常取樣跨越40ms，或最新觀測年齡達到60ms，鎖存停止。

| 策略 | 報警後下一控制步 | 後續 |
|---|---|---|
| `hold` | 保持所有目標 | 不恢復 |
| `open` | 保持XYZ，手指目標置0 | 保持張開 |
| `open-retreat` | 與open相同 | 200ms後，用600ms平滑將Z目標提高100mm |

三個策略沿用相同初態、2ms物理步長、20ms取樣和故障時刻。五種條件各跑一次，共15回合；運行到12秒，最後0.5秒按位置、高度、速度與無手指接觸驗收。它不是隨機樣本的成功率估計。

## 3. 完整結果，而不是只挑改善的兩行

| 條件 | 首次報警 | 保持 | 鬆爪 | 鬆爪後退 |
|---|---:|---|---|---|
| 無擾動 | 無 | 通過 | 通過 | 通過 |
| 搬運鬆爪4.8–5.04s | 4.842s | 失敗 | 失敗 | 失敗 |
| 早下降鬆爪5.6–5.84s | 5.642s | 通過 | 通過 | 通過 |
| 晚下降鬆爪6.2–6.44s | 6.242s | 失敗 | 通過 | 通過 |
| 下降丟包5.6–5.84s | 5.642s | 失敗 | 通過 | 通過 |

同條件的三策略在報警前物理狀態一致；獨立審計核對了15組策略對。這樣可以把後續差異與退出動作聯系起來，而不是比較三條一開始就不同的軌跡。

<img src="/media/practice/exit-actions.png" alt="晚下降相同報警後，三種退出動作下的方塊中心高度" width="1500" height="600" loading="lazy" />

## 4. 兩類“通過”要分別解釋

晚下降保持策略最終接觸集合是 `bin_floor|left_pad|right_pad`；兩個鬆爪策略只剩 `bin_floor`，因此通過了無手指接觸這一項。保持時中心高度約25.920mm，鬆爪後約25.980mm；這點高度差本身不是驗收差異的主要依據，接觸分離才是。

下降丟包時，物體在托盤上方，鬆爪讓它落入托盤，終點檢查也通過。這**不證明在觀測不可靠時鬆爪是通用安全動作**。本場景地形已知，下面恰好有托盤，且沒有易碎物品、人員或夾持力約束。

搬運途中掉落的三個策略全部失敗，方塊落到地面；它們沒有重新抓取、沒有尋找方塊，也沒有把它送回托盤。這個反例限制了結論：改變退出動作可以消除某些殘留接觸，但並沒有解決整個恢復任務。

早下降三者都通過，來自物體掉入托盤；同樣不能將最終落點等同於正確執行了計畫釋放流程。

## 5. 後退動作有沒有額外收益？

在這五個固定條件中，open和open-retreat的最終驗收相同。不能為了說明更復雜控制器的價值，就稱後退“進一步提升成功率”。它確實改變了夾爪路徑，但是否改善碰撞余量、接觸力或後續任務便利，需要另外的測量。

本輪只在共同報警後比較指定動作，沒有疊加恢復門控或視覺重抓取，也沒有測接觸力峰值。完整任務的退出策略通常需要考慮當前空間位置和可用支撐面，不能只由一個報警布爾值決定。

## 6. 重現與原始過程

```sh
python -m unittest discover -s experiments/vl01_exit_release_budget -p "test_*.py"
python experiments/vl01_exit_release_budget/run.py --out evidence/my-exit-series
python experiments/vl01_exit_release_budget/audit.py evidence/my-exit-series
```

運行命令會執行E8–E10完整32回合。每回合保存壓縮的2ms控制記錄、20ms狀態快照與摘要。環境為Python3.12.14、MuJoCo3.3.7、NumPy2.2.6。審計核對控制目標、取樣投影、狀態坐標、接觸與最終驗收；沒有獨立重算接觸力。

下一篇將“發出鬆爪命令”與[“已經完成放置”](/docs/embodied-ai/mujoco-release-verification)分開，給釋放後的觀察建立判據。

## 同方向繼續閱讀

- [具身智能實踐（九）：鬆爪命令成功，不等於放置完成](/docs/embodied-ai/mujoco-release-verification)
- [具身智能實踐（十）：恢復次數受控了，為什麼任務反而沒完成？](/docs/embodied-ai/mujoco-recovery-budget)
