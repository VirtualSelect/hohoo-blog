---
title: "MuJoCo失聯策略：零力不等於停止"
description: "27回合比較舊觀測控制、超時置零與衰減，展示觀測超時和物理制動的差別。"
slug: "/embodied-ai/mujoco-stale-force"
status: "published"
published_at: "2026-10-11"
updated: 2026-11-13
reading_minutes: 10
domain: "embodied-ai"
article_kind: "case-study"
difficulty: "intermediate"
prerequisites: ["doc:embodied-ai/mujoco-controller-holdout"]
related: ["lab:planar-reliability", "project:hohoo-embodied-agent"]
---

<span id="published-correction"></span>

> **2026-11-13 修訂程式碼已發布。** [固定版本與執行說明](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/335e756bb7e86ded9128b7c9b978636a4069fa61/experiments/planar_reliability)現可取得。下文「本機分支／尚未發布」保留為2026-11-12複核時的狀態；歷史固定命令仍用於原實驗歸檔，不用於尋找新修訂。使用修訂時，在配套倉庫根目錄執行`git checkout 335e756bb7e86ded9128b7c9b978636a4069fa61`，再按對應目錄README執行，輸出使用新目錄。歷史結果與AI輔助揭露不變。

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
| fade | 正常PD與限幅 | 已限幅的力衰減至觀測年齡200ms |

這裡的200ms仍從**樣本擷取時刻**算起，不是「發現陳舊後再等200ms」。年齡超過100ms後，已限幅的力乘以 `max(0, (0.200-age)/0.100)`；衰減區間是年齡100–200ms。浮點計算在邊界可能留下約`1e-15 N`的殘值，核對fade時應使用數值容差，不能靠`fx == 0`尋找邊界。

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

不能直接搜尋整條軌跡的「第一次零力」：啟動時尚未收到觀測，力與速度本來都是零。應先選永久失聯、zero策略，再找**已有有效樣本且年齡超限的控制列**，最後觀察力與速度。

CSV的`t`記錄的是物理步結束時刻；這列命令在該步開始時決定，所以控制時刻為 `t - 0.002`。只在`control_tick=1`的列檢查年齡，不能把步後的狀態時間直接當作控制判定時間。

在本文固定提交的工程根目錄，用Python 3.12執行以下唯讀片段即可，不需要啟動MuJoCo或重新模擬：

```python
import csv
import gzip
import json
from pathlib import Path

root = Path("evidence/planar-reliability-20261011")
protocol = json.loads((root / "manifest.json").read_text(encoding="utf-8"))["protocol"]
records = json.loads((root / "results.json").read_text(encoding="utf-8"))
record = next(r for r in records if r["section"] == "dropout"
              and r["dropout"] == "permanent"
              and r["policy"] == "zero" and r["seed"] == 73)
with gzip.open(root / record["trace"], "rt", encoding="utf-8") as stream:
    rows = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(stream)]
dt = protocol["timestep"]
stale = next(r for r in rows if r["control_tick"] == 1
             and r["capture_t"] >= 0
             and r["t"] - dt - r["capture_t"] > protocol["fresh_limit"] + 1e-9)
later = rows[rows.index(stale) + round(0.1 / dt)]
for label, row in (("startup", rows[0]), ("stale", stale), ("later", later)):
    print(label, row["t"], row["fx"], row["vx"])
```

這會選中`111.csv.gz`，依序列印啟動、首次年齡超限控制、再過100ms的記錄。下表對`vx`保留六位小數：

| CSV t/s | fx/N | vx/(m/s) |
| ---: | ---: | ---: |
| 0.002 | 0 | 0 |
| 0.502 | 0 | 0.853823 |
| 0.602 | 0 | 0.853823 |

最後一個樣本擷取於0.380秒；0.480秒判定年齡恰為100ms，尚未觸發，0.500秒才到120ms，對應步後日誌0.502秒。力歸零後，速度沒有歸零，才是這裡要讀出的反例。原獨立稽核另從逐步記錄驗證`F=m*a`；若自己的軌跡瞬間停住，應檢查額外阻尼或是否清空了狀態，不能用啟動時的零速度代替失聯後的結果。

選擇突發丟包fade策略，核對恢復時的捕獲時間：不能把舊樣本的重複接收當作通信恢復。下一步若要設計制動策略，需要明確可用觀測和執行器能力，不能在控制器中偷偷讀取模擬真值來補齊感測器缺口。

## 修改設定前，先確認執行語義

上面的固定提交用於重現原凍結協議。其中`fresh_limit/fade_end`雖然保存在JSON裡，控制函式仍寫死100/200ms；物理步長、致動器限幅、位置/速度驗收及開發集條件也有類似問題。原協議預設值與這些常數一致，因此原結果表仍有效；**單改這個提交的protocol.json，並不能保證改變了實際實驗。**

本機已修訂runner、控制與獨立審計：參數同時用於物理執行及驗收，非法步長組合會在執行前拒絕。預設153回合重新執行後，結果及全部解壓CSV仍與原歸檔一致。此修訂尚未發布；上面的固定連結與下面指令仍指向歷史版本。研究新閾值需先取得相符的新程式碼，用新目錄執行，不能改舊manifest或把回歸案例當成研究成果。

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

若匯入失敗，先檢查安裝與執行是否使用同一個 `$py`。失敗輸出保留，重跑時換新目錄。本文的秒數是模擬時間，不是電腦執行腳本所需的實際時間；運動軌跡按凍結協議與數值容差複核。

程式碼與文章由AI輔助整理，結論以歸檔且可審計的實際運行記錄為限。本輪沒有新增付費模型請求，也不代表作者已親手重現或完成人工審校。
