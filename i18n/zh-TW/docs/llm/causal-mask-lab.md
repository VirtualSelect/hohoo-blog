---
title: "LLM機制實驗（一）：改動未來Token，前面的輸出應該變嗎？"
description: "從手算兩行Attention到雙層數值對照，驗證因果掩碼、Softmax與未來資訊泄漏。"
slug: "/llm/causal-mask-lab"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 8
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:attention-mechanisms", "project:hohoo-ai-lab", "doc:llm/kv-cache-equivalence", "doc:llm/sliding-cache-positions"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/experiments/05-attention-lab) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/experiments/05-attention-lab/evidence/20261003) · [實驗檔案](/labs/attention-mechanisms)

以前的[上下文位置對照](/docs/llm/context-position-paired-protocol)從介面外部觀察模型。這一組文章換到計算內部：實現一個很小的注意力網絡，逐個檢查“哪些位置可以影響哪些位置”。

網絡沒有訓練，也不會生成有意義的語言。它使用32個離散ID、16維表示、兩個單頭注意力層，每層是 `tanh(x + attention(x))`；位置使用絕對正弦編碼，計算為float64。沒有Tokenizer、FFN、歸一化、Dropout或Agnes請求。**這裡驗證的是確定的計算關系，不是語言理解能力。**

## 1. 一個能直接手算的注意力例子

先令Q和K全為0，V的兩行為 `[2,4]`、`[6,8]`。分數都是0，Softmax會對允許讀取的位置平均分配權重。

| 查詢行 | 允許的Key | 權重 | 輸出 |
|---|---|---|---|
| 位置0 | 0 | `[1,0]` | `[2,4]` |
| 位置1 | 0、1 | `[0.5,0.5]` | `[4,6]` |

第一行不能讀取第二行，這就是本例的因果要求。若沒有掩碼，兩行都會輸出 `[4,6]`，位置0提前使用了未來值。測試 `test_hand_attention` 獨立固定了這組手算答案，避免只用兩個相似實現互相證明正確。

## 2. 掩碼必須作用在Softmax之前

```python
scores = q @ k.T / np.sqrt(d)
allowed = key_positions[None, :] <= query_positions[:, None]
scores = np.where(allowed, scores, -np.inf)
ex = np.exp(scores - scores.max(axis=1, keepdims=True))
weights = ex / ex.sum(axis=1, keepdims=True)
output = weights @ v
```

被禁止位置的指數為0，再對剩余位置歸一化。如果先Softmax再把未來權重清零，而不重新歸一化，輸出尺度會改變。程式碼還拒絕“某一行所有位置都被屏蔽”，否則減去負無窮可能產生NaN。

減去每行最大值避免指數溢出；它不改變歸一化後的分布。測試另用很大的相同分數檢查有限結果和平均權重。這裡的 `1/sqrt(d)`縮放與“禁止未來位置”是不同作用，不應混成一句“掩碼讓注意力穩定”。

## 3. 凍結一個未來擾動實驗

輸入長24，`tokens[i]=(7*i+3)%32`。只將索引12到23的ID加1再取模，前12個輸入完全不動。分別運行因果掩碼和無掩碼版本，比較前12行最終表示的最大絕對坐標變化。

權重由固定種子7、19、41生成，材料和參數在運行前保存。沒有根據結果挑選“最好看”的種子。

| 權重種子 | 因果版本前12行變化 | 無掩碼前12行變化 |
|---|---:|---:|
| 7 | 0 | 0.139619 |
| 19 | 0 | 0.081980 |
| 41 | 0 | 0.328622 |

數字是隱藏表示的坐標差，不是正確率、置信度或損失值。三次0與因果結構一致；另外三個非零反例說明，這組輸入確實能檢出未來資訊泄漏，不是網絡碰巧對改動毫無反應。

<img src="/media/practice/causal-mask.png" alt="因果注意力矩陣，以及僅改動後半輸入時每個位置的表示變化" width="1500" height="600" loading="lazy" />

左圖是種子7第一層的實際權重，上三角為0。右圖比較完整雙層輸出，虛線右側才是被修改的位置。不能把右側出現變化誤認為因果掩碼失效：那些位置自己的輸入本來就變了。

## 4. 因果性如何穿過第二層

第一層位置i只依賴位置0到i。第二層位置i讀取這些位置的第一層表示，而它們也沒有讀取i之後的資訊。因此，在逐位置殘差和激活不混入未來的前提下，第二層仍是因果的。

這個推導有工程前提：位置編碼相同、參數相同、掩碼正確，且沒有額外的跨位置操作泄漏資訊。若訓練和推理使用不同掩碼，訓練中較低的損失可能只是看到了答案，而不是學會了預測。

本實驗沒有訓練損失，不能從圖上推導訓練收益；它提供的是一種能早期抓住實現錯誤的驗收方式。

## 5. 重現與檢查檔案

```sh
python -m unittest discover -s experiments/05-attention-lab -p "test_*.py"
python experiments/05-attention-lab/run.py --out experiments/05-attention-lab/evidence/my-run
python experiments/05-attention-lab/audit.py experiments/05-attention-lab/evidence/my-run
```

依賴為NumPy2.2.6；本次Python3.12.14。9個測試方法包含36種種子/長度/窗口組合的分塊對照。`arrays.npz`保存48個具名數組，審計程式不導入網絡實現，而是用存檔矩陣重算27個誤差指標、掩碼結構和運算計數。

下一篇：[KV Cache為什麼能復用舊表示](/docs/llm/kv-cache-equivalence)。如果舊位置本來會讀取未來，那麼新Token出現後舊K/V也會變化，簡單快取就失去了等價依據。

通用注意力形式與因果遮罩背景見 [Transformer原論文](https://arxiv.org/abs/1706.03762)。本篇簡化網絡和全部數值來自配套實現，不聲稱重現原論文的機器翻譯結果。

## 同方向繼續閱讀

- [LLM機制實驗（二）：KV Cache省掉了什麼，怎樣證明沒有算錯？](/docs/llm/kv-cache-equivalence)
- [LLM機制實驗（三）：快取只留四格，為什麼不等於重算四個Token？](/docs/llm/sliding-cache-positions)
