---
title: 具身智能實踐（一）：在 MuJoCo 中抓起方塊，再故意抓偏
description: 用真實物理接觸完成一次抓取放置，再對照0、25、50 mm目標偏移，保存視頻、狀態軌跡和明確的成功判定。
slug: /embodied-ai/mujoco-first-pick-place
status: published
published_at: '2026-09-28'
updated: '2026-09-28'
reading_minutes: 18
learning_step: first-simulation
domain: embodied-ai
article_kind: tutorial
difficulty: beginner
related: ["project:hohoo-embodied-agent", "doc:embodied-ai/openvla-action-pipeline"]
---

讓一個物體在畫面里移動并不難。更值得弄明白的是：它為什么移動？夾爪有沒有真正接觸方塊？發出了正確的動作，任務為什么仍然會失敗？

這次從一個小而完整的物理任務開始：讓夾爪抓起紅色方塊，搬到藍色盒子上方，松手，并確認方塊落定。然后只改一個條件——拾取目標向右偏25 mm或50 mm——觀察相同程序會發生什么。

:::note 實際運行范圍
本輪由 Codex 在作者授權下，于北京時間2026-09-28在本機執行 MuJoCo 3.3.7 仿真，代碼和場景自主編寫。使用教學級笛卡爾夾爪，不是商用機械臂；沒有真實硬件、視覺識別、LLM規劃、ROS2或策略訓練。它是具身學習的控制與數據基礎練習，不是“已經訓練出了具身智能”。本文由 AI 輔助整理，未聲稱作者親手復現或人工審校。
:::

## 1. 先看真正發生過的過程

下面是無偏移組的第一回合原始仿真畫面，約9.2秒。點擊播放才加載視頻，沒有自動播放。

<video controls preload="none" playsinline src="/media/practice/vl01-baseline.mp4" poster="/media/practice/vl01-lift.png" width="960" height="640" aria-label="MuJoCo 無偏移抓取放置：夾起紅塊，搬運，放入藍盒">當前瀏覽器無法播放，請使用下面的原始視頻鏈接。</video>

文字替代：夾爪張開并下降到紅色方塊兩側，閉合后把方塊抬離地面；搬運到藍色盒子上方，下降、松手，再上退，方塊留在盒內。視頻無音軌。

