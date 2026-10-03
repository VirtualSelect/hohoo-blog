---
title: "具身智能實踐（十一）：已經放好了，為什麼還要撤銷“完成”？"
description: "七條 MuJoCo 軌跡與雙畫面回放，將歷史完成事件和當前有效狀態分開，保留傳感誤報與過期邊界。"
slug: "/embodied-ai/mujoco-completion-lifecycle"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 11
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:completion-lifecycle", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-release-verification", "doc:embodied-ai/mujoco-recovery-budget"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/cd26180e8560155d18c45d34a33dc9ef25bbcdf6/experiments/vl01_completion_lifecycle) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/cd26180e8560155d18c45d34a33dc9ef25bbcdf6/evidence/completion-lifecycle-20261003) · [實驗檔案](/labs/completion-lifecycle)

上一輪釋放驗收有一個很具體的反例：物體先在托盤目標區域穩定了足夠久，程序報告完成；隨後外力把它推離合格區域，最終放置失敗，但已經鎖存的完成標志仍然為真。

這個標志沒有記錄錯歷史。錯誤在於上層把“曾經通過驗收”當成“現在仍然可用”。本篇將兩者拆開：`completed_at` 保留第一次完成事件，`state` 根據持續觀測更新。新增七條真實 MuJoCo 軌跡，直接檢查推力、靜默、舊包重送和單幀錯誤報告。

## 1. 先看同一動作的兩種結局

左側正常運行，右側在 8.0 到 8.08 秒向方塊施加 x 方向 1N 外力。兩者此前使用同一個場景、動作序列與驗收條件。

<video src="/media/practice/completion-replay.mp4" controls preload="none" width="1280" height="448" poster="/media/practice/completion-replay-poster.png" aria-label="正常與外力擾動的MuJoCo記錄回放，顯示歷史完成和當前有效狀態">當前瀏覽器無法播放視頻，請查看下方時間表及原始記錄。</video>

回放直接讀取歸檔的 qpos、qvel 和狀態事件，再用 `mj_forward` 更新渲染，不重新推進動力學，不算新增實驗回合。畫面中的 `historical=True` 只表示曾經完成，`current=VALID/INVALID` 表示當前驗收狀態。視頻沒有聲音，關鍵結果也完整列在下面。

兩條軌跡都在 **7.102 秒**首次完成。右側在 **8.022 秒**撤銷當前有效性，歷史完成時刻仍然保留。完整軌跡到 12 秒結束；最後 0.5 秒的放置驗收，正常條件通過，外力條件失敗。

## 2. 為什麼一個布爾值不夠

本輪用五個互斥狀態表達當前觀察結果：

| 狀態 | 含義 | 上層不能誤解成什麼 |
| --- | --- | --- |
| NOT_READY | 尚未滿足抬升與釋放階段前提 | 已經開始驗收 |
| UNKNOWN | 缺乏足夠新鮮或有效的觀測 | 已知物體掉落 |
| INVALID | 新鮮觀測違反放置條件 | 永久不可恢復 |
| VERIFYING | 有合格觀測，正在積累持續窗口 | 已完成 |
| VALID | 連續窗口滿足要求且觀測仍新鮮 | 此後永遠成功 |

`completed_at` 則是一個獨立、只記錄一次的歷史欄位。失敗後的重新驗收不會改寫這個首次時刻。這樣既能回答“任務曾在何時完成”，也能回答“現在能不能把結果交給下一階段”。

注意，本例只觀察，不自動執行重新抓取或恢復動作；狀態撤銷與動作決策是兩層不同的職責。

## 3. 把空間、接觸與時間條件寫進契約

物理步長為 2ms，每 20ms 產生一次觀測，持續窗口至少 250ms，觀測年齡達到 60ms 即過期。使用整數 tick 計算邊界，避免依賴浮點秒數是否恰好相等。

合格觀測要求方塊 x/y 距離目標中心 `(0.24, 0.12)` 分別小於 0.045m，z 距離 0.026m 小於 0.006m，速度小於 0.02m/s，接觸 `bin_floor`，並且不接觸左右手指。之前還必須曾抬高到 0.1m 以上，並進入釋放階段。

連續觀測的捕獲時刻間距不能超過 20ms；重復或亂序包不能刷新新鮮度。窗口至少 250ms，而取樣以 20ms 為單位，因此本輪實際需要跨越 260ms。`VALID` 是這些具體條件下的觀察狀態，不是通用機器人安全認證。

舊版最終放置驗收重用 VL01 的最後 0.5 秒位置、速度、抬升和無手指接觸要求；當前觀察器額外要求 `bin_floor` 接觸。兩者分別保存，不能把末端驗收結果當作持續狀態的別名。

## 4. 在新包到達之前先檢查證據是否過期

更新順序影響邊界行為。先檢查上一份可信捕獲是否已過期，再處理新到達的包：

```python
if self.last is None or now - self.last >= self.age:
    self.start = None
    self.transition('UNKNOWN', now, 'no-fresh-evidence')
if packet is None:
    return
# 在這裡驗證包格式，並忽略重復、亂序或過期的捕獲。
if not placed(packet):
    self.start = None
    self.transition('INVALID', now, 'fresh-violation')
    return
```

