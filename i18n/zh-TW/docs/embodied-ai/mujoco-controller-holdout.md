---
title: "MuJoCo控制調參：最優候選不等於驗證通過"
description: "54個開發回合選擇參數，36個留出回合復核位置誤差與穩定完成契約。"
slug: "/embodied-ai/mujoco-controller-holdout"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-velocity-estimation"]
related: ["lab:planar-reliability", "project:hohoo-embodied-agent"]
---

[固定程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/experiments/planar_reliability) · [原始證據](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/evidence/planar-reliability-20261011) · [實驗檔案](/labs/planar-reliability)

上一輪發現EMA能降低位置差分的噪聲，卻可能放大延遲閉環的擺動。直接宣布“濾波不好”並不充分：濾波器改變了動態響應，而控制增益還沿用舊值。本篇把濾波時間常數和PD增益一起掃描，再用沒有參與選擇的種子和條件檢查結果。

這是二維力控執行器的 **MuJoCo實際模擬**。沒有機械臂、相機、ROS2或真機。位置觀測參與控制，速度真值只用於離線驗收。

## 為什么不能只找一條漂亮曲線

控制律仍是 `F = kp*(目標-觀測位置) - kd*估計速度`，每軸限制在±5N。降低kp可能減小過沖，但也可能變慢；改變kd會改變阻尼，也會改變估計噪聲轉成力的幅度；增大EMA時間常數能平滑，卻引入更多滯後。

如果看完所有結果後挑一組成功軌跡展示，讀者不知道這個參數是不是只對那一條噪聲有效。因此協議先凍結選擇規則：只按開發集最後300ms的位置RMS均值選最小者，平分時按kp/kd/tau順序。**選擇指標與最終成功條件是兩件事。**

```text
18組參數 × 3個開發種子 → 固定選擇規則 → 選中一組
                                       ↓
                     3個新種子 × 6種條件，與舊基線比較
```

## 開發集上選中了什么

kp取20/40/80，kd取8/18，tau取20/60/120ms，共18組。開發條件固定80ms觀測延遲、3mm位置噪聲，種子7/19/41，每回合4秒；物理步長2ms、控制周期20ms。

選中結果為 **kp=20、kd=8、tau=20ms**。原基線是80、18、60ms。這裡是降低增益、縮短平滑的組合結果，不能把全部改善單獨歸功於某一個參數。

更值得保留的是：**54個開發回合沒有一個通過完整尾段契約**。選擇規則仍能挑出位置RMS更低的候選，但“最佳候選”並不等於“已經成功”。我們沒有因此調整驗收閾值。

## 留出檢查確實更好，卻仍有邊界

留出種子為73/97/131；條件擴展為0/80ms延遲與0/3/10mm噪聲。每組參數18回合，兩組共36回合。

| 參數來源 | 留出回合通過數 | 尾段位置RMS的跨回合均值 |
| --- | ---: | ---: |
| 上輪固定基線 | 3/18 | 54.70mm |
| 本輪開發集選中參數 | 7/18 | 3.61mm |

![開發參數掃描與留出條件中的位置誤差](/img/research/20261011/controller-holdout.zh-TW.svg)

這是同一目標族、少量固定種子的對照，不是機器人泛化成功率。即使均值降至3.61mm，也仍有11個回合不滿足完整條件。驗收要求最後300ms每一個物理步同時滿足距離<15mm和速度<0.04m/s，不能用平均位置誤差代替。

控制沒有偷看真值速度，EMA使用觀測的捕獲時間差；延遲佇列只有已到達的樣本能更新控制。獨立審計從CSV重新計算估計速度、控制力和驗收，並在這個無接觸、無阻尼場景下驗證 `Δv=F*Δt/m`。

## 這次比較支援什么解釋

結果支援“舊控制器與濾波/延遲組合需要重新匹配”，不支援“kp越小越好”或“20ms適用於任何機器人”。kp/kd/tau是聯合變化，本輪沒有用單變量消融給它們分配貢獻。開發和留出都來自同一個模擬模型，尚未覆蓋質量、執行器誤差、摩擦和更復雜目標。

後兩篇分別改變通信與質量，觀察這組參數的邊界。不會把新條件再次用於選擇後，仍稱它們為“未見條件”。

### 一個能自己驗證的練習

從 `selection.json` 找出選中參數，再從 `results.json` 只篩選 `section=tuning` 重算18組均值。不得混入holdout結果。接著選一個位置RMS很小卻 `success=false` 的回合，檢查最後300ms的最大速度；它會教你為什么平均誤差和到達後穩定性不是同一個指標。

若結果不同，先確認鎖定MuJoCo/NumPy版本、2ms物理步長和20ms取樣間隔，再檢查分組與種子。不要先放寬閾值。原始 `csv.gz` 為無損壓縮，每個物理步都保留，不用平滑後的展示曲線替代驗收。

## 最小重現與排錯

從干凈檢出目錄運行以下PowerShell命令。輸出目錄必須尚不存在。同組的三篇文章共用一份凍結協議，只需運行一次，再按各篇的證據分組查看。

```powershell
git clone https://github.com/VirtualSelect/hohoo-embodied-agent.git hohoo-embodied-agent-study
cd hohoo-embodied-agent-study
git checkout 1d1faab57e20b352761e9abc736c6d277b505e6b
python -m venv .venv
$py = '.\.venv\Scripts\python.exe'
& $py -m pip install -r requirements-lock.txt
& $py -m unittest discover -s experiments/planar_reliability -p "test_*.py"
& $py experiments/planar_reliability/run.py --out outputs/reliability-my-run
& $py experiments/planar_reliability/audit.py outputs/reliability-my-run
```

本機Windows已驗證：Python 3.12.14 + MuJoCo 3.3.7 + NumPy 2.2.6；3項單測、153回合、306000行；獨立審計預期輸出 `PASS`。其他操作系統未復測。若只想核驗歸檔，不重新實驗，可將審計參數換為 `evidence/planar-reliability-20261011`。原始碼哈希統一LF，證據哈希按原位元組；不要改寫manifest掩蓋差異。

若導入失敗，先檢查安裝與運行是否使用同一個 `$py`。失敗輸出保留，重跑時換新目錄。數值按協議容差復核，耗時是本機觀察，不要求重現相同速度。

程式碼與文章由AI輔助整理，結論以歸檔且可審計的實際運行記錄為限。本輪沒有新增付費模型請求，也不代表作者已親手重現或完成人工審校。
