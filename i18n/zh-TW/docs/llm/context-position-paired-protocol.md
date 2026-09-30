---
title: LLM 實驗（二）：先讓對照成立，再談上下文位置
description: 以 Java 8 實作成組對照與節流，完成 Agnes 3.0 的24次真實請求；公開逐項評分、服務端用量，並解釋全對結果的邊界。
slug: /llm/context-position-paired-protocol
status: published
published_at: "2026-09-29"
updated: "2026-09-30"
reading_minutes: 16
domain: llm
article_kind: case-study
difficulty: intermediate
related:
  [
    "doc:llm/context-position-experiment",
    "doc:llm/kv-cache",
    "project:hohoo-ai-lab",
    "lab:context-position",
  ]
---

[上一輪上下文位置試驗](/docs/llm/context-position-experiment)計畫發出48次請求，實際發出29次，最後三次都是HTTP 429。26份正常回應都符合預期，但各位置的樣本量不一樣。

如果只是「等一下再跑一遍」，仍可能得到難以解釋的彙總。這篇先問：**怎樣把實驗寫成會守預算、會停止，也知道哪些結果能比較的程式？**

本篇最初於2026-09-29交付通過80項離線檢查的Java工程與24項凍結計畫。**2026-09-30新增 Agnes 3.0 實測：24次請求完成，6組對照完整。第1–8節保留最初的協定說明，第9節提供新型號的獨立結果，舊材料不覆寫。**

