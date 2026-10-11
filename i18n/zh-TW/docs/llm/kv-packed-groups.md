---
title: "KV分組打包：4-bit到底省了多少？"
description: "實際保存半位元組整數碼，復算分組scale開銷、補齊位元組與注意力輸出誤差。"
slug: "/llm/kv-packed-groups"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
prerequisites: ["doc:llm/kv-quantization-axes"]
related: ["lab:packed-kv", "project:hohoo-ai-lab"]
---

[固定程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv) · [原始證據](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv/evidence) · [實驗檔案](/labs/packed-kv)

上一輪比較了量化軸，保存的仍然是int8。把位寬寫成4，就能把快取再減半嗎？如果每個4-bit數仍裝在一個 `uint8` 中，答案是否定的。**位寬、實際打包方式、scale開銷，必須分別算賬。**

本篇實現真正的雙nibble打包，並比較8/32元素分組與4/8-bit。所有輸入是固定合成陣列，不是模型運行中的KV；結論只用於解釋量化機制。

## 一個位元組里到底裝了什么

4-bit對稱量化使用整數區間 `[-7,7]`，每組的scale為 `max(abs(x))/7`。為了方便位操作，保存前加7，映射到 `[0,14]`，15保留不用。兩個碼合成一個位元組：

```python
packed = codes[0::2] | (codes[1::2] << 4)
low = packed & 15
high = packed >> 4
```

解碼必須保留原始形狀，去掉分組補齊，再乘對應scale。例如碼2和13打包成十六進制 `D2`；恢復後減7得到-5和6。這裡不是補碼int4，也沒有學習得到的codebook，不要混用其他格式的解碼器。

8-bit對照同樣使用對稱範圍 `[-127,127]`，保存為加127後的無符號位元組。兩種格式都保留float32 scale和兩維int32形狀，大小賬包含這些陣列。

## 為什么分組要同時看方向與長度

K的布局為 `N×D`。沿每個通道把相鄰Token切成8或32個元素的組；V則在每個Token內部把特征維切成8或32個元素的組。保持上一輪K/V不同粒度的思路，同時限制每個scale覆蓋範圍。

```text
K：固定通道 → Token 0..7 | 8..15 | ...
V：固定Token → 特征 0..7 | 8..15 | ...
```

更小的組通常能減弱組內幅值差異，但需要更多scale。它不是免費的精度改進。分組不足時補零，解碼再裁剪；測試另用35×13矩陣檢查非整除邊界，而正式對照使用128/512 Token、32維、4個Query。

## 同一輸入上的精度與空間交換

三種子×兩長度×三分布，共18份輸入；每份比較兩組長×兩位寬，得到72個對照。除干凈隨機輸入外，還有把注意力偏向最早或最近16個Token的受控分布，供後續殘差研究復用。

下面只看干凈輸入的六份對照，先對每份計算輸出相對L2誤差，再取平均：

| 組長 | 位寬 | 相對輸出誤差 | N=128的KV陣列payload |
| ---: | ---: | ---: | ---: |
| 8 | 4 | 9.797% | 8,208 B |
| 32 | 4 | 13.450% | 5,136 B |
| 8 | 8 | 0.589% | 12,304 B |
| 32 | 8 | 0.743% | 9,232 B |

![打包KV的陣列大小與合成輸入輸出誤差](/img/research/20261011/packed-groups.zh-TW.svg)

未量化float32的K/V為32,768位元組。組長32的4-bit整數碼只占4,096位元組，但加scale和形狀後是5,136位元組，減少約84.3%，不能宣稱嚴格減少87.5%。組長8用更多空間，換來這組輸入上更低的誤差。

這個結果也提醒我們：從0.743%到13.450%不是“幾乎無損”。任務能否容忍這類局部輸出變化，需要真實模型質量測量；本輪沒有任務準確率、困惑度或生成結果。

## 如何知道檔案里真的存了4-bit

`arrays.npz` 保存原始Q/K/V、參考輸出、打包位元組、scale、形狀和量化輸出。獨立審計逐nibble解碼，再用不同的注意力表達式重算誤差與位元組數，沒有呼叫實現里的 `decode`。

壓縮NPZ大小不是快取大小：歸檔為了審計重複保存多個方案，ZIP壓縮還依賴數值分布。表里的payload只計算實現中的陣列，不含Python字典、allocator、臨時反量化陣列或模型其他層。

### 小練習與常見錯誤

手算 `D2` 的兩個碼，再用 `&15` 和 `>>4` 驗證。改變輸入為全零時，scale用1兜底，解碼應仍然全零，不能出現除零。若非整除尺寸多出一行，檢查裁剪發生在恢復原始軸之前還是之後。若4-bit檔案與8-bit一樣大，檢查是不是僅限制了數值範圍卻沒有打包。

粒度與殘差問題可參照 [KIVI](https://arxiv.org/abs/2402.02750)。本實驗的對稱4/8-bit、合成輸入和NumPy執行並非該論文的非對稱2-bit系統重現。下一篇保留相同打包格式，研究把有限高精度空間留給“最近Token”是否總值得。

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