為什麼不能“只要本次有新包，就認為沒有斷過”？因為包剛好在 60ms 截止時到達時，舊證據已經不能繼續支持原來的穩定窗口。新包可以開啟新的驗證，不能把空檔擦掉。

這種順序在 `boundary-gap` 中產生兩個同 tick 的事件：8.042 秒先 UNKNOWN，再 VERIFYING。匯總曲線每個物理 tick 只畫最後狀態，因此看不到寬度為零的 UNKNOWN 段；逐事件列表保留了這次重置。不要只看圖而忽略紀錄粒度。

## 5. 七種條件的實際結果

兩種觀察器處理同一物理軌跡，因此是七個回合，不是十四個。所有條件第一次完成都是 7.102 秒，舊版完成標志此後不再變化。

<img src="/media/practice/completion-lifecycle.png" alt="七種條件下當前驗收狀態的時間條：外力觸發無效，靜默和舊包觸發未知，恢復後重新驗證；歷史首次完成均為7.102秒" width="1500" height="600" loading="lazy" />

| 條件 | 關鍵變化時刻（秒） | 最後放置驗收 |
| --- | --- | --- |
| 正常 | 7.102 VALID，此後保持 | 通過 |
| 外力推移 | 8.022 INVALID | 失敗 |
| 8.0–8.4 秒靜默 | 8.042 UNKNOWN → 8.402 VERIFYING → 8.662 VALID | 通過 |
| 同期重復舊正常包 | 與靜默相同 | 通過 |
| 單幀錯誤壞觀測 | 8.002 INVALID → 8.022 VERIFYING → 8.282 VALID | 通過 |
| 推移後插入單幀假正常包 | 8.202 VERIFYING → 8.222 INVALID，未重新有效 | 失敗 |
| 截止邊界恢復收包 | 8.042 UNKNOWN/VERIFYING → 8.302 VALID | 通過 |

靜默與重送舊包具有相同結果，說明“持續收到網路包”不能替代“持續獲得新觀測”。推移後的單幀假正常包只能啟動驗證，不能憑一幀重建有效狀態。

## 6. 最重要的負結果：壞觀測也會觸發撤銷

`false-bad` 沒有改變物理世界，只把 8.002 秒那一份收到的 x 坐標改成 0.4m。真實方塊仍穩定，但立即撤銷策略仍然進入 INVALID，並花到 8.282 秒才重新有效。

這是保守撤銷的代價，不能只展示推力案例就稱為“誤報問題已解決”。本實現對重新建立有效性使用持續窗口，對撤銷卻采用單幀觸發；它容忍孤立的假正常報告，卻不容忍孤立的假異常報告。

下一步可以比較撤銷滯回或連續異常確認，但必須同時衡量真實偏移的檢測延遲。此前搬運實驗已展示過這類權衡，本輪沒有順手選擇一個“看起來更好”的閾值來隱藏誤報。

## 7. 哪些是物理證據，哪些是傳感故障

每個回合分別保存三類檔案：2ms 控制與物理記錄、20ms 的完整 qpos/qvel 狀態，以及狀態事件匯總。收到的 packet 與真實 cube 位置、速度、接觸分別記錄。

獨立審計不用控制器或 MuJoCo，讀取 21 份逐回合檔案，重算狀態、完成時刻、最終放置和故障時間表，並核對原始碼/原始檔案哈希。它還驗證五組物理軌跡一致：正常對四種純傳感故障，推移對推移後假正常包。這樣才能說明傳感故障組沒有暗中改變控制結果。

九個狀態邊界測試加三個證據測試通過；後者包含“修改狀態並重算檔案哈希仍被發現”和“漏掉一個實驗條件被發現”。哈希只說明檔案一致，獨立重算才檢查部分內容是否自洽。這仍不是對物理接觸力、所有故障或真實硬體的形式證明。

## 8. 從程式碼重跑與復核

使用具身倉庫現有環境：Python 3.12、MuJoCo 3.3.7、NumPy 2.2.6。從 `hohoo-embodied-agent` 根目錄執行：

```powershell
python experiments/vl01_completion_lifecycle/run.py --out evidence/MY-E11
python experiments/vl01_completion_lifecycle/audit.py evidence/MY-E11
$env:E11_EVIDENCE = (Resolve-Path evidence/MY-E11).Path
python -m unittest discover -s experiments/vl01_completion_lifecycle -p "test_*.py"
python experiments/vl01_completion_lifecycle/replay.py --evidence evidence/MY-E11
```

以上是 PowerShell 命令；其他終端用對應方式設置 `E11_EVIDENCE`。回放額外使用已有的 imageio/FFmpeg 和 Pillow；數字實驗不依賴渲染。不設置該環境變量時，三個證據測試會跳過，九個狀態測試仍運行。也可以將變量指向現有歸檔單獨復核。輸出目錄必須不存在，保留舊結果。

關於推進物理與僅更新派生量的區別，見 [MuJoCo 官方 simulation 文檔](https://mujoco.readthedocs.io/en/stable/programming/simulation.html)。本輪回放使用後者展示存檔狀態，沒有重新模擬一條“更好看”的軌跡。

這次完成的是驗收狀態生命周期，完整 VL01、真機安全、退出動作與恢復預算的組合仍未完成。可以把下一階段的接收條件寫得更清楚了：既讀取歷史事件，也驗證交接時刻的當前證據；不能只讀取一個永不清零的 success。
