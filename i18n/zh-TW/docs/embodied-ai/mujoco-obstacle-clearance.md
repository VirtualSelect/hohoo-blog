---
title: "MuJoCo 繞障：路徑上的點能過去，執行器就能過去嗎？"
description: "六條實際接觸軌跡對照直達、貼邊和留餘量路徑，解釋幾何尺寸、跟蹤誤差與碰撞之間的關係。"
slug: "/embodied-ai/mujoco-obstacle-clearance"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:mujoco-obstacle-clearance", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-planar-pd"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/experiments/planar_reach) · [原始證據](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/evidence/planar-reach-20261007) · [實驗檔案](/labs/mujoco-obstacle-clearance)

上一節讓執行器在空場景停到了目標。現在在x=0.3米處放一個矩形障礙，目標仍在x=0.6米。控制器完全不變：質量1kg、Kp=80、Kd=18，仍只輸出±5N內的力。

最直觀的失敗是“直接沖過去”被擋住。更值得學習的是第二種失敗：為球心安排一條剛好擦過障礙邊緣的折線路徑，球卻仍卡住了。**幾何路徑必須考慮物體體積，執行中的跟蹤誤差還需要額外余量。**

## 三種路徑

障礙沿x的半寬40mm，沿y的半寬分別40mm或90mm；執行器球半徑35mm。

| 路徑 | 中間目標 |
| --- | --- |
| direct | 直接使用終點(0.6,0) |
| corner | (0.16,h) → (0.44,h) → 終點 |
| clearance | (0.16,h+0.1) → (0.44,h+0.1) → 終點 |

h是障礙的y半寬。corner把球心高度設在障礙邊界，卻沒有留球半徑；clearance增加100mm，不宣稱這是最短路徑或最小安全距離。接近當前途經點15mm內才切換到下一個點。

## 為什麼不是畫一條漂亮折線就夠了

~~~text
規劃球心的線 → 與障礙邊界不相交？
執行器有半徑 → 需要障礙膨脹或身體碰撞檢查
真實運動有慣性 → 實際軌跡可能切彎、超調或偏離線段
~~~

對于球形執行器，按半徑膨脹障礙能把體積問題轉成點路徑問題，但還必須考慮控制誤差。本文采用顯式留餘量的固定途經點，沒有實現搜索算法、最優規劃或通用碰撞檢測庫。

## MuJoCo實際發生了什麼

每個條件運行4秒；物理接觸來自MuJoCo求解，不通過程式碼把執行器穿過障礙。

| 障礙y半寬 | 路徑 | 接觸步數 | 最終目標誤差 | 穩定完成 |
| --- | --- | --- | --- | --- |
| 40mm | direct | 1850 | 374.79mm | 否 |
| 40mm | corner | 1680 | 376.86mm | 否 |
| 40mm | clearance | 0 | <0.01mm | 是 |
| 90mm | direct | 1850 | 374.79mm | 否 |
| 90mm | corner | 1670 | 385.19mm | 否 |
| 90mm | clearance | 0 | <0.01mm | 是 |

接觸步數是2ms記錄中存在接觸的樣本數量，不是獨立碰撞次數。卡住後持續接觸會貢獻很多步。終點誤差也不能單獨說明碰撞強度；本輪沒有測力峰值或真機損傷風險。

![六條實際二維軌跡，貼邊路徑與有余量路徑的區別](/media/practice/planar-path.svg)

兩種寬度下，固定的余量路徑都通過，其他四條失敗。這支持“本場景要計入身體尺寸與余量”，不能推導任意地圖都能安全繞行。

## 復現時怎樣看控制邏輯

run.py的waypoints只決定當前目標；真正位置仍由mj_step積分。日志中的waypoint是控制器階段，x/y是實際物理位置，不能把目標軌跡圖當實際軌跡圖。

圖表使用CSV的x/y繪制；預期direct停在障礙左側，corner靠邊但受接觸限制，clearance繞上方到終點。若出現直接穿墻，先檢查geom的contype/conaffinity是否關閉，而不是據此宣布規劃成功。

## 小練習與邊界

把執行器半徑增大但保持路徑不變。先計算球心所需的最小幾何高度，再考慮15mm途經點切換容差；最後運行檢查接觸記錄。另一練習是把控制器阻尼減小，看原先無接觸的路徑是否仍能跟蹤。

本輪沒有自動尋找可行路徑，沒有動態障礙、機器人姿態、狹窄通道或硬體安全論證。下一篇將感測器從即時真值改成[有噪聲與延遲的觀測](/docs/embodied-ai/mujoco-delayed-feedback)，觀察規劃正確之外的另一種失敗。

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
