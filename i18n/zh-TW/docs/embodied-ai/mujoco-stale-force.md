---
title: "MuJoCo失聯策略：零力不等於停止"
description: "27回合比較舊觀測控制、超時置零與衰減，展示觀測超時和物理制動的差別。"
slug: "/embodied-ai/mujoco-stale-force"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-controller-holdout"]
related: ["lab:planar-reliability", "project:hohoo-embodied-agent"]
---

[固定程式碼](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/experiments/planar_reliability) · [原始證據](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/1d1faab57e20b352761e9abc736c6d277b505e6b/evidence/planar-reliability-20261011) · [實驗檔案](/labs/planar-reliability)

通信斷了，控制器還在用最後一條位置與速度估計。把輸出力設為零，是否就能稱為安全停止？在這個無摩擦二維場景中，答案很直接：**零力意味著不再加速，不意味著速度變成零。**

本篇沿用開發集選中的控制參數，專門比較陳舊觀測下的三種力策略。所有物理運動都由MuJoCo推進，沒有位置傳送或偽造停止結果。

## 失聯檢測看的是哪一個時鐘

每個樣本帶捕獲時間，收到之後才能用於控制。控制決策時刻減捕獲時間得到年齡；重複使用同一個樣本不會刷新這個年齡。

```text
感測器取樣 → 40ms延遲佇列 → 已到達樣本 → 估計/控制
                                      ↓
                              當前時刻 - 捕獲時刻
```

固定40ms延遲、3mm位置噪聲；控制周期20ms，物理步長2ms。年齡超過100ms時才觸發陳舊策略，因此100ms恰好邊界仍沿用正常控制。條件有正常通信、0.4–1.0秒丟包、0.4秒後永久丟包；三種子×三條件×三策略，共27回合。

噪聲在丟包時仍按固定順序抽取，只是不把樣本放入佇列。這樣不同策略不會因為隨機數消耗順序不同而得到另一個噪聲實驗。

## 三種選擇，各自改變哪一步

| 策略 | 年齡≤100ms | 年齡>100ms |
| --- | --- | --- |
| hold | 正常PD與限幅 | 繼續按最後觀測算PD |
| zero | 正常PD與限幅 | 力直接置零 |
| fade | 正常PD與限幅 | 已限幅的力線性衰減，200ms後為零 |

hold不是保持當前位置，它保持的是使用舊資訊的控制規則。當前位置已經變了，舊觀測誤差卻還在，控制可能持續向錯誤方向推。

zero和fade都不是閉環剎車。它們沒有新速度觀測，也不加入未知的摩擦或制動力模型。程序不會為了得到“停止”圖像而把 `qvel` 直接清零。

## 短暫丟包和永久失聯，結論不同

下表為三個種子的最後300ms位置RMS均值，單位毫米，不是成功率：

| 通信條件 | hold | zero | fade |
| --- | ---: | ---: | ---: |
| 正常 | 2.04 | 2.04 | 2.04 |
| 0.4–1.0s突發丟包 | 2.02 | 2.06 | 2.05 |
| 0.4s後永久失聯 | **16,025.96** | 2,748.98 | 2,370.92 |

![永久失聯下的實際模擬位置軌跡](/img/research/20261011/stale-force.zh-TW.svg)

正常組結果完全相同，因為樣本年齡沒有跨過閾值。短暫丟包後，重新獲得觀測，尾段位置誤差又變小；但表格只描述尾段，不應掩蓋中間路徑。

永久失聯時，hold繼續推著系統走遠；zero停止施力後仍按已有動量滑行；fade改變了力的撤出過程，也沒有制動保證。本輪全部27回合都未滿足“位置和速度逐步同時達標”的完整契約，包含位置誤差看上去很小的正常組。不能把任何一列稱作安全贏家。

## 為什么要保留這個看上去簡單的反例

“發送零命令”“控制器停止運行”“執行器進入制動模式”“物體已經停穩”是四種不同事件。軟體只驗證了第一個，不能把文案寫成最後一個。實際機器人還要考慮執行器語義、通信看門狗、機械制動、重力、接觸和認證流程；本場景沒有這些機制。

這裡的100/200ms是凍結教學參數，不是安全標準。換一個質量、目標、初始速度或故障相位，位移就會變。僅測0.4秒這個丟包起點也不足以界定最壞停止距離。

### 讀軌跡的小練習

選擇永久失聯zero策略，找出 `fx/fy` 首次歸零的行，再看之後的 `vx/vy`。在無摩擦、無重力模型里，速度應繼續存在，審計通過 `F=m*a` 驗證這一點。若你的曲線立刻停住，檢查是否無意清空了狀態，或場景包含額外阻尼。

選擇突發丟包fade策略，核對恢復時的捕獲時間：不能把舊樣本的重複接收當作通信恢復。下一步若要設計制動策略，需要明確可用觀測和執行器能力，不能在控制器中偷偷讀取模擬真值來補齊感測器缺口。

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
