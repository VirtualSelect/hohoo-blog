---
title: "具身智能實踐（十三）：下降中斷之後，應該從哪一步恢復？"
description: "18 個 MuJoCo 回合與同步回放，將階段契約接入恢復預算，區分正常下降誤停、物理放置和控制器終止。"
slug: "/embodied-ai/mujoco-phase-recovery"
status: "published"
published_at: "2026-10-04"
updated: "2026-10-04"
reading_minutes: 13
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:phase-recovery", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-abort-exit", "doc:embodied-ai/mujoco-phase-contracts", "doc:embodied-ai/mujoco-completion-lifecycle"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/ad2e33523e8e5580da90ae914e1cccf765c8d1b1/experiments/vl01_phase_recovery) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/ad2e33523e8e5580da90ae914e1cccf765c8d1b1/evidence/phase-recovery-20261004) · [實驗檔案](/labs/phase-recovery)

上一輪發現，下降階段即使暫時失去觀測，`transfer-only` 門控也不會響應。擴大監控範圍似乎很直接：讓下降也使用同一套抓取檢查。

但搬運要求方塊保持一定高度，下降本來就要把它放低。把條件直接複製過去，正常運動會被當成故障。這一輪把階段契約、恢復視窗和恢復軌跡真正接在一起，檢查系統在**什麼時候暫停、憑什麼恢復、恢復到哪一步**。

## 先看回放：三個控制器遇到同一次間斷

影片來自已經保存的 MuJoCo 狀態。每畫面同一時刻讀取同一取樣 tick，沒有重新運行物理來拼接“更好的結果”。左側只監控搬運，中間讓下降重用搬運規則，右側使用階段感知規則。

<video src="/media/practice/phase-recovery-replay.mp4" controls preload="none" width="1440" height="384" poster="/media/practice/phase-recovery-poster.png" aria-label="下降後段觀測間斷的三策略同步回放">瀏覽器不支援影片，請查看下方軌跡圖與原始狀態檔案。</video>

這一組觀測間斷發生在 6.10～6.34 秒。中間控制器在間斷發生之前，已經因為正常下降誤停；左側無視間斷繼續執行；右側暫停，重新積累證據後繼續下降。

## 凍結了哪些條件

沿用同一桌面、雙指夾爪、方塊與目標盒，物理步長 2ms，每回合 12 秒。沒有訓練策略，沒有接入 ROS2 或真實機器人。

| 條件 | 干預 |
| --- | --- |
| 無故障 | 不注入干預 |
| 搬運間斷 | 4.60～4.84 秒不交付觀測包 |
| 下降前段間斷 | 5.60～5.84 秒不交付觀測包 |
| 下降後段間斷 | 6.10～6.34 秒不交付觀測包 |
| 下降永久間斷 | 5.60 秒起不再交付觀測包 |
| 下降鬆爪 | 5.60～5.84 秒強制夾爪張開，觀測仍正常 |

每種條件對照三個策略，共 18 回合。干預按絕對模擬時間注入；控制策略一旦改變軌跡，同一個時段不保證遇到完全相同階段。分析必須查看 `scheduled_phase` 和事件記錄，不能只看條件名稱。

所有策略保留最多兩次恢復、至少 400ms 暫停、800ms 恢復截止時間。終止後統一保持當時目標，不混入上一輪的不同退出動作。

## 哪個條件應該屬於哪個階段

| 策略 | 搬運時檢查 | 下降時檢查 |
| --- | --- | --- |
| transfer-only | 雙指接觸、抓取誤差、方塊高度 | 不檢查 |
| reuse-transfer | 同上 | 直接複製搬運規則 |
| phase-aware | 雙指接觸、誤差小於 5cm、方塊高於 12cm | 雙指接觸、誤差小於 5cm |

下降去掉高度下限，不意味著下降時什麼都不檢查。接觸、相對位置誤差和觀測新鮮度仍然有效。是否已經正確放置，使用最後 500ms 的物理記錄另行驗收，不能用“下降階段允許低高度”代替完成條件。

<img src="/media/practice/phase-recovery.png" width="1500" height="600" loading="lazy" alt="無故障與下降後段間斷軌跡：重用搬運高度規則造成誤停，階段感知恢復繼續下降" />

## HOLD 不能覆蓋被中斷的階段

執行狀態有 `running / hold / aborted`，作業階段有 `transfer / lower / release`。它們是兩套不同維度。

當下降進入 HOLD 時，需要保存 `interrupted_phase=lower`。如果下一輪將這個欄位改成 `hold`，控制器就丟失了判斷觀測和重建軌跡的上下文。

本輪僅在正常執行、作業階段改變時更新上下文；暫停期間保留原階段。暫停截止時間也不會因為上層傳入了 `release` 或 `hold` 而重新開始。

```python
if self.state == 'running' and phase != self.context:
    self.context = phase
    self.bad_since = None
```

暫停後的恢復證據繼續沿用之前的要求：必須是 HOLD 之後采集、時間連續、仍然新鮮的合格觀測視窗。只是其中“合格”的定義現在依賴被中斷階段。

## 恢復下降，不應該再升回搬運高度

舊恢復路徑總是先回到 18cm 搬運終點，再做下降。現在根據保存的階段選擇路徑：

