---
title: "LLM機制實驗（三）：快取只留四格，為什麼不等於重算四個Token？"
description: "用雙層滑動注意力區分絕對位置、快取槽位和歷史表示，展示兩種形狀正確卻計算錯誤的實現。"
slug: "/llm/sliding-cache-positions"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 8
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:attention-mechanisms", "project:hohoo-ai-lab", "doc:llm/causal-mask-lab", "doc:llm/kv-cache-equivalence"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/experiments/05-attention-lab) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/experiments/05-attention-lab/evidence/20261003) · [實驗檔案](/labs/attention-mechanisms)

快取越積越大，一個自然的想法是只保留最近四個位置。但“保留四格”至少有三種實現：保留四份已經算好的K/V；把當前Token的位置重新編號；每次只把最後四個原始Token重新送進網絡。

它們的記憶體和形狀可能相近，計算意義卻不同。本篇在上一輪[快取等價實驗](/docs/llm/kv-cache-equivalence)上只引入窗口限制，其余參數保持一致。

## 1. 窗口的定義必須寫清楚

窗口W=4，包含當前Token。絕對位置i只能讀取 `i-3`到i；序列開頭不足四個位置時，讀取已有部分。完整參考實現仍對全部輸入計算，但每層每行按這個範圍做掩碼。

增量實現則維護每層K/V和它們的絕對位置。計算新Token時暫時把新K/V接在舊快取後面，掩碼屏蔽窗口外位置；計算完才保留最後四份。快取槽位0可能對應絕對位置20，二者不能混用。

由於拼接，瞬時數組可能超過四格。最終K/V有效負載固定為2048 bytes，不代表整個進程或分配峰值只有這么大。

## 2. 正確窗口快取與完整窗口參考一致

固定輸入24個ID、兩層16維float64注意力、種子7/19/41。按每個位置的16維最終表示計算最大絕對誤差：

| 種子 | 正確窗口快取 | 每次重置新Token位置 | 只重算最近四個原始Token |
|---|---:|---:|---:|
| 7 | 4.996e-16 | 1.639644 | 0.322195 |
| 19 | 5.274e-16 | 1.581518 | 0.412958 |
| 41 | 3.331e-16 | 1.483657 | 0.391865 |

所有列都與“完整輸入、每層使用相同滑動掩碼”的參考比較。第一列在1e-12容差內；後兩列是故意保留的錯誤或不同語義對照，不是模型能力差異。

<img src="/media/practice/cache-positions.png" alt="窗口快取、位置重置和裁剪後重算，相對完整窗口參考的逐位置誤差" width="1500" height="600" loading="lazy" />

## 3. 第一個錯誤：把槽位當成位置

本實驗使用加法式絕對正弦位置編碼：`input = embedding(token) + position(absolute_index)`。當處理第20個Token時，即使快取只有四格，它也不應重新變成位置0。

錯誤對照在每次單Token調用時都加入位置0的編碼。注意力掩碼仍使用正確的絕對索引，所以這個對照只改變輸入的位置表示，不同時摻入“掩碼也錯了”的因素。

結果表明，本實現里重置位置會改變輸出。這裡沒有實現RoPE，因此不能直接把數值推廣到RoPE重定位或旋轉快取的方案；不同位置機制需要自己的等價性檢查。

## 4. 第二個差別：上層快取已經帶著更早的資訊

為了排除位置錯誤，裁剪重算對照仍給剩下的原始Token使用正確的絕對編號。即便如此，雙層輸出仍然不同。

假設位置20的窗口是17、18、19、20。第二層快取中位置17的K/V，來自它在第一層計算好的表示；那個表示可能讀過14、15、16、17。如果只重新輸入17到20，位置17第一層已經看不到14到16，它的第二層K/V當然可能改變。

因此，一個兩層、每層窗口四的位置依賴範圍，可以比“最後四個原始Token”更長。快取保存的是計算過的表示，不是原始文本的四格切片。這解釋了為什麼保持絕對位置仍不能讓裁剪重算等價。

不能由此宣稱滑動窗口保存了無限記憶。本例只有兩層，資訊經過有限的變換與窗口傳播；更不能把坐標誤差翻譯成“模型遺忘了多少事實”。

## 5. 三個索引不要擠成一個變量

```python
past = cache['next_position']
positions = np.arange(past, past + len(new_tokens))
# 每層拼接並按絕對位置做掩碼。
cache['next_position'] = past + len(new_tokens)
# 存儲裁剪不把 next_position 減回窗口大小。
```

工程上分別保留：已處理Token數量、每個快取條目的絕對位置、當前數組槽位。序列長度可能增長，快取長度保持上限，這不是矛盾。

單元測試覆蓋窗口1、4和不裁剪，輸入長度1、2、8、17，三種種子與分塊輸入，共36種組合。錯誤的窗口值、非法Token與全屏蔽查詢會被拒絕。測試通過只約束這個簡化實現；不保證其他架構具有相同性質。

## 6. 重現與可繼續做的研究

```sh
python experiments/05-attention-lab/run.py --out experiments/05-attention-lab/evidence/my-window-run
python experiments/05-attention-lab/audit.py experiments/05-attention-lab/evidence/my-window-run
```

查看 `sliding / sliding_cached / reset / cropped`四組數組。最有價值的下一步不是繼續加術語，而是換成明確版本的真實模型，研究它使用的位置機制與快取策略，再分別驗證數值誤差、記憶體峰值和任務表現。

這次沒有下載權重或發出在線請求。它與仍待授權的L1v3上下文干擾對照是兩類工作，不能替代對Agnes回答行為的實測。通用快取位置背景可參閱 [Hugging Face快取說明](https://huggingface.co/docs/transformers/main/en/cache_explanation)。

## 同方向繼續閱讀

- [LLM機制實驗（一）：改動未來Token，前面的輸出應該變嗎？](/docs/llm/causal-mask-lab)
- [LLM機制實驗（二）：KV Cache省掉了什麼，怎樣證明沒有算錯？](/docs/llm/kv-cache-equivalence)
