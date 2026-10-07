---
title: "注意力分塊：不保存完整分數矩陣，如何保持結果？"
description: "從錯誤的分塊平均出發，推導在線Softmax累加，并用9組陣列和558次計時區分省內存與加速。"
slug: "/llm/tiled-online-softmax"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:tiled-online-softmax", "project:hohoo-ai-lab", "doc:llm/kv-cache-equivalence"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs) · [原始證據](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs/evidence/20261007) · [實驗檔案](/labs/tiled-online-softmax)

注意力的一行輸出，是所有Key對應Value的加權和。如果Key很長，直接形成QK轉置的完整分數矩陣會占空間。一個直覺方案是“分成幾塊，每塊算Softmax，最後把輸出平均”。本篇先說明它為什麼錯，再寫出不保存完整分數矩陣的累加過程。

這是NumPy機制演示，**不是FlashAttention GPU實現，也沒有復現論文加速比**。本實驗的8行query都可以讀取全部KV，用于表示已有上下文的非掩碼查詢；不能直接拿去替代需要因果掩碼的訓練prefill。

## 為什麼每塊單獨歸一化再平均不對

Softmax的分母是所有分數的指數和。兩塊即使長度相同，概率質量也未必一半一半。分塊獨立歸一化會把每塊都強制加到1，平均又給各塊相同權重，丟失塊之間的相對分數。

負例用三個標量分數0、10、20和Value 1、3、5：完整Softmax幾乎只選最後一個Value；把前兩個作為一塊、最後一個單獨一塊，平均會錯誤地向較小Value偏移。配套單測專門要求錯誤基線出現可見偏差。

## 只要保留三個累積量

對每行query，保存當前最大分數m、歸一化分母l、未除分母的加權和a。讀到新塊分數S後：

~~~text
m_new = max(m, max(S))
rescale = exp(m - m_new)
P = exp(S - m_new)
a_new = a * rescale + P @ V_block
l_new = l * rescale + sum(P)
output = a / l
~~~

最大值變化時，舊分母和舊加權和都要乘rescale，才能回到相同的指數基準。只縮放其中一個會破壞比例。初始m為負無窮、l和a為零；首塊自然接管。

在精確算術中這個改寫保留同一歸一化式，浮點運算次序不同則只能要求誤差容限，不能要求逐位元組相等。空塊、全掩碼行也需要單獨處理；本輪輸入非空且沒有掩碼，程式碼沒有聲稱支持所有注意力形式。

## 實際陣列與耗時

3種子×64/256/1024個KV，query固定8行、維度32、塊長32。每組保存Q/K/V、dense/tiled/錯誤基線輸出；各路徑預熱5次，再交錯計時31輪，共558個正式計時。dense與tiled最大差為3.33e-16。

| KV長度 | dense分數陣列 | 單塊分數陣列 | dense中位耗時 | tiled中位耗時 |
| --- | --- | --- | --- | --- |
| 64 | 4,096 B | 2,048 B | 80.6µs | 190.3µs |
| 256 | 16,384 B | 2,048 B | 151.3µs | 685.3µs |
| 1024 | 65,536 B | 2,048 B | 435.0µs | 2,235.5µs |

陣列位元組僅計算分數矩陣，不是進程峰值內存。實現還同時保留概率塊、累積量、Q/K/V以及Python對象。這里確實減少了單個分數臨時陣列，但測得的NumPy路徑仍更慢。循環、小矩陣呼叫與內存分配都可能貢獻開銷；本輪沒有逐項剖析，不能斷言哪一項是主因。

## 與真正的FlashAttention有什麼關係

[FlashAttention論文](https://arxiv.org/abs/2205.14135)將分塊計算與GPU內存層級結合，重點是減少高帶寬內存和片上存儲之間的訪問。本篇只展示分塊歸一化這個可讀的數學部件，沒有kernel融合、反向傳播、GPU訪存測量或訓練結果。

因此不能從“公式類似”跳到“實現了FlashAttention”。算法表示、硬體實現、端到端性能，是三層不同證據。

## 練習與排錯

把塊長改成不整除序列長度的7，再與dense比較；最後一塊更短也應該滿足數值容差。把分數放大觀察普通指數直接溢出的風險，當前max平移應保持有限結果。最後故意刪掉舊a的rescale，觀察誤差增大。

若數值正確但慢，先保留負結果，再討論硬體和陣列規模；若數值錯誤，優先檢查歸一化基準而不是調寬容差。下一篇轉向[KV量化的存儲與誤差](/docs/llm/kv-int8-error)。

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
