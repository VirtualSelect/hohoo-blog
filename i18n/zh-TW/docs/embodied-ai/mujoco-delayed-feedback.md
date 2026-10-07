---
title: "MuJoCo 延遲觀測：知道舊位置，能預測現在嗎？"
description: "24條配對軌跡比較即時/80ms延遲、位置噪聲和常速度外推，保留超調下降但任務仍失敗的結果。"
slug: "/embodied-ai/mujoco-delayed-feedback"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:mujoco-delayed-feedback", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-obstacle-clearance"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/experiments/planar_reach) · [原始證據](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/evidence/planar-reach-20261007) · [實驗檔案](/labs/mujoco-delayed-feedback)

控制器調得穩定、路徑也能走通，是否就足夠？前兩篇用的是即時仿真真值。這次移除障礙，保持同一控制器，只改變它什麼時候看見位置，以及看到的位置是否帶噪。

對照包括0/80ms延遲、0/10mm高斯位置噪聲，以及“直接使用舊觀測”和“用舊速度外推到現在”。三個固定種子7、19、41，總計24條軌跡。**外推降低了一部分超調，但所有80ms延遲條件仍未達到本輪穩定完成標準。**

## 先分清三個時間

~~~text
capture：仿真狀態被采樣
    + 80ms
delivery：這個包對控制器可見
decision：控制器在當前20ms周期使用最後可用包
~~~

新包還沒到達時，控制器不能偷偷讀取當前真值。CSV同時記錄物理位置和observed位置，capture_t應早于當前時刻。第一個觀測到達前輸出零力；這是協議的一部分，會影響運動起始時間。

位置噪聲只加到傳給控制器的報告，不改變物理真值。舊速度來自同一捕獲時刻的仿真真值，且沒有速度噪聲，是偏樂觀的感測器假設；并不是實現了視覺測速。

## 兩種估計器

hold直接使用最後到達的位置，直到下個包出現。predict使用：

~~~text
estimated_position = captured_position
                   + captured_velocity × (now - capture_time)
~~~

兩種策略的D項都使用舊速度。predict沒有更新速度、沒有加速度模型，也沒有Kalman濾波。控制力在變化時，常速度近似本來就會偏離真實運動；延遲還會讓速度反饋滯後。

## 實測結果不能只看一個數

| 延遲 / 噪聲 | hold穩定通過 | predict穩定通過 |
| --- | --- | --- |
| 0ms / 無噪聲 | 3/3 | 3/3 |
| 0ms / 10mm | 1/3 | 1/3 |
| 80ms / 無噪聲 | 0/3 | 0/3 |
| 80ms / 10mm | 0/3 | 0/3 |

無噪聲的三種子產生相同條件，不是三個獨立隨機樣本。噪聲組三種子也只是敏感性檢查，不是帶置信度的成功率。

80ms無噪聲時，最大超調從hold的210.7mm降到predict的52.0mm；但最終誤差由2.79mm變為26.76mm，兩者都沒有滿足“最後0.3秒始終誤差<15mm且速度<40mm/s”。只展示超調下降就宣布恢復成功，會誤導讀者。

0ms帶噪聲時，部分失敗軌跡的最終位置誤差只有1.36mm或0.30mm，仍未通過穩定窗口。它說明“最後看起來很準”與“持續穩定”不同。應同時看整個尾段的位置和速度，而非挑一幀。

![固定種子7的實際目標誤差軌跡，比較延遲、噪聲與外推](/media/practice/planar-observation.svg)

圖示僅種子7，全部種子保存在CSV，不用圖中一條線代替全部結果。

## 怎樣復核這個結論

audit.py獨立檢查每行capture_t不晚于物理時刻，再從x/y/vx/vy重算最後窗口。不要用控制器的估計位置替代真值驗收，否則估計器可能“自己證明自己成功”。

練習：選一個最終誤差很小但失敗的檔案，逐行檢查最後0.3秒，找出哪一項閾值被破壞。再把延遲減小，在新輸出目錄運行；先保留原始協議和結果，不用後驗調閾值覆蓋負結果。

## 下一步值得驗證，而不是直接宣稱實現

可以研究帶加速度的估計、速度噪聲、狀態濾波、降低控制增益或基于觀測年齡停止。但每一種都引入新假設與參數，需要成組對照。當前predict不是魯棒控制或安全保證；二維執行器也不能代表真實機械臂。

本輪把第二場景、參數、軌跡與負結果完整公開，後續應先解釋具體失敗機制，再決定增加哪一種估計器，避免把“算法名更多”當作能力提升。

## 從干凈目錄復現

使用 Python 3.12。入口一次運行這組三個主題的對照，各篇只解讀自己的子集，不把同一份記錄重復當作新增回合。

~~~sh
git clone https://github.com/VirtualSelect/hohoo-embodied-agent.git hohoo-embodied-agent-study
cd hohoo-embodied-agent-study
git checkout 831789c2a1efb4564c4cfabc2298e48e16ada879
python -m pip install -r requirements-lock.txt
python experiments/planar_reach/run.py --out outputs/my-run
python experiments/planar_reach/audit.py outputs/my-run
python experiments/planar_reach/plot.py outputs/my-run
~~~

輸出目錄必須不存在。本機驗證環境為 Windows，Linux/macOS尚未復測。不需要模型密鑰或付費服務。manifest中的程式碼凍結提交早于上方含證據的歸檔提交，源碼哈希對應實際執行檔案。
