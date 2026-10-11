---
title: "KV殘差窗口：最近Token一定值得高精度嗎？"
description: "用早段與近段注意力對照，解釋同樣的float32窗口為何收益不同。"
slug: "/llm/kv-residual-window"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
prerequisites: ["doc:llm/kv-packed-groups"]
related: ["lab:packed-kv", "project:hohoo-ai-lab"]
---

[固定程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv) · [原始證據](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv/evidence) · [實驗檔案](/labs/packed-kv)

如果4-bit誤差太大，保留最近一段KV為float32，較早部分再量化，是一個直觀折中。但“最近”是時間位置，**不一定是當前Query真正關注的位置**。本篇用同一批輸入構造早期關注和近期關注的對照，把這個隱藏假設拆出來。

這裡仍是合成注意力機制實驗。沒有模型權重、文本問答或真實任務質量結論。

## 固定預算，先問它保護了誰

快取分為兩部分：

```text
[早期Token：分組4-bit] [最近R個Token：float32]
          N-R                    R
```

量化部分沿用上一篇組長32、K逐通道Token組、V逐Token特征組；R分別為0、16、64。18份相同輸入各運行三個R，共54個對照。所有方案仍注意整個上下文，沒有把舊Token刪除；變化的是數值表示。

為了觀察“近期性”假設，early_focus與recent_focus使用同一份基礎隨機陣列，只修改Q/K第一通道，讓最早或最近16個位置更容易獲得較大分數。其他通道保留隨機差異。它不是一份自然語言資料集，也沒有把注意力強行設成one-hot。

## 看誤差之前，先看注意力權重總量落在哪里

每份輸入先使用未量化參考計算最近窗口獲得的注意力權重總和，再觀察量化輸出誤差。下表是六份輸入（3種子×2長度）的均值；誤差為逐輸入相對L2的平均，不能當成回答正確率。

| 分布 | R=0誤差 | R=16誤差 | R=64誤差 | R=16保護的注意力權重總量 |
| --- | ---: | ---: | ---: | ---: |
| 干凈輸入 | 13.450% | 12.863% | 11.477% | 8.28% |
| 關注早期 | 13.386% | 13.366% | 13.365% | **1.23%** |
| 關注近期 | 11.583% | **1.150%** | 1.038% | **77.19%** |

![相同近期窗口在不同注意力分布下的誤差](/img/research/20261011/residual-window.zh-TW.svg)

關注近期時，保留16個高精度Token顯著降低局部輸出誤差；繼續擴到64只有較小變化。關注早期時，相同記憶體投入幾乎沒有改善，因為主要被使用的早期K/V仍然量化著。這不是“窗口越大越好”的論證，而是“空間應保護與當前計算有關的資訊”的反例。

表中的注意力權重總量來自未量化參考，是解釋工具，不是在線可免費獲得的先知指標。不能據此宣布已經實現內容感知的快取分配器。

## 殘差窗口也會吃掉壓縮收益

N=128時，完整float32 K/V占32,768位元組。三種殘差配置的陣列payload分別為：

| 最近float32 Token數 | 實際payload | 相對完整float32的減少 |
| ---: | ---: | ---: |
| 0 | 5,136 B | 84.3% |
| 16 | 8,912 B | 72.8% |
| 64 | 18,960 B | 42.1% |

這裡計入組補齊、scale和形狀。特別是N-R不再整除32時，不能簡單按“4-bit部分長度”線性估算。程式碼保存真實打包陣列，讓審計從 `nbytes` 復算。

最近16個並不是固定比例：在128長度里占12.5%，在512長度里占3.125%。因此跨長度均值只用於展示這次固定協議，不能直接選一個生產R。實際系統還需要考慮多層、多頭、並發會話、分頁和追加時的分組轉換成本。

## 適用邊界：本輪沒有測在線更新

本實驗一次性構造快取，然後計算注意力。沒有逐Token生成、沒有把殘差窗口最舊項不斷量化搬遷，也沒有實現 [KIVI](https://arxiv.org/abs/2402.02750) 的完整殘差機制。靜態表示的誤差與大小可以復算，但不能替代動態快取更新的延遲和臨時記憶體。

下一篇只驗證一個進一步的問題：按塊解碼能否在保持同一量化結果的前提下縮小單次解碼陣列，以及這會給本機CPU耗時帶來什么變化。

### 小練習與排錯

拿early_focus中任意一份輸入，先比較R=0和R=64的輸出誤差，再看 `attention_mass`。如果R=64更貴卻幾乎沒收益，應先檢查假設，而不是把結果檔案改成更漂亮的數字。嘗試增加“最早16個保持高精度”的新策略時，另存協議和輸出，不把新條件混進本篇54組資料。

若R=0仍計入尾部陣列，檢查Python切片：`x[-0:]` 是整個陣列。本實現使用 `cut=N-R; x[cut:]` 避免這個坑。若結果突然與參考完全一致，也要檢查是否誤把量化前K/V傳給注意力函數。

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
