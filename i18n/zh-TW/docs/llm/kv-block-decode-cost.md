---
title: "KV分塊反量化：工作區小了，為什么更慢？"
description: "區分快取負載、工作陣列和實測耗時，保留分塊CPU實現更慢的810條計時記錄。"
slug: "/llm/kv-block-decode-cost"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
prerequisites: ["doc:llm/kv-residual-window"]
related: ["lab:packed-kv", "project:hohoo-ai-lab"]
---

[固定程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv) · [原始證據](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv/evidence) · [實驗檔案](/labs/packed-kv)

壓縮快取後，最簡單的計算方式是先把整個K/V解碼回浮點，再做注意力。這會重新分配大塊臨時陣列。按塊解碼看上去更節省空間，但它是否也更快？本篇把**數值一致、工作區尺寸和實測耗時**分開驗證。

結果先說清楚：固定協議中，分塊輸出與同一量化快取的全量解碼結果一致；指定解碼陣列變小，但本機NumPy路徑更慢。這裡沒有GPU內核，也沒有完整模型推理。

## 不能逐塊Softmax後直接平均

每塊有不同的最大分數和歸一化常數。直接對各塊做Softmax，再平均各塊輸出，會改變全局權重。需要持續維護三個量：當前最大分數m、指數和z、加權值和u。

```text
m_new = max(m_old, max(block_scores))
a     = exp(m_old - m_new)
z_new = a*z_old + sum(exp(block_scores - m_new))
u_new = a*u_old + exp(block_scores - m_new) @ block_V
output = u / z
```

這個重標定讓已經處理的部分與新塊處在同一個指數尺度。初始m為負無窮，z/u為零。當前程式碼每次解碼32個Token，合並後釋放該次局部引用。

完整算法仍要讀取全部KV，復雜度沒有因為分塊而突然降低。這裡借鑒 [FlashAttention](https://arxiv.org/abs/2205.14135) 的分塊與在線歸一化思想，不重現GPU記憶體層級、融合內核或論文的加速結果。

## 先對齊比較物件

數值對照使用同一組4-bit、group=32的資料。全量解碼和按32 Token分塊使用相同分組邊界，因此可以比較兩種執行方式；它們都不等於未量化原始KV。18份輸入的兩種輸出均通過最大絕對誤差小於 `1e-10` 的凍結閾值。

未量化float32快取作為另一個速度參考。三條路徑都使用float64注意力運算，所以表中的“float32快取”說的是存儲，不是全程float32算術。

## 縮小的是哪些陣列

N=512、D=32、4個Query時：

| 陣列 | 全量解碼 | 每次32 Token分塊 |
| --- | ---: | ---: |
| 解碼後的float32 K/V | 131,072 B | 8,192 B |
| 單個float64 score矩陣 | 16,384 B | 1,024 B |

這只是程式碼中指定陣列的形狀乘dtype位元組數。程式碼還會產生float64轉換、指數權重、累加器，歸檔運行也保留參考陣列和預打包副本；因此它**不是實測行程RSS、顯存峰值或總記憶體下降比例**。

把“單塊小16倍”改寫成“程序記憶體少16倍”，就是越過證據邊界。真正要報告峰值，需要在隔離行程中測量包括分配器與臨時陣列的完整路徑。

## 本機計時：更小的塊沒有帶來更快的執行

每份輸入預熱3輪、正式15輪，輪換三種方法的執行順序，總共810條正式觀測。下表為每種長度、每種方法的135條原始耗時中位數，單位微秒：

| Token數 | float32快取參考 | 全量解碼後計算 | 逐塊解碼並合並 |
| ---: | ---: | ---: | ---: |
| 128 | 36.9 | 97.5 | 277.5 |
| 512 | 91.1 | 252.3 | 1305.0 |

![本機CPU路徑的全部計時分布與中位數](/img/research/20261011/decode-cost.zh-TW.svg)

計時包含反量化、轉換、Softmax和乘法，排除預打包、輸入生成、磁盤保存和模型投影。本機未綁核，沒有多行程隔離或統計顯著性檢驗；重跑會改變具體數字。不能把中位數當作SLA或推廣到GPU。

Python循環、重複分配和小矩陣呼叫都是可能的開銷來源，但本輪沒有分別剖析它們，不能給每項編一個占比。能確認的結論只有：在這個實現和規模下，分塊方案沒有取得端到端局部計算加速。

### 用失敗結果做下一步決策

若你的瓶頸是快取表示大小，前兩篇的位元組賬仍有價值；若瓶頸是響應時延，不能僅憑“4-bit”和“分塊”就決定上線。下一輪應先測實際模型分布與完整生成路徑，再決定是否值得實現融合內核。

小練習：故意刪去 `a*u_old` 的重標定，再用有較大分數差異的兩塊輸入比較輸出。預期數值檢查失敗，即使計時變快也不能算優化。若正確實現卻明顯變慢，先確認計時範圍和執行緒配置相同，保留所有觀測，不只截取最快的一次。

## 最小重現與排錯

從干凈檢出目錄運行以下PowerShell命令。輸出目錄必須尚不存在。同組的三篇文章共用一份凍結協議，只需運行一次，再按各篇的證據分組查看。

```powershell
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 0d4009cf840052c3111bbfc40dce900326daa3ae
python -m venv .venv
$py = '.\.venv\Scripts\python.exe'
& $py -m pip install -r experiments/12-packed-kv/requirements.txt
& $py -m unittest discover -s experiments/12-packed-kv -p "test_*.py"
& $py experiments/12-packed-kv/run.py --out experiments/12-packed-kv/target/my-run
& $py experiments/12-packed-kv/audit.py experiments/12-packed-kv/target/my-run
```

本機Windows已驗證：Python 3.12.14 + NumPy 2.2.6；4項單測、144組對照、810條原始計時；獨立審計預期輸出 `PASS`。其他操作系統未復測。若只想核驗歸檔，不重新實驗，可將審計參數換為 `experiments/12-packed-kv/evidence`。原始碼哈希統一LF，證據哈希按原位元組；不要改寫manifest掩蓋差異。

若導入失敗，先檢查安裝與運行是否使用同一個 `$py`。失敗輸出保留，重跑時換新目錄。數值按協議容差復核，耗時是本機觀察，不要求重現相同速度。

程式碼與文章由AI輔助整理，結論以歸檔且可審計的實際運行記錄為限。本輪沒有新增付費模型請求，也不代表作者已親手重現或完成人工審校。
