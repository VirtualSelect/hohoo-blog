---
title: "KV 快取開銷剖析：把省下的計算和新增的工作分開"
description: "對909次查詢做分段計時，驗證源碼簽名、查找、復制與續算分別花在哪里，同時保留快取仍慢的結果。"
slug: "/llm/cache-cost-profile"
status: "published"
published_at: "2026-10-07"
updated: "2026-11-12"
reading_minutes: 9
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:cache-cost-profile", "project:hohoo-ai-lab", "doc:llm/prefix-cache-admission"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs) · [原始證據](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs/evidence/20261007) · [實驗檔案](/labs/cache-cost-profile)

上一輪快取準入實驗出現了一個不太好看的結果：少投影一些Token，查詢卻更慢。那時日志只記錄總耗時，不能直接把原因歸咎于“Python慢”或“復制太多”。本篇做一個更窄的實驗：先固定為永遠命中的八Token前綴，再把續算鏈分段計時。

這是未訓練的兩層NumPy教學Decoder，維度16、完整輸入12Token。沒有GPU、真實模型呼叫或模型質量評價。它回答本機這段實現的開銷問題，不代表所有KV快取。

## 對照組究竟改了什麼

| 路徑 | 簽名方式 | 計算 |
| --- | --- | --- |
| full | 不需要快取簽名 | 重算12Token，取後4個輸出 |
| rehash | 每次讀源碼、哈希權重和配置 | 查找八Token快取，再續算4Token |
| frozen | 模型初始化時固定簽名 | 相同查找、復制和續算 |

快取鍵仍包含 scope、簽名和前綴Token。凍結模型將embedding和權重設為只讀；換權重應創建新實例及簽名。這是可信本地程式碼的生命周期約定，不是防御惡意修改的安全邊界，也不允許熱改權重後繼續使用舊快取。

~~~text
總查詢 = 簽名 + 查找 + 復制 + 續算 + 未歸屬開銷
                    ↑
       少算Token，并不能消除左邊三項
~~~

## 怎樣量，避免把一次波動當結論

三個固定種子，每種路徑先預熱五次；之後每種子101輪，每輪隨機交錯三路徑，共909次正式查詢。用單線程BLAS環境，計時采用 perf_counter_ns。返回值與完整重算結果比較，最大容差1e-12。

記錄包含 total、signature、lookup、copy、compute 和 residual。residual不是“其它硬體瓶頸”的測量，只是總時長減去已包圍片段的差，包括計時呼叫、字典操作和片段之間的程序工作。

## 本機結果：改好了一部分，但還沒有勝過重算

下表各列是該片段獨立中位數，單位微秒，**不能把各列中位數相加當作總時長中位數**。

| 路徑 | 總查詢 | 簽名 | 查找 | 復制 | 計算 |
| --- | --- | --- | --- | --- | --- |
| full | 252.7 | — | — | — | 250.9 |
| rehash | 682.7 | 365.2 | 2.8 | 12.0 | 290.4 |
| frozen | 273.6 | 0.6 | 2.2 | 9.0 | 257.1 |

在這個永遠命中的小工作負載里，避免每次計算源碼/權重簽名明顯縮短了查詢。但frozen中位數仍比full多20.9微秒。陣列較小、呼叫與分段計算成本仍存在；本輪沒有繼續分解NumPy內部開銷，因此不能給出更細的確定歸因。

這也不是上一輪4860次請求結果的“更正”：上一輪含冷啟動、工作集和淘汰，本輪故意排除了它們。兩者的分母和測量邊界不同，不應直接拼成加速圖。

## 讀程式碼時注意所有權

命中後仍復制快取陣列，再傳給續算。若直接把公共快取作為可變工作區，某次續算可能污染下一個請求；性能優化不能以隱式共享寫入換取。是否可以安全地減少復制，需要明確陣列是否只讀、層內是否分配新陣列，并增加跨請求隔離驗證，本輪沒有擅自省掉。

## 小練習