[工程與重現說明](https://github.com/VirtualSelect/hohoo-ai-lab/tree/dae0b8c50cd786b1bced8686f265f7560430d4f1/experiments/02-context-position-paced) · [完整24項請求](https://github.com/VirtualSelect/hohoo-ai-lab/tree/dae0b8c50cd786b1bced8686f265f7560430d4f1/experiments/02-context-position-paced/evidence/20260929-l1v2-offline/plan.json) · [驗證紀錄](https://github.com/VirtualSelect/hohoo-ai-lab/tree/dae0b8c50cd786b1bced8686f265f7560430d4f1/experiments/02-context-position-paced/evidence/20260929-l1v2-offline/manifest.json)

## 1. 限流為什麼影響結論可信度？

比較開頭與中間，應讓**同一問題、同一資料、同一評分**只改變答案位置。若開頭正常回傳的恰好都是簡單題，中間只回傳難題，直接比較正確率便混入了題目難度。

上一輪打亂全部請求後依序發送。提前中斷後，紀錄雖真實，卻不保證同一問題在所有條件下都有回應。

隨機化能分散時間因素，但不能取代缺失資料處理。新版將一個項目、一個長度的四個條件排成連續的小塊，稱為block。

```text
同一項目 + 同一長度
    beginning → middle → end → absent
    四份回應都有效，才形成完整對照塊
```

有效指「請求與回應協定可評估」，**不是答案正確**。答錯、拒答、格式錯誤必須保留，不可為美化結果而排除。

## 2. 新協定凍結哪些設定？

下表記錄2026-09-29首發的準備版本。2026-09-30的真實執行使用重新凍結的 L1v2-agnes3 / version 3，模型改為 agnes-3.0-flash；其他對照設計不變，詳見第9節。

| 項目     | 設定                                                |
| -------- | --------------------------------------------------- |
| 虛構事實 | 3個項目，各有明確交接編號                           |
| 干擾材料 | 60 / 240行，使用4種固定歸檔句式                     |
| 條件     | beginning / middle / end / absent                   |
| 預算     | 3 × 2 × 4 = 24次，不重試                            |
| 模型     | agnes-2.5-flash                                     |
| 參數     | temperature=0，max_tokens=1024                      |
| 間隔     | 前一次請求完成後至少等待20秒                        |
| 停止     | 429/401/403立即停止；其他請求或協定失敗連續兩次停止 |
| 評分     | 只去除首尾空白，精確比較編號或UNKNOWN               |

兩版改變了材料、樣本、順序、輸出預算和節流策略，**不能直接合併成同一個較大實驗**。使用新目錄、協定版本與提交，舊回應原樣保留。

24次是上限，不是必須用完的目標。遇到停止條件就終止，未發送仍算未執行。

## 3. 材料變長，先防止答案洩漏

三種含答案條件使用同一組N+1行資料，只移動目標行：

| 條件      | 目標行（從0開始） |   N=60 |  N=240 |
| --------- | ----------------: | -----: | -----: |
| beginning |                 0 |      0 |      0 |
| middle    |               N/2 |     30 |    120 |
| end       |                 N |     60 |    240 |
| absent    |        沒有目標行 | 無答案 | 無答案 |

四種干擾句式均含其他項目名與類似NX-4000的編號。目標不該是全文唯一編號，否則不必匹配項目名也可能答對。

檢查會比較排序後的**完整行列表**，不是集合；集合可能掩蓋重複行數量的錯誤。另確認目標編號只出現一次、行位置正確，absent材料沒有目標項目名及編號。

問題一直放在資料後方，因此移動目標也改變它距離問題的遠近，不能獨立分離注意力、距離或其他內部機制。

四倍干擾行數不等於四倍token。序列化請求為3,689–13,912個UTF-16字元，包含JSON與提示，不是token量測。真實回應中的usage才可能提供服務端計數，口徑仍由服務決定。

## 4. 小塊排列的收益與偏差

| block | 項目 | 干擾行數 | 條件順序                          |
| ----- | ---- | -------: | --------------------------------- |
| 1     | F1   |       60 | beginning / middle / end / absent |
| 2     | F2   |      240 | middle / end / absent / beginning |
| 3     | F3   |       60 | end / absent / beginning / middle |
| 4     | F1   |      240 | absent / beginning / middle / end |
| 5     | F2   |       60 | beginning / middle / end / absent |
| 6     | F3   |      240 | middle / end / absent / beginning |

長度交替、條件起點輪換，減少某條件永遠最後執行。但六塊不足以完全平衡四種順序，不能宣稱消除時間與順序混雜。

若第7次請求失敗並觸發停止，block 1可能完整，block 2不完整。全部紀錄保留，但不拿殘缺的幾條去補其他組的分母。

只比較完整block也可能產生選擇偏差。因此必須同時列出**全部嘗試、失敗、未執行、完整塊與不完整塊**，不可只展示納入比較的資料。

## 5. 20秒節流不是服務承諾

```java
for (JsonElement el : jobs) {
    if (index > 0) sleeper.pause(number("minPauseMs"));
    // 記錄請求識別，再呼叫 transport.send(...)
    // 保存回應或失敗，檢查停止條件
}
```

等待發生在上一次請求處理、保存完成之後。若生成用了8秒，兩次開始至少相隔約28秒，不是每20秒強行發一次。

HTTP 429代表請求過多，可附Retry-After，但無法單獨證明是哪種請求數、token或並行限制。見[RFC 6585第4節](https://www.rfc-editor.org/rfc/rfc6585#section-4)。

20秒是本地實驗設定，**不是已核實的Agnes配額，也不保證不再429**。本輪收到429立即停止；合法秒數或日期形式的Retry-After只記錄，不自動等待後重發。

401/403也立即停止，避免用完整預算重複確認相同權限錯誤。連線逾時10秒、讀取逾時90秒；後者不是整個請求的總期限，逾時也不能證明伺服器未執行。

## 6. 分開測程式與模型

```java
interface Transport {
    JsonObject send(JsonObject request, String key) throws IOException;
}
interface Sleeper {
    void pause(long millis) throws InterruptedException;
}
```

正式執行使用HTTP與Thread.sleep；測試替換為假傳輸及假時鐘，執行相同的execute迴圈，不存取模型、不實際等待。

| 注入條件              | 檢查行為                           |
| --------------------- | ---------------------------------- |
| 首次429               | 只嘗試1次，無後續等待或請求        |
| 首次401/403           | 只嘗試1次，保存狀態碼並停止        |
| 連續500               | 嘗試2次，中間等1次，然後停止       |
| 24份可解析回應        | 嘗試24次、等待23次、不超預算       |
| 全部模擬正文為UNKNOWN | 有答案時計拒答，absent時計正確拒答 |

80項斷言通過只代表這些程式路徑及材料約束符合預期。假傳輸的UNKNOWN不是Agnes實測，不能計算模型效能。暫存測試檔執行後清除；公開準備目錄沒有attempt回應檔。

評分仍嚴格：錯誤合法編號為incorrect，額外說明為format_error，有答案卻UNKNOWN為abstention；HTTP與協定失敗另列。1024輸出token上限也不保證最終正文有1024 token。

## 7. 先匯出、審計，最後才呼叫

進入experiments/02-context-position-paced，使用JDK 8與Maven：

```powershell
mvn -q compile
mvn -q exec:java "-Dexec.args=--self-test"
mvn -q exec:java "-Dexec.args=--dry-run"
mvn -q exec:java "-Dexec.args=--prepare evidence/my-preparation"
node audit.mjs evidence/my-preparation --prepared
```

以上命令都不發送模型請求，輸出目錄必須不存在。

| 檔案          | 可核對內容                        |
| ------------- | --------------------------------- |
| protocol.json | 模型、預算、長度、間隔、停止條件  |
| cases.json    | 虛構事實與期望編號                |
| plan.json     | 每次完整messages與順序            |
| manifest.json | 提交、原始碼hash、JDK版本、檢查數 |

本次準備在Java 1.8.0_171執行，原始碼於ee081ef凍結；獨立Node審計確認24個唯一條件組合與材料約束。

真實執行需要在本機行程環境設定AGNES_API_KEY，選擇**另一個新目錄**：

```powershell
mvn -q exec:java "-Dexec.args=--run evidence/my-live-run"
node audit.mjs evidence/my-live-run
```

只有--run發送請求，最多24次。程式不讀取IDE設定、不輸出金鑰、不保存reasoning_content。不能把準備目錄偽裝為線上紀錄。

## 8. 什麼結果才值得寫入研究結論？

至少要有真實請求時間、hash、回應正文、協定狀態、逐條評分、各組分母、停止原因與usage。usage只涵蓋有回傳計數的請求，不等於帳戶帳單。

即使未來24次全部完成，也只有三組固定虛構事實、單模型、單端點、無重複。240行不是模型上下文上限，不足以證明「模型不會丟失中間資訊」。

[Lost in the Middle](https://arxiv.org/abs/2307.03172)探討特定任務與模型的位置效應。本案例借用對照思路，材料與規模不同，不是論文重現。

本篇完成可審計的實驗入口。下一份結果報告應在凍結協定上執行、逐條核驗，再決定擴充題型、長度或檢索。**先保證比較成立，才能解釋比較發現了什麼。**

## 9. Agnes 3.0：24次線上對照，全數符合預期代表什麼？

2026-09-30，在重新凍結的 L1v2-agnes3 協定下完成24次真實呼叫。每份回應的 model 均為 agnes-3.0-flash；Java 1.8.0_171，執行程式碼提交為 b352a38。請求計畫與呼叫前儲存的準備版本逐項一致，沒有看結果後修改問題、重試或補樣本。

[本輪程式碼與重現說明](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced) · [獨立稽核彙總](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced/evidence/20260930-agnes3-live/audit.json) · [逐條回應](https://github.com/VirtualSelect/hohoo-ai-lab/tree/e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1/experiments/02-context-position-paced/evidence/20260930-agnes3-live)

### 9.1 先看請求是否可用，再看回答是否正確

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

### 9.2 從一條回應走到可複核結論

第1條請求為F1、60行干擾、答案在開頭。原始紀錄顯示 HTTP 200、finishReason=stop、正文為 QX-7319。usage 為輸入2323、輸出8、總計2331 tokens。

複核時先根據 case 找到凍結的預期編號，再從 plan.json 檢查送出材料與目標位置，最後比較回應正文。outcome 是本地程式計算的評分，不能只相信這個欄位；獨立 audit.mjs 會重算評分、請求雜湊、完整區塊與用量。5項新增離線測試確認原證據通過，而竄改模型、評分、用量或請求雜湊均被拒絕。

離線稽核不讀取金鑰、不發起模型請求，進入實驗目錄後執行：

```sh
node audit.mjs evidence/20260930-agnes3-live
node --test audit.test.mjs
```

### 9.3 用量與節流確實執行了嗎？

24份回應合計輸入 **134,614**、輸出 **144**、總計 **134,758 tokens**。單次回傳的輸入計數為2,320–8,898 tokens。這是本端點的 usage 口徑，不換算成未核實的帳單價格。輸出很短也不代表長材料呼叫沒有輸入成本。

執行時間為UTC 05:06:52.476–05:17:12.120，北京時間13:06:52至13:17:12。根據每條開始時間與處理耗時，最短觀察間隔為 **20.001秒**，符合至少20秒的設定。本輪沒有429，只能說明本輪未觸發限流，不能反推平台保證的配額。

### 9.4 全對是觀察，不是「位置無關」的證明

本次未觀察到三個位置的回答差異。更準確的解釋是：**這組三題、兩種材料長度與每格一次的任務，沒有區分出模型在位置上的表現。**

所有條件達到最高分，存在測量天花板。目標行的句式與項目名也較鮮明，材料雖包含大量其他編號，仍可能不足以構成困難檢索。我們沒有測到上下文極限，也沒有隔離內部注意力機制。

不能將本輪與舊Agnes 2.5的26份回應合併，也不能把兩輪差異歸因於模型升級：舊試驗的材料、順序、長度與停止規則不同。

下一步應先固定更接近業務的困難條件，例如相似項目名、新舊版本衝突或自然改寫的問題，再保留無答案對照並增加重複。該擴展尚未執行；本輪預算到24次即結束。