[下載原始視頻](https://github.com/VirtualSelect/hohoo-embodied-agent/raw/17144c47a2294f157420946b15f78c49d8d17dd5/evidence/vl01-20260928-v2/bias-000mm-run-1/episode.mp4) · [獨立工程與復現說明](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/17144c47a2294f157420946b15f78c49d8d17dd5/experiments/vl01_pick_place) · [九次回合的完整證據](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/17144c47a2294f157420946b15f78c49d8d17dd5/evidence/vl01-20260928-v2)

視頻只是觀察入口。成功與否由保存的狀態和規則判斷，不能只看“好像抓起來了”。

## 2. 為什么第一課不用復雜機械臂？

本例的夾爪有五個可控制關節：

- x、y、z三個平移關節，讓夾爪在世界中移動。
- 左、右兩個夾指關節，向中間閉合。

這種結構常稱為笛卡爾或直角坐標機構。它讓“向右移動2厘米”可以直接對應一個平移關節目標，暫時省去多關節機械臂的逆運動學。

代價也很明確：這個模型沒有真實機械臂的關節耦合、自碰撞、線纜、傳動與工作空間限制，不能拿它證明真機抓取性能。我們用這個簡化換來的是，第一輪可以把注意力放在**動作、物理接觸、觀察和成功定義**上。

場景中紅色方塊邊長40 mm、質量0.05 kg；藍盒底板表面在z=0.006 m，方塊落定后中心約在z=0.026 m。方塊有自由關節，會受重力和接觸影響。程序沒有把方塊焊到夾爪上，也沒有在搬運過程中改寫它的位置。

## 3. 從 Java 調接口，換到仿真循環

你已經熟悉“構造請求 → 發送 → 讀取響應”。仿真中也需要明確輸入與輸出，但動作會改變下一時刻的環境：

```text
控制目标 → 执行器施力 → 物理步进 → 新状态
   ↑                                ↓
   └──────── 下一步控制与记录 ────────┘
```

這里先區分三個概念：

| 概念 | 本例里的具體內容 | 容易混淆的地方 |
| --- | --- | --- |
| 狀態 state | 關節位置/速度、方塊位置、接觸 | 模擬器內部可以直接讀取，不代表真機傳感器都能知道 |
| 觀測 observation | 本次記錄選取的位置、速度、接觸和畫面 | 是狀態的一部分或變換，不等于完整世界 |
| 動作 action | x/y/z及兩指的位置目標 | 不是“把方塊坐標直接設為終點” |

本輪直接讀模擬器狀態，沒有從相機圖像中識別方塊。把這一步叫“視覺感知成功”就會越過證據范圍。

MuJoCo 的 `MjModel` 保存模型配置，`MjData` 保存運行狀態。核心循環的意思是：

```python
data.ctrl[:] = [
    target_x,
    target_y,
    target_z - 0.16,
    grip_target,
    grip_target,
]
mujoco.mj_step(model, data)
mujoco.mj_forward(model, data)

cube = data.body("cube").xpos.copy()
hand = data.site("grip_center").xpos.copy()
```

`mj_step` 推進動力學；隨后刷新派生量，使記錄的世界坐標與本次步進后的 `qpos` 對齊。`copy()` 很關鍵：保存數組引用可能讓過去的觀測隨下一次步進一起改變。

## 4. 為什么 z 目標要減0.16？

場景把夾爪父級位置設在世界高度0.16 m。它的z關節位移是相對這個基點的量：

```text
夹爪世界高度 = 基点高度 + z关节位移
0.024 m      = 0.160 m + (-0.136 m)
```

想讓夾爪中心下降到0.024 m，應給z執行器 `-0.136`，不是 `0.024`。后者會讓夾爪往更高處走。

本例約定世界系+z向上，長度單位全部是米。兩個夾指雖然都接收正的閉合量，軸方向卻相反：左指沿+x移動，右指沿−x移動，才能相向靠近。

這就是讀具身代碼時應優先問的三個問題：**數字是什么單位？屬于哪個坐標系？表示位置、位移還是力？**

位置執行器接收關節目標，通過模型里的增益與阻尼產生作用力；目標和實際位置可以不同。能設置目標，不意味著環境一定實現了目標。

## 5. 九個階段構成一個回合

高層控制使用事先固定的階段時間表：

| 階段 | 時長 | 目標 |
| --- | --- | --- |
| approach | 1.0 s | 張開夾爪，移動到拾取點上方 |
| descend | 1.0 s | 降到方塊兩側 |
| close | 0.8 s | 兩指閉合 |
| lift | 1.2 s | 抬到0.18 m |
| transfer | 1.5 s | 平移到藍盒上方 |
| lower | 1.0 s | 降到0.04 m |
| release | 0.7 s | 松開夾指 |
| retreat | 1.0 s | 夾爪上退 |
| settle | 1.0 s | 等待方塊落定并觀察 |

階段之間用平滑插值過渡目標，減少位置指令突然跳變。這里沒有訓練得到的策略。

關節執行器有位置回饋，但**高層階段表沒有“沒抓住就再試”的閉環**。因此偏移組會出現空夾爪繼續走完搬運流程：控制程序執行完了，任務卻沒有完成。這兩個事實可以同時成立。

## 6. 在運行前定義什么叫成功

本例把成功拆成一段歷史條件和一段最終條件：

1. 方塊中心曾經高于0.10 m，確認確實離開了地面。
2. 最后0.5秒的所有記錄中，方塊x、y分別距盒中心小于0.045 m。
3. 同一段記錄中，方塊中心z距0.026 m小于0.006 m。
4. 線速度小于0.02 m/s。
5. 夾指與方塊無接觸。
6. 沒有 MuJoCo 警告或非有限狀態。

最后的條件每20 ms記錄一次，因此是**采樣窗口上的判定**，不宣稱連續時間絕無瞬間接觸。盒內判斷使用保守的中心位置容差，未實現適用于任意旋轉物體的完整幾何包含測試。

為什么這么麻煩？只看高度可能把“抬起來但一直夾著”算成功；只看盒內位置又可能把“初始就放在盒里”算成功。測試專門覆蓋這兩種誤判。

## 7. 固定其他條件，只改拾取偏移

三組的拾取目標x偏移分別為0、25、50 mm，方塊位置和盒子位置不變。放置目標始終相同。場景、摩擦、質量、執行器、時間表與成功規則保持一致。

每組運行三次，初始狀態完全相同，沒有隨機擾動。三次相同結果說明這一設置下可以重復運行，**不是三個獨立隨機樣本，也不構成通用抓取成功率**。

物理步長2 ms，即500 Hz；每10步記錄一次狀態，即50 Hz；視頻25 FPS。每回合9.2秒，包含460條采樣軌跡。

## 8. 真正觀察到了什么

以下來自正式記錄v2，每組展示第一回合數值；同組另外兩回合結果相同：

| 拾取偏移 | 是否抬過0.10 m | 最終方塊到盒中心XY距離 | 滿足全部成功條件的回合 |
| --- | --- | --- | --- |
| 0 mm | 是 | 0.673 mm | 3 / 3 |
| 25 mm | 否 | 260.337 mm | 0 / 3 |
| 50 mm | 否 | 262.063 mm | 0 / 3 |

這里的XY距離是**方塊到盒子中心**的距離，不是夾爪定位誤差，更不是商用機械臂的重復定位精度。0.673 mm只能描述這個教學場景的這組運行。

<img src="/media/practice/vl01-trajectories.png" alt="三組真實軌跡：無偏移組方塊高度上升并靠近盒中心；25和50毫米組保持近地面，未完成搬運。" width="1500" height="1020" loading="lazy">

上圖由保存的CSV生成，每組畫一回合。上半圖看方塊有沒有被抬起，下半圖看它有沒有靠近盒中心。它們合在一起，比只看夾爪運動更接近任務結果。圖表仍不能取代松手、落定等其他條件。

25 mm偏移組的對應過程：

<video controls preload="none" playsinline src="/media/practice/vl01-bias25.mp4" poster="/media/practice/vl01-bias25-lift.png" width="960" height="640" aria-label="MuJoCo 25毫米偏移：夾爪未抬起方塊，仍繼續執行搬運階段">當前瀏覽器無法播放，請使用原始證據目錄中的視頻。</video>

文字替代：下降位置偏向一側，方塊發生小幅移動；夾爪上抬時沒有帶走方塊，之后仍按固定時間表移動到藍盒并松手。方塊留在原區域，任務失敗。視頻無音軌。

**觀察**是“方塊沒有抬起”。結合場景和接觸記錄，可以進一步研究偏移如何改變夾持，但不能僅憑一次失敗就斷言所有機器人在25 mm偏差下都會失敗。本輪也沒有測出“最大容錯偏移”，因為只運行了三個離散點。

## 9. 在自己的電腦上復現

已驗證環境：Windows x64、Python 3.12、MuJoCo 3.3.7。先進入獨立倉庫：

```powershell
git clone https://github.com/VirtualSelect/hohoo-embodied-agent.git
cd hohoo-embodied-agent
git checkout 17144c47a2294f157420946b15f78c49d8d17dd5
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
```

先跑契約測試，再運行實驗：

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s experiments/vl01_pick_place -p test_contract.py
.\.venv\Scripts\python.exe experiments/vl01_pick_place/run.py --out outputs/my-first-run --render
.\.venv\Scripts\python.exe experiments/vl01_pick_place/analyze.py outputs/my-first-run
```

沒有可用OpenGL環境時，可以先去掉 `--render`，驗證物理與軌跡部分。Linux/macOS需要調整虛擬環境解釋器路徑，本輪沒有在這些系統實測。

輸出目錄必須不存在，程序拒絕覆蓋舊證據。安裝之后不需要模型API，也不下載訓練權重。單次運行會生成：

| 產物 | 作用 |
| --- | --- |
| manifest.json / protocol.json | 版本、實際代碼提交、文件哈希和固定協議 |
| trajectory.csv | 帶階段、動作目標、物體/夾爪位置、速度和接觸的50Hz記錄 |
| states.jsonl | 保存的qpos、qvel、ctrl，可獨立重放 |
| events.json | 各階段開始時間與目標 |
| summary.json | 本回合結果與失敗類型 |
| episode.mp4 / 階段PNG | 每組第一回合的實際畫面 |
| audit.json / trajectories.png | 從保存軌跡復核結果并生成圖表 |

高度峰值在500Hz運行循環中計算，圖像來自50Hz采樣；不要把兩者的小數位當作完全相同精度。

需要回看保存的軌跡時：

```powershell
.\.venv\Scripts\python.exe experiments/vl01_pick_place/replay.py evidence/vl01-20260928-v2/bias-000mm-run-1/states.jsonl --out outputs/replay.mp4
```

這次渲染讀取已經保存的狀態，**屬于重放，不是額外一次策略實驗**。

## 10. 這次完成了什么，下一次驗證什么？

已經完成：一個能實際運行的仿真場景、一個固定控制器、九次回合記錄、失敗對照、視頻與可重放軌跡。它復用已有VL01，不再創建一份同名實驗規劃。

尚未完成：視覺定位、狀態估計、失敗后重新規劃、ROS2、真實機械臂、數據集訓練和Sim2Real。整個VL01路線和M4/M5不因這個最小案例自動變成“全部完成”。

下一次最值得驗證的改動是：**在lift結束后檢查方塊是否真的抬起；如果沒有，就停止搬運并報告失敗。** 先讓高層控制使用已經能讀取的回饋，再討論更復雜的智能。

<details><summary>自檢：把夾爪的位置直接設成目標，是不是就完成了控制？</summary>

還沒有。目標、實際夾爪位置和方塊狀態是三個不同的量。本例修改的是執行器目標，物體通過接觸和動力學運動，成功還要根據任務條件獨立判定。

</details>

<details><summary>自檢：為什么這次可以不調用大模型？</summary>

這個固定任務可以用明確的階段程序完成。先驗證動作、觀測和物理執行邊界，后面再讓模型選擇任務或工具。使用了模擬器本身不等于訓練了智能策略。

</details>

## 參考資料

- [MuJoCo 3.3.7 建模說明](https://mujoco.readthedocs.io/en/3.3.7/modeling.html)：用于核對MJCF、局部坐標和關節模型。
- [MuJoCo Python接口](https://mujoco.readthedocs.io/en/3.3.7/python.html)：MjModel/MjData、步進、數組引用與渲染接口。
- [本次場景、協議及程序](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/17144c47a2294f157420946b15f78c49d8d17dd5/experiments/vl01_pick_place)：本文數值與限制以固定版本和原始記錄為準。
