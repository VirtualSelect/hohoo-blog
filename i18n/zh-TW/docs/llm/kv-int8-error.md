---
title: "KV 量化入門：省下多少位元組，又引入什麼誤差？"
description: "比較整張量與逐行int8量化，顯式計入scale，觀察離群值對注意力輸出的影響。"
slug: "/llm/kv-int8-error"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:kv-int8-error", "project:hohoo-ai-lab", "doc:llm/tiled-online-softmax"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs) · [原始證據](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/experiments/10-attention-costs/evidence/20261007) · [實驗檔案](/labs/kv-int8-error)

把KV從float32變成int8，直覺上能縮小四倍。但這句話遺漏了量化參數，也沒有回答更關鍵的問題：量化誤差經過Softmax後，會怎樣影響輸出？

本篇保存合成K/V陣列，比較整張量一個scale與每行一個scale。沒有訓練模型、自然語言問答或GPU量化算子。壓縮的是存儲表示；計算時會還原成float64，所以**不宣稱降低計算峰值內存或提升吞吐**。

## 先把一個數怎樣變化講清楚

使用對稱int8范圍[-127,127]，scale為該組最大絕對值除127：

~~~text
scale = max(abs(x)) / 127
q = round(x / scale)
x_hat = q * scale
~~~

全零組把scale設為1，避免除零。scale以float32保存，量化值以int8保存。四舍五入誤差大致由半個量化步長控制，還要考慮scale自身浮點精度；本例單測檢查固定正常陣列，不聲稱任意輸入都可忽略scale誤差。

整張量只存一個scale，開銷小；逐行可以讓不同Token使用自己的范圍，但要多存scale。它也不能解決同一行內一個很大元素壓縮其他小元素分辨率的問題。

## 為什麼離群值重要

本輪在K和V的第一個元素上施加40倍擾動，再用同樣輸入比較。這個人為設置不等于真實LLM的分布，只用于觀察動態范圍擴大。

~~~text
K量化誤差 → QK分數變化 → Softmax權重變化
V量化誤差 ───────────────────→ 加權和變化
~~~

兩處誤差可以共同影響輸出。僅檢查KV逐元素誤差，不足以替代注意力輸出對照；更不能替代真實模型任務質量評測。

## 位元組賬單

維度32、K和V各N行；下表含兩份scale，不含對象頭或分配器開銷。

| N | float32 KV | 整張量int8 + scale | 逐行int8 + scale |
| --- | --- | --- | --- |
| 64 | 16,384 B | 4,104 B | 4,608 B |
| 256 | 65,536 B | 16,392 B | 18,432 B |
| 1024 | 262,144 B | 65,544 B | 73,728 B |

逐行在N=256時比float32少存約71.9%的陣列位元組，而不是嚴格75%。基準是同形狀float32表示；數值參考和實際實驗計算用float64，分母不能混用。

## 輸出誤差并非一個固定折扣

3種子×3長度×正常/離群×兩策略，共36組。以種子7、長度256的最大絕對輸出差為例：

| 輸入 | 整張量 | 逐行 |
| --- | --- | --- |
| 正常 | 0.00437 | 0.00247 |
| 40倍單元素擾動 | 0.04396 | 0.04295 |

逐行在這個樣本有幫助，但離群情況下差距很小。完整矩陣最大絕對輸出誤差達到4.136，不能只展示上表溫和樣本就說“幾乎無損”。原始數據保存每組誤差與輸出陣列；這些絕對誤差的意義還依賴輸出尺度。

[KIVI研究](https://arxiv.org/abs/2402.02750)討論了Key與Value分布差異，并采用不同分組方式。本篇兩者都使用同一簡單策略，沒有實現KIVI的2bit方案，也不能借用其真實模型結論。

## 可以自己做的兩個檢查

首先把全部KV設為零，輸出應有限且為零；再把一個元素放大，觀察哪一個scale發生變化。整張量會影響全體精度，逐行只改變該行，但該行內部的小元素仍可能受損。

若想判斷可否用于生產，下一步需要真實模型的校準分布、任務誤差、反量化代價、峰值顯存和端到端性能。這些是後續候選，不能從36組隨機陣列自動推導。優先讀懂本輪保存的負結果，而不是追求一個好看的壓縮倍數。

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
