---
title: "MuJoCo質量遷移：同一套增益還能用嗎？"
description: "36回合對照固定和質量縮放增益，解釋更低平均誤差為何仍不能通過速度驗收。"
slug: "/embodied-ai/mujoco-mass-transfer"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-stale-force"]
related: ["lab:planar-reliability", "project:hohoo-embodied-agent"]
---

[固定程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/experiments/planar_reliability) · [原始證據](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/evidence/planar-reliability-20261011) · [實驗檔案](/labs/planar-reliability)

一組參數在1kg執行器上表現較好，換成0.5kg或2kg，還能直接復用嗎？對於理想點質量，按質量同比放大kp和kd似乎可以保持相同加速度響應。但執行器有±5N上限，觀測有延遲與噪聲，理想推導並不是全部系統。

本篇比較固定增益與按**已知質量**縮放增益。它是MuJoCo參數遷移對照，不是在線質量辨識，也不是機械臂遷移學習。

## 先看成立條件，再寫縮放公式

沒有接觸、重力和阻尼時，單軸滿足：

```text
m*x'' = F
F = kp*(目標-x) - kd*x'

若 kp=m*kp0，kd=m*kd0，且從不限幅：
x'' = kp0*(目標-x) - kd0*x'
```

質量可以在這個理想方程里約掉。但實際實現是先計算力，再限幅到±5N；更重的執行器更容易需要超出上限的力，實際加速度上限為 `5/m`。相同公式因此不保證相同軌跡。

估計速度還受到位置噪聲和延遲影響。按質量縮放後，噪聲轉成的力也同比變化；理想無延遲二階系統的直覺需要重新檢查，而不是直接當成模擬結論。

## 固定條件與真正改變的量

使用前篇開發集選出的kp=20、kd=8、tau=20ms，不在遷移結果上重新挑參數。質量0.5/1/2kg，目標0.6/1.0m，兩種控制方式，三個留出種子，共36回合。觀測延遲80ms、位置噪聲3mm、每軸力上限5N保持不變。

模型同時修改 `body_mass` 和 `body_inertia`，呼叫 `mj_setConst` 更新派生常量；不是只改一個展示標簽。相關介面可核對 [MuJoCo官方參考](https://mujoco.readthedocs.io/en/3.3.7/APIreference/APIfunctions.html)。原始軌跡記錄真實位置、速度與施加力，獨立審計再次驗證 `Δv=F*Δt/m`。

## 位置誤差變小，不等於完整驗收通過

每格合並兩個目標、三個種子，共六回合。位置列為各回合尾段RMS的均值：

| 質量 | 固定增益位置誤差 | 縮放增益位置誤差 | 固定增益通過數 | 縮放增益通過數 |
| ---: | ---: | ---: | ---: | ---: |
| 0.5kg | 73.96mm | 2.51mm | 0/6 | 0/6 |
| 1kg | 2.50mm | 2.50mm | 0/6 | 0/6 |
| 2kg | 1.45mm | 2.52mm | **6/6** | 0/6 |

![質量變化下兩種增益規則的位置誤差與驗收](/img/research/20261011/mass-transfer.zh-TW.svg)

1kg時兩種規則本來就是同一個控制器，結果相同是一項必要對照。0.5kg時縮放顯著改善位置誤差，卻仍未滿足速度條件。2kg時固定增益在這組條件下通過六回合，而縮放方案未通過。把所有質量合在一起，縮放方案的平均位置誤差更低，但完整契約反而是0/18對6/18。

這不是說“更重一定更穩”，也不是宣告質量縮放錯誤。只能說當前帶噪、延遲、限幅的閉環，不能只用理想加速度等式和平均位置誤差來選贏家。

## 怎樣避免給反例編原因

可以提出假設：質量變化與固定增益改變了閉環響應；縮放改變了噪聲到控制力的通路；限幅影響了瞬態。它們都合理，但本輪沒有分別固定其他因素做消融，因此不能確定各自貢獻。

證據能夠直接支援的事實是每個回合的尾段誤差、最大速度、限幅步數和通過標記。要解釋六個通過回合為什么通過，應先畫力與速度軌跡，再設計單因素比較，而不是根據一個均值補寫結論。

### 重現後可以做的練習

從兩種1kg規則中選同目標、同種子的記錄，逐行比較軌跡；應當一致。再找0.5kg縮放策略里位置RMS低於15mm的回合，檢查尾段峰值速度為什么仍導致失敗。

如果要把力上限改為隨質量增加，請另建協議與結果目錄。這同時改變了執行器能力，不能把新結果混進當前36回合聲稱“只改控制器”。如果要推廣到機械臂，也必須加入關節慣量、耦合、重力和接觸；二維點質量不能替它證明安全性。

三篇到這裡形成一個可用的學習順序：先用開發/留出拆開調參，再檢查失聯動作的物理含義，最後檢驗參數變化下的邊界。完整VL01、M4/M5與真實硬件工作仍未完成。

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
