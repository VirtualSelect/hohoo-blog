---
title: "LLM 機制實驗（五）：改了歷史，能否只重算變化的後綴？"
description: "27 個固定條件、81 個原始數組，驗證最長相同前綴裁剪、位置同步、滑窗回退與作用域隔離。"
slug: "/llm/longest-prefix-reuse"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 10
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
related: ["lab:longest-prefix-reuse", "project:hohoo-ai-lab", "doc:llm/prefix-cache-invalidation", "doc:llm/sliding-cache-positions"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/ad2929e2b2b7decdb578d16e4ccafb666496ebfd/experiments/07-prefix-reuse) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-ai-lab/tree/ad2929e2b2b7decdb578d16e4ccafb666496ebfd/experiments/07-prefix-reuse/evidence/20261003) · [實驗檔案](/labs/longest-prefix-reuse)

上一篇給前綴快取加上身份校驗：Token、權重、窗口或作用域不匹配，就重新計算。正確性有了，但策略很保守。用戶只改了第八個 Token，前七個 Token 的計算真的也要扔掉嗎？

本輪在同一個未訓練的 NumPy Decoder 上實現“最長相同前綴”重用。三個固定種子、九種條件，共 27 例。正確路徑與完整重算的最大絕對誤差約為 `3.89e-16`；故意保留舊位置編號的路徑，在九個局部重用案例中產生明顯誤差。

這裡比較的是中間狀態數值與投影行數，沒有測量在線模型、GPU 時延、生成質量或實際服務吞吐。

## 先看一次歷史編輯

把 Token ID 簡寫成數字。快取中已有：

```text
old: 1 2 3 4 5 6 7 8
new: 1 2 3 4 20 6 7 8 9 10 11 12
     └─ 相同 ─┘ └────── 必須重算 ──────┘
cut = 4
```

雖然新序列第六到第八個 Token 的 ID 又與舊序列相同，它們的快取也不能直接拿來用：中間已經改變的 Token 會影響後續層的上下文。可重用的是從開頭連續相同的一段，而不是把所有相同 ID 的位置拼起來。