先讀已有記錄，再決定是否重新測量。以下是AI輔助整理的歸檔讀數練習，不新增效能採樣。在下方固定提交的`hohoo-ai-lab`工程根目錄執行整個PowerShell程式碼區塊；只用Python標準函式庫，無需安裝NumPy、模型或金鑰，也不會寫入證據目錄。這裡不是部落格倉庫。

它先核對`profile.json`與歸檔manifest的指紋，只選擇`rehash`路徑，再逐行驗證總時間與五段之和相等。所有輸出單位都是奈秒。

~~~powershell
@'
import hashlib
import json
from pathlib import Path
from statistics import median

folder = Path("experiments/10-attention-costs/evidence/20261007")
payload = (folder / "profile.json").read_bytes()
manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
if hashlib.sha256(payload).hexdigest() != manifest["files"]["profile.json"]:
    raise SystemExit("profile fingerprint mismatch")
rows = [r for r in json.loads(payload) if r["mode"] == "rehash"]
parts = ("signature_ns", "lookup_ns", "copy_ns", "compute_ns", "residual_ns")
if not rows or any(sum(r[k] for k in parts) != r["total_ns"] for r in rows):
    raise SystemExit("missing rows or inconsistent timing accounting")
first = rows[0]
print(json.dumps({
    "mode": "rehash",
    "rows": len(rows),
    "first_seed": first["seed"],
    "first_repeat": first["repeat"],
    "first_parts_ns": {k: first[k] for k in parts},
    "first_sum_ns": sum(first[k] for k in parts),
    "first_total_ns": first["total_ns"],
    "sum_of_column_medians_ns": sum(median(r[k] for r in rows) for k in parts),
    "median_of_row_sums_ns": median(sum(r[k] for k in parts) for r in rows),
    "median_total_ns": median(r["total_ns"] for r in rows),
}, indent=2))
'@ | python -
~~~

固定歸檔的預期結果為303行，第一行`seed=7, repeat=0`。將奈秒除以1000，依序核對簽名、查找、複製、續算與residual：

~~~text
403.9 + 2.8 + 12.6 + 290.3 + 5.7
= 715.3 微秒
~~~

但逐欄中位數相加得到676.1微秒；先對每行求和、再取中位數得到682.7微秒，與`median_total_ns / 1000`一致。各欄的中間位置可能來自不同請求，所以「每一行都算得平」不能推出「各欄中位數也算得平」。

不能把兩者之差6.6微秒叫作「尚未發現的瓶頸」，也不能用676.1取代總查詢中位數。`residual`已逐行計入，差別來自統計順序；它沒有進一步解釋NumPy內部成本。自檢時先預測兩種算法是否一定相等，再用整數奈秒讀數驗證，避免先將各欄四捨五入後相加。

若找不到檔案，先確認工程根目錄與固定提交；指紋不一致時停止，檢查是否混入另一次執行的記錄，不要修改manifest來消除提示。真正測試新條件時，才增大輸入長度並在新目錄重新執行；不要預寫「長序列一定更快」，先檢查固定前綴長度是否仍合理。

若不同機器數值變化，先檢查NumPy/BLAS版本、線程環境、後臺負載與計時范圍。若結果不等價，先檢查模型身份和絕對位置，不應先討論速度。下一篇研究[不保存完整注意力分數矩陣](/docs/llm/tiled-online-softmax)，換一個內存問題。

## 從干凈目錄復現

使用 Python 3.12。入口一次運行這組三個主題的對照，各篇只解讀自己的子集，不把同一份記錄重復當作新增回合。

~~~sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 02a2660e22c969e70e3a6f095003614a7dfa448e
~~~

只核對歸檔時，停在這裡並執行上方練習即可。需要重新採樣時，再安裝依賴並執行下方完整實驗；這會重跑三個主題，而不是只做讀數核對。

~~~sh
python -m pip install numpy==2.2.6
python experiments/10-attention-costs/run.py --out outputs/my-run
python experiments/10-attention-costs/audit.py outputs/my-run
~~~

輸出目錄必須不存在。本機驗證環境為 Windows，Linux/macOS尚未復測。不需要模型密鑰或付費服務。manifest中的程式碼凍結提交早于上方含證據的歸檔提交，源碼哈希對應實際執行檔案。
