---
title: LLM 實驗（二）：先讓對照成立，再談上下文位置
description: 以 Java 8 實作成組對照與節流，完成 Agnes 3.0 的24次真實請求；公開逐項評分、服務端用量，並解釋全對結果的邊界。
slug: /llm/context-position-paired-protocol
status: published
published_at: "2026-09-29"
updated: "2026-11-12"
reading_minutes: 9
domain: llm
article_kind: case-study
difficulty: intermediate
related:
  [
    "doc:llm/kv-cache",
    "project:hohoo-ai-lab",
    "lab:context-position",
  ]
---

為什麼不能用「26次全對」說明模型不受上下文位置影響？因為原計畫沒有跑完，各條件缺失的請求還不同。2026-09-30重新凍結協定後，完成24次Agnes 3.0真實呼叫：六組對照完整，含答案的18次編號正確，無答案的6次輸出UNKNOWN。**這證明本輪材料沒有區分出位置差異，不證明位置永遠無關。**

本文由AI輔助整理，保留實際呼叫、負結果及其邊界。舊輪限流記錄合併於文末；原始資料不改寫，不與新輪合併。

## 對照如何成立

每個block固定一個虛構專案及一種材料長度，只改變目標行位於開頭、中間、末尾，或完全缺失。三專案 × 兩長度（60/240條干擾行）× 四條件，共24次請求。四份協定可用回應才構成完整block；答錯仍須計分，不能剔除。

含答案的三版本擁有同一份行列表，僅順序不同；目標編號恰好出現一次，無答案版本不含該專案及編號。干擾行也有其他編號，避免答案成為全文唯一編號。問題位於資料之後，位置與距問題的距離仍耦合，不能用本實驗解釋模型內部注意力機制。

## 節流、失敗與評分分開記錄

實際模型為agnes-3.0-flash，temperature=0、max_tokens=1024；一次請求結束後至少等20秒，不重試。429/401/403立即停止，其他請求或回應協定失敗連續兩次停止。未執行、無可用回應、答案錯誤是三種狀態，不能互相填補分母。

六個block長度交替，條件起點輪換，但不是完整平衡順序設計。評分只去首尾空白，再精確比較編號或UNKNOWN。材料與標籤是固定教學資料，不是隨機抽樣的真實使用者問題。

## Agnes 3.0：24次線上對照，全數符合預期代表什麼？

2026-09-30，在重新凍結的 L1v2-agnes3 協定下完成24次真實呼叫。每份回應的 model 均為 agnes-3.0-flash；Java 1.8.0_171，執行程式碼提交為 b352a38。請求計畫與呼叫前儲存的準備版本逐項一致，沒有看結果後修改問題、重試或補樣本。

[本輪程式碼與重現說明](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced) · [獨立稽核彙總](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced/evidence/20260930-agnes3-live/audit.json) · [逐條回應](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced/evidence/20260930-agnes3-live)

### 先看請求是否可用，再看回答是否正確

| 項目 | 本次紀錄 |
| --- | ---: |
| 計畫 / 實際嘗試 / 可評分回應 | 24 / 24 / 24 |
| 完整對照區塊 | 6 / 6 |
| HTTP或回應協定失敗 | 0 |
| 含答案條件：編號正確 | 18 / 18 |
| 缺失答案條件：正確輸出UNKNOWN | 6 / 6 |
| 重試 / 未執行 | 0 / 0 |

評分只去掉首尾空白，未從解釋中擷取編號，也沒有讓另一個模型代評。三種位置各6次，其中60行與240行材料各3次：

| 干擾行數 | 開頭 | 中間 | 末尾 | 無答案 |
| --- | ---: | ---: | ---: | ---: |
| 60 | 3/3編號正確 | 3/3編號正確 | 3/3編號正確 | 3/3正確拒答 |
| 240 | 3/3編號正確 | 3/3編號正確 | 3/3編號正確 | 3/3正確拒答 |

分母是固定請求數，不是獨立隨機抽樣的真實業務問題數。三個項目於不同條件下反覆使用，24次請求不能當作24種獨立任務。

### 從一條回應走到可複核結論

第1條請求為F1、60行干擾、答案在開頭。原始紀錄顯示 HTTP 200、finishReason=stop、正文為 QX-7319。usage 為輸入2323、輸出8、總計2331 tokens。

複核時先根據 case 找到凍結的預期編號，再從 plan.json 檢查送出材料與目標位置，最後比較回應正文。outcome 是本地程式計算的評分，不能只相信這個欄位；獨立 audit.mjs 會重算評分、請求雜湊、完整區塊與用量。5項新增離線測試確認原證據通過，而竄改模型、評分、用量或請求雜湊均被拒絕。

離線稽核不讀取金鑰、不發起模型請求，進入實驗目錄後執行：

```sh
node audit.mjs evidence/20260930-agnes3-live
node --test audit.test.mjs
```

### 用量與節流確實執行了嗎？

24份回應合計輸入 **134,614**、輸出 **144**、總計 **134,758 tokens**。單次回傳的輸入計數為2,320–8,898 tokens。這是本端點的 usage 口徑，不換算成未核實的帳單價格。輸出很短也不代表長材料呼叫沒有輸入成本。

執行時間為UTC 05:06:52.476–05:17:12.120，北京時間13:06:52至13:17:12。根據每條開始時間與處理耗時，最短觀察間隔為 **20.001秒**，符合至少20秒的設定。本輪沒有429，只能說明本輪未觸發限流，不能反推平台保證的配額。

### 全對是觀察，不是「位置無關」的證明

本次未觀察到三個位置的回答差異。更準確的解釋是：**這組三題、兩種材料長度與每格一次的任務，沒有區分出模型在位置上的表現。**

所有條件達到最高分，存在測量天花板。目標行的句式與項目名也較鮮明，材料雖包含大量其他編號，仍可能不足以構成困難檢索。我們沒有測到上下文極限，也沒有隔離內部注意力機制。

不能將本輪與舊Agnes 2.5的26份回應合併，也不能把兩輪差異歸因於模型升級：舊試驗的材料、順序、長度與停止規則不同。

下一步應先固定更接近業務的困難條件，例如相似項目名、新舊版本衝突或自然改寫的問題，再保留無答案對照並增加重複。該擴展尚未執行；本輪預算到24次即結束。

## 舊輪為何不再單獨成篇

2026-09-28的Agnes 2.5計畫48次，實際嘗試29次：26份正常回答符合預期，三次HTTP 429後停止，19次未執行。開頭/中間/末尾/無答案實際嘗試8/8/7/6次，可用回應8/6/6/6次。不平衡分母不能支持位置比較，也不能與24次新輪合併。

[原29次嘗試與未執行計畫](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e072718c3cd66d44978612208d393ff0d3eff9e4/experiments/01-context-position/evidence/20260928-l1)仍可核對；獨有的失敗記錄保留於此，重複協定不再佔一篇。後續128次相似干擾方案實際執行0次，只列於[後續計畫](/learning?track=llm#plans-llm)，不算研究結果。

## 只核對既有結果，不發送請求

在新目錄複製配套工程並切換至下方含證據的固定提交，使用Node.js檢查歸檔；無需模型金鑰。本次驗證不包含自動線上執行。


```powershell
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-position
cd hohoo-ai-lab-position
git checkout e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1
cd experiments/02-context-position-paced
node audit.mjs evidence/20260930-agnes3-live
node --test audit.test.mjs
```