```text
搬運中斷：當前測量夾爪位置 → 搬運終點 → 下降 → 鬆爪 → 後退
下降中斷：當前測量夾爪位置 → 下降終點 → 鬆爪 → 後退
```

第一段統一用 0.5 秒平滑連接。這裡是固定目標的簡單軌跡拼接，不是避障規劃、重抓取或最優控制。起點使用恢復時測量的夾爪位置，避免假設機器人仍處在原計畫位置。

## 實測：下降後段的 400ms 暫停

階段感知策略在後段間斷中留下以下事件：

| 事件 | tick | 模擬時間 |
| --- | ---: | ---: |
| 觀測變舊，進入 HOLD | 3071 | 6.142s |
| 新的連續合格視窗開始 | 3171 | 6.342s |
| 滿足暫停下限，恢復 lower | 3271 | 6.542s |

恢復後從當時夾爪位置直接繼續下降，最終方塊中心高度約 25.98mm，接觸目標盒底，最後 500ms 滿足沿用的放置條件。

相比之下，`reuse-transfer` 在 **6.002s** 就因高度下降而進入 HOLD，6.802s 因無法重新滿足搬運高度而終止。這發生在 6.10s 注入觀測間斷之前。因此不能把這個失敗歸因於斷流；無故障組也在同一時刻誤停。

## 物理上在盒里，不代表控制流程完成

下面報告的是**物理放置驗收**，不是成功率估計。固定場景每格只運行一次，沒有隨機初始化或統計置信區間。

| 條件 | transfer-only | reuse-transfer | phase-aware |
| --- | --- | --- | --- |
| 無故障 | 滿足 | 不滿足，誤停 | 滿足 |
| 搬運間斷 | 滿足，恢復 1 次 | 不滿足，下降誤停 | 滿足，恢復 1 次 |
| 下降前段間斷 | 滿足，未監控 | 不滿足，恢復後誤停 | 滿足，恢復 1 次 |
| 下降後段間斷 | 滿足，未監控 | 不滿足，干預前已誤停 | 滿足，恢復 1 次 |
| 下降永久間斷 | 滿足，未監控 | 不滿足，終止保持 | 不滿足，終止保持 |
| 下降鬆爪 | 滿足 | 滿足，但已終止 | 滿足，但已終止 |

兩個地方不能省略說明。

**永久丟失觀測時，transfer-only 仍然完成了固定軌跡。** 這證明這個場景的開環軌跡碰巧足夠，不證明“忽略觀測更安全”。階段感知策略在 5.642s 暫停、6.442s 終止，方塊停留在約 157.81mm，未完成放置。

**鬆爪故障時，方塊剛好在盒子上方落下。** 兩個監控下降的控制器都檢測到接觸失敗並終止，但方塊最終滿足物理驗收。這不是控制器成功恢復，也不是設計好的鬆爪策略。若只統計“方塊是否在盒里”，就會把偶然落入目標的事故獎勵為成功。

本輪 18 回合中有 12 回合滿足物理驗收；其中 2 回合控制器處於終止狀態。後續評價至少應分別保留物理結果、觀測合規性和控制器生命周期，不能合成一個未經定義的成功數字。

## 如何確認這些不是畫出來的結論

歸檔包含 108,000 行控制與觀測記錄、10,800 個可回放狀態、54 份原始檔案。審計重新計算最終放置條件、檢查觀測間斷與鬆爪注入時段、核對恢復視窗和預算，並驗證 18 組策略比較在首次決策分歧之前的物理軌跡一致。

8 個契約測試覆蓋低高度下降、低高度搬運、暫停階段保留、絕對截止時間、釋放階段不觸發新門控、接觸失敗、恢復路徑和預算耗盡。

回放呼叫 `mj_forward` 根據已保存的 `qpos/qvel` 更新可視狀態，不呼叫 `mj_step` 產生新的實驗軌跡。[MuJoCo 模擬文檔](https://mujoco.readthedocs.io/en/stable/programming/simulation.html)解釋了這兩個操作的區別。回放是證據的展示方式，不增加實驗樣本數。

## 重現與邊界

在 `hohoo-embodied-agent` 倉庫的現有 MuJoCo 環境執行：

```text
python -m unittest discover -s experiments/vl01_phase_recovery -p test_gate.py
python experiments/vl01_phase_recovery/run.py --out evidence/my-run
python experiments/vl01_phase_recovery/audit.py evidence/my-run
python experiments/vl01_phase_recovery/replay.py --evidence evidence/my-run
```

本次運行使用 MuJoCo 3.3.7、NumPy 2.2.6、Python 3.12.14。回放需要現有的 imageio/FFmpeg 與可用渲染環境。

結果只覆蓋固定模擬、固定目標和上述干預。它沒有證明真實硬件安全，沒有解決永久缺測後的安全撤離，也沒有重抓取。完整 VL01 與更高階段里程碑仍未完成。

接下來最值得驗證的不是再提高一個總分，而是將“完成”契約接入當前階段恢復鏈：**什麼時候允許宣布完成，終止後偶然落入目標應當如何記錄，完成後觀測失效又該如何撤銷狀態。** 這一輪先把恢復階段與物理結果分開，給後續組合留下可審計的基礎。
