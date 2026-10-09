---
title: "KV 量化軸：Key 與 Value 為什么不能一概而論？"
description: "162組保存整數碼的離線對照，比較全張量、逐Token與K逐通道/V逐Token，保留混合策略並非總更優的結果。"
slug: "/llm/kv-quantization-axes"
status: "published"
published_at: "2026-10-09"
updated: "2026-10-09"
reading_minutes: 10
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
prerequisites: ["doc:llm/kv-int8-error"]
related: ["lab:kv-quantization-axes", "project:hohoo-ai-lab", "doc:llm/tiled-online-softmax"]
---

[固定程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/009289d3c9314d64a495303d9b16517080282788/experiments/11-kv-quantization-axes) · [輸入、整數碼與輸出](https://github.com/VirtualSelect/hohoo-ai-lab/tree/009289d3c9314d64a495303d9b16517080282788/experiments/11-kv-quantization-axes/evidence) · [實驗檔案](/labs/kv-quantization-axes)

上一篇看到：逐行 int8 能縮小 KV 表示，但一行中較大的元素仍會壓低其他元素的分辨率。那就把分組換成“逐通道”，是否一定更好？本篇的答案是：**取決于離群值怎樣分布，不能只記住一個推薦軸。**

本輪不是訓練模型評測。它保存固定隨機數組、量化整數碼、scale 與注意力輸出，用可以控制的分布解釋誤差來源。沒有 Agnes 調用、真實模型權重、GPU 內核或吞吐測量。

## 把行和列對應到實際含義

K、V 都按 `N × D` 排列：N 行是 Token，D 列是特征通道。使用同一對稱量化公式：

```text
scale = max(abs(group)) / 127
code  = clip(round(x / scale), -127, 127)
x_hat = code * scale

全張量：所有元素共用 1 個 scale
逐 Token：每一行共用 1 個 scale，共 N 個
逐通道：每一列共用 1 個 scale，共 D 個
```

假設某一個通道在很多 Token 上都很大。逐 Token 的每一行都會被這個通道拉大 scale，小通道的細節一起損失。逐通道把這個大通道隔離，其他列仍可用自己的小步長。反過來，如果一個 Token 的整行異常大，逐 Token 可以隔離它；逐通道會讓每一列都受到影響。

這是一種可檢驗的機制解釋，不代表真實模型一定按這兩種理想形狀分布。[KIVI](https://arxiv.org/abs/2402.02750)也討論了 K/V 分布與不同量化粒度；本實驗只借鑒問題，不重現其分組、非對稱 2bit、殘差緩存或真實模型結論。

## 為什么 K 誤差與 V 誤差不能混著看

```text
K 的誤差 → QK? / √D → Softmax 權重變化 → 輸出
V 的誤差 ─────────────────────────→ 加權和變化
```

K 改變“關注誰”，V 改變“拿到什么”。本輪把量化目標拆成 K-only、V-only 和 KV，而不是只展示二者同時變化后的一個數字。注意力使用穩定 Softmax 和 float64 計算；輸入與未量化的緩存基準為 float32，不能把不同精度的存儲賬混在一起。

協議固定種子 7、19、41，長度 64、256，D=32，8 個 Query。每份基礎數組再構造三個條件：保持干凈；K 的第 0 列乘 40；V 的第 0 行乘 40。相同輸入比較三種方案，三個量化目標，共 **18 份輸入、162 個輸出對照**。改變條件不重新抽隨機數，盡量減少無關差異。

## 結果：混合策略有優勢，也有明確反例

誤差定義為 `||輸出 - 參考輸出||? / ||參考輸出||?`。下表為每個條件的六份輸入（3 種子 × 2 長度）分別計算相對誤差后取算術平均，單位 %；不是“平均輸出的誤差”，也不代表真實任務準確率。

| 同時量化 K/V | 全張量 | 全部逐 Token | K 逐通道 / V 逐 Token |
| --- | ---: | ---: | ---: |
| 干凈輸入 | 1.2067 | **0.8006** | 0.8818 |
| K 通道離群值 | 13.9727 | 7.9781 | **1.9215** |
| V Token 離群值 | 8.9957 | **0.7364** | 0.8106 |

![三種量化規則在三種合成分布下的相對輸出誤差](/img/research/20261009/quantization-zh-TW.svg)

只量化 K 時，K 通道離群條件下的誤差分別是 13.9658%、7.9645%、1.7653%；這支持“按通道隔離大幅值”的局部解釋。只量化 V 時，V 行離群條件下全張量誤差 8.9198%，逐 Token 與混合都是 0.5427%，因為兩者對 V 做的是同一件事。

但干凈輸入和 V 行離群條件下，混合方案都沒有超過全部逐 Token。這里沒有足夠證據說它“更通用”。也不要未經分解就把全部輸出誤差歸因于 Softmax；保存的 K-only/V-only 對照正是用來限制這種過度解釋。

## scale 也需要占空間

下面統計 K/V 同時量化后的數值 payload，含 float32 scale，排除對象頭、分配器與工作區。

| N | float32 K/V | 全張量 int8 | 全部逐 Token | K 通道 / V Token |
| --- | ---: | ---: | ---: | ---: |
| 64 | 16,384 B | 4,104 B | 4,608 B | 4,480 B |
| 256 | 65,536 B | 16,392 B | 18,432 B | 17,536 B |

混合方案的公式為 `2ND + 4D + 4N` 字節。N=256 時減少 73.24% 的緩存數組字節；不是嚴格減少 75%。`arrays.npz` 為便于審計重復保存若干數組，它的壓縮檔案大小也不等于真實推理緩存大小。

本例把 int8 解量化為 float64 再做矩陣乘法，因此只證明存儲表示和局部誤差，**沒有證明實際顯存降低或生成更快**。如果把這個 Python 路徑直接放進解碼循環，解量化和臨時分配甚至可能抵消收益；本輪沒有計時，不能替它編一個加速比。

## 從干凈目錄重現

以下為 Windows PowerShell，明確指定虛擬環境的解譯器，不依賴啟用腳本。

```powershell
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 009289d3c9314d64a495303d9b16517080282788
python -m venv .venv
$py = '.\.venv\Scripts\python.exe'
& $py -m pip install -r experiments/11-kv-quantization-axes/requirements.txt
& $py -m unittest discover -s experiments/11-kv-quantization-axes -p "test_*.py"
& $py experiments/11-kv-quantization-axes/run.py --out experiments/11-kv-quantization-axes/target/my-run
& $py experiments/11-kv-quantization-axes/audit.py experiments/11-kv-quantization-axes/target/my-run
```

本機 Python 3.12.14 / NumPy 2.2.6 / Windows 已驗證，其他平臺未復測。預期 4 個單測通過，保存 162 個對照，獨立審計輸出 `PASS: 162 archived comparisons...`。審計不用實現中的 attention 函數，而從歸檔整數碼和 scale 解量化，再用另一種 NumPy 表達重算輸出、誤差和字節數。

若 scale 形狀不對，檢查歸約軸：逐 Token 應為 `(N,1)`，逐通道為 `(1,D)`。全零組將 scale 設為 1，不能除以零；輸入 NaN/Inf 會被拒絕。若修改原始碼后舊證據雜湊不匹配，應執行新輸出目錄，不要修改 manifest 來掩蓋差異。

小練習：讓 V 改為“列離群”，預測逐 Token 還能否隔離誤差；然後為這組新條件另存協議與結果。需要進入真實模型之前，應先測真實 K/V 分布、分組粒度、任務質量、反量化代價與實際內存。這些仍是后續驗證，不由本輪隨機數組代替。