在本例的因果注意力中，相同前綴的狀態不依賴未來 Token。因此，在計算配置和位置都相同的前提下，可以保留每一層前 `cut` 行 K/V，再從絕對位置 `cut` 繼續計算。KV Cache 的一般用途與配置差異可參見 [Transformers 快取文檔](https://huggingface.co/docs/transformers/main/en/kv_cache)；本文下面的實現與數字來自本地教學模型。

## 哪些東西必須一起裁剪

倉庫里的快取保存三類內容：各層 K、各層 V、每行的絕對位置。此外還有下一段輸入的起始位置 `next_position`。

```python
cache = {
    'next_position': cut,
    'layers': [
        (k[:cut].copy(), v[:cut].copy(), positions[:cut].copy())
        for k, v, positions in stored['layers']
    ],
}
out, _ = model.chunk(tokens[cut:], cache=cache)
```

只裁剪 K/V、不修改 `next_position`，會把新後綴繼續放到舊長度 8 後面。此時前四個快取位置是 0、1、2、3，新 Token 卻從位置 8 開始編碼，中間憑空跳過四個位置。張量維度仍能對上，程序可能不會報錯，數值卻已經偏離目標計算。

這也是本輪的負對照：相同的裁剪、相同的後綴，只故意保留舊 `next_position`。不要把這種位置錯位與浮點舍入誤差混為一談。

## 查詢流程與快取所有權

`Store` 最多保留兩條預填充結果。本輪先存普通前綴 `1..8`，再存分支 `1,2,3,4,5,20,21,22`。查詢按以下順序執行：

1. 驗證非空整數 Token ID；浮點數 `1.0` 不能因為轉成整數後相同就命中。
2. 比較應用作用域和計算簽名。簽名包含模型權重、實現、窗口和位置編碼約定。
3. 在合格條目里找最長連續相同前綴；並列時使用最近插入條目。
4. 複製需要保留的 K/V 和位置，再計算剩餘後綴。

複製讓這次查詢不能修改另一條分支援有的 NumPy 數組。它只是本地所有權約束，不等於生產快取的分頁、引用計數或跨進程並發控制。`scope` 也是呼叫方提供的字串，不是用戶認證系統。

還有一個容易忽略的邊界：查詢比快取更短，或者完全等於快取。這裡沒有額外保存各 Token 的最終輸出，所以令 `cut <= len(query)-1`，至少重算最後一個 Token，避免空後綴卻拿不到輸出。若生產實現保存了額外輸出，可以設計另一條路徑，不能直接從這份示例推斷“整段命中無需任何計算”。

## 27 例得到的計算量與誤差

模型保持上一輪配置：兩層、單頭、維度 16、詞表 32、float64、絕對正弦位置編碼和 tanh 殘差；沒有訓練、FFN、LayerNorm 或自然語言 tokenizer。種子為 7、11、23。

<img src="/media/practice/longest-prefix-reuse.png" width="1500" height="600" loading="lazy" alt="九種條件的完整重算與重用後QKV投影行數；右側三個種子展示錯誤位置編號在局部重用中的非零誤差。" />

| 條件 | 查詢長度 | 重用行數 cut | 本次投影行數 | 完整重算投影行數 |
| --- | ---: | ---: | ---: | ---: |
| 原前綴後追加 | 12 | 8 | 24 | 72 |
| 修改首 Token | 12 | 0 | 72 | 72 |
| 修改第五個 Token | 12 | 4 | 48 | 72 |
| 修改第八個 Token | 12 | 7 | 30 | 72 |
| 縮短成前四個 Token | 4 | 3 | 6 | 24 |
| 從第二條分支追加 | 12 | 8 | 24 | 72 |
| 更換作用域 | 12 | 0 | 72 | 72 |
| 滑窗快取中修改第五個 Token | 12 | 0 | 72 | 72 |
| 滑窗快取後正常追加 | 12 | 8 | 24 | 72 |

投影計數為 `層數 × Q/K/V 三次投影 × 新計算 Token 數`，即本例的 `6 × (queryLength-cut)`。這是繼續計算階段的計數，不包括原先預填充、全權重哈希、查找、複製和記憶體管理成本，所以不能把 72 降到 24 寫成“推理加速三倍”。

獨立審計重算了 81 個歸檔數組的 54 項誤差，並檢查切點和投影計數。全部正確路徑誤差低於凍結閾值 `1e-12`。九個局部重用負對照明顯超出閾值：種子 7 的中段修改誤差為 `1.37749785`，末尾修改為 `0.64189345`。這證明的是本矩陣能暴露位置錯誤，不是未訓練模型的語言能力。

## 為什麼滑窗部分命中必須回退

全注意力快取還保留前八行時，可以取前四行。窗口為 4 的快取則只剩最後四行，即位置 4、5、6、7；想重用位置 0、1、2、3 時，資料已經被淘汰。

不能對“剩餘數組的前四行”執行切片後，把它們重新命名為“歷史的前四行”。本實現對滑窗采用保守規則：只有整條已快取前綴匹配、並且查詢還包含新後綴時，才重用現存窗口；部分命中直接重算。

這並不意味著滑窗永遠不能重用較短前綴。若保存檢查點、分頁歷史或可回滾的其他狀態，可以設計更細的策略。本輪沒有這些存儲結構，因此不假裝存在可用快取。

## 如何復現並驗證自己理解了

在 `hohoo-ai-lab` 倉庫根目錄執行，環境需要 Python 3 與 NumPy。歸檔環境為 Python 3.12.14、NumPy 2.2.6；沒有模型密鑰。

```sh
python -m unittest discover -s experiments/07-prefix-reuse -p "test_*.py"
python experiments/07-prefix-reuse/run.py --out experiments/07-prefix-reuse/evidence/MY-RUN
python experiments/07-prefix-reuse/audit.py experiments/07-prefix-reuse/evidence/MY-RUN
```

七項測試覆蓋中段編輯、單 Token 查詢、分支不變性、作用域/權重變化、滑窗回退、容量和非法 ID。輸出目錄必須新建，審計檢查源檔案與原始數組哈希；不要覆蓋舊結果來隱藏失敗。

可以先把編輯位置從第五個 Token 改到第二個，預測切點應變成 1，再運行新條件。接著問自己：即使第六個 Token 的 ID 沒變，它上層的表示為什麼也需要重算？如果只能回答“快取失效”，還沒有抓住因果前綴的依賴關系。

## 這一輪留下的工程判斷

快取重用的單位是**身份與計算條件一致的連續前綴**。正確切片只是其中一半；下一段的位置、滑窗里還剩什麼、條目屬於哪個作用域，同樣決定能否重用。

下一步適合驗證分塊存儲與淘汰後的重用率，同時把查找、複製、預填充成本納入測量。當前計數不足以回答生產系統是否更快，也不能直接移植到 RoPE、量化 KV 或多請求調度器而不重新驗證。
