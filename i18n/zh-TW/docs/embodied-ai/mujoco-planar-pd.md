---
title: "MuJoCo 第二場景：目標位置相同，為什麼有的控制器停不住？"
description: "用二維力控執行器比較質量與PD阻尼，記錄飽和、超調和穩定完成，避免把經過目標當作任務成功。"
slug: "/embodied-ai/mujoco-planar-pd"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:mujoco-planar-pd", "project:hohoo-embodied-agent", "doc:embodied-ai/mujoco-qualified-completion"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/experiments/planar_reach) · [原始證據](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/831789c2a1efb4564c4cfabc2298e48e16ada879/evidence/planar-reach-20261007) · [實驗檔案](/labs/mujoco-planar-pd)

前十四輪主要圍繞抓取流程中的觀測、恢復與完成契約。本輪換一個更容易看清控制規律的場景：一個有質量的球形執行器，可以沿x/y兩個軸移動，用兩個motor施加力，從(0,0)到(0.6,0)。

這里沒有機械臂關節鏈、逆運動學、抓取、視覺或ROS2。它是第二個真實運行的MuJoCo教學場景，不把M4/M5或完整VL01標成完成。目標是先回答一個基礎問題：**朝目標施力，為什麼會沖過去，甚至一直來回擺？**

## 從誤差到力，中間隔著動力學

本輪控制律為 F = Kp × (目標位置−觀測位置) − Kd × 觀測速度。Kp=80固定，Kd比較0、18、36；質量比較1kg和2kg。每軸力限制±5N，物理步長2ms，控制每20ms更新一次，運行4秒。

~~~text
位置目標 → 位置誤差 × Kp ─┐
觀測速度 → 速度 × (-Kd) ──┼→ 限幅±5N → MuJoCo動力學 → 新位置/速度
                         └───────────────────────────────↑
~~~

只有P項時，靠近目標意味著力變小，卻不意味著速度已經為零。穿過目標後才產生反向力，可能已經積累了很大動量。D項根據速度提前“剎車”；過大的D也可能讓響應變慢。質量變化則改變同樣力下的加速度。

經典連續線性模型中，臨界阻尼與2√(質量×Kp)相關。但本例還有限幅和離散采樣，不應直接把這個公式當成所有條件的最優參數。本篇只比較三個凍結值，不做自動調參。

## 怎樣判斷真的停住

不是最後一幀碰到目標就算通過。最後0.3秒的每條記錄都需要位置誤差小于15mm、速度小于40mm/s。CSV記錄每2ms真值、施力、觀測捕獲時刻和飽和標記，可獨立重算。

| 質量 | Kd | 最大x超調 | 最終位置誤差 | 穩定完成 |
| --- | --- | --- | --- | --- |
| 1kg | 0 | 740.6mm | 677.95mm | 否 |
| 1kg | 18 | 0mm | <0.01mm | 是 |
| 1kg | 36 | 0mm | 0.06mm | 是 |
| 2kg | 0 | 630.9mm | 569.47mm | 否 |
| 2kg | 18 | 74.0mm | <0.01mm | 是 |
| 2kg | 36 | 0mm | 0.04mm | 是 |

![從實際CSV生成的位置軌跡，比較質量和阻尼](/media/practice/planar-gain.svg)

無阻尼兩組未穩定；相同Kd=18在更大質量時出現明顯超調，雖然4秒末仍通過。不能只比較最終誤差，也不能把同一固定場景的六次運行說成泛化成功率。

## 讀scene.xml：動作到底是什麼

兩個slide joint約束平面運動，motor輸入是力；不是把qpos瞬移到目標。球半徑35mm，場景重力為零，基礎關節阻尼為零，因而更容易隔離控制器的速度反饋。Kp與Kd寫在Python控制器，限力同時由程序和MuJoCo actuator范圍約束。

MuJoCo配置含義可查[3.3.7 XML參考](https://mujoco.readthedocs.io/en/3.3.7/XMLreference.html)。如果把motor換成position actuator，接口含義已經改變，不能繼續用“動作值等于牛頓”的解釋。

## 練習、復現與局限

打開01-gain.csv，在前幾行核對力是否飽和；接近目標時再看速度與力的方向。把質量改大，在新目錄運行，先預測是否超調，再看軌跡。不要用縮短觀察時長讓困難案例“沒來得及失敗”。

本輪全狀態來自仿真真值，控制參數固定，沒有機器人摩擦辨識和硬體驗證。若導入失敗，檢查同一個Python環境是否安裝鎖定依賴；數值運行不需要OpenGL。下一篇保持控制器不變，加入[障礙與執行器尺寸](/docs/embodied-ai/mujoco-obstacle-clearance)。

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
