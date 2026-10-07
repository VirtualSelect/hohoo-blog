---
title: "KV 快取開銷剖析：把省下的計算和新增的工作分開"
description: "對909次查詢做分段計時，驗證源碼簽名、查找、復制與續算分別花在哪里，同時保留快取仍慢的結果。"
slug: "/llm/cache-cost-profile"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
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

從profile.json任選一行，驗證各段加residual恰好等于total；再對整列分別求中位數，觀察“中位數的和”和“和的中位數”通常不相同。然後增大輸入長度，在新目錄重新運行；不要預寫“長序列一定更快”，先檢查當前固定前綴長度是否仍合理。

若不同機器數值變化，先檢查NumPy/BLAS版本、線程環境、後臺負載與計時范圍。若結果不等價，先檢查模型身份和絕對位置，不應先討論速度。下一篇研究[不保存完整注意力分數矩陣](/docs/llm/tiled-online-softmax)，換一個內存問題。

## 從干凈目錄復現

使用 Python 3.12。入口一次運行這組三個主題的對照，各篇只解讀自己的子集，不把同一份記錄重復當作新增回合。

~~~sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 02a2660e22c969e70e3a6f095003614a7dfa448e
python -m pip install numpy==2.2.6
python experiments/10-attention-costs/run.py --out outputs/my-run
python experiments/10-attention-costs/audit.py outputs/my-run
~~~

輸出目錄必須不存在。本機驗證環境為 Windows，Linux/macOS尚未復測。不需要模型密鑰或付費服務。manifest中的程式碼凍結提交早于上方含證據的歸檔提交，源碼哈希對應實際執行檔案。
