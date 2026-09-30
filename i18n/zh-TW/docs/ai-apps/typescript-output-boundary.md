---
title: "TypeScript 能保證模型輸出正確嗎？32組輸入與 Java 驗證器的邊界對照"
description: "從型別斷言、unknown到原始JSON：重現22個誤接收、4個物件驗證盲區，以及Java/TypeScript契約一致性的實際邊界。"
slug: /ai-apps/typescript-output-boundary
status: published
published_at: "2026-09-30"
updated: "2026-09-30"
reading_minutes: 11
domain: ai-apps
article_kind: case-study
difficulty: intermediate
related: ["doc:ai-apps/java-structured-output", "doc:ai-apps/java-transactional-history", "lab:typescript-output-boundary", "project:hohoo-ai-lab"]
---

在 [Java結構化輸出實作](/docs/ai-apps/java-structured-output)中，HTTP 200之後仍要檢查結果是否能進入業務流程。換成TypeScript，這個邊界不會自動消失。

```typescript
const result = JSON.parse(raw) as Classification;
```

這行程式讓編輯器顯示型別，卻沒有證明模型真的回傳那些欄位。本輪以同一批32組輸入比較Java與TypeScript的型別斷言、物件驗證和原始JSON驗證，沒有新增模型呼叫。

[TypeScript工程](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/experiments/03-typescript-boundary) · [輸入與結果](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/experiments/03-typescript-boundary/evidence/20260930-boundary) · [既有Java驗證器](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/demos/04-structured-output/src/main/java/com/hohoo/ailab/structured/Classification.java)

## 1. TypeScript適合放在哪裡？

Java繼續承擔既有LLM實作，TypeScript補充瀏覽器或Node.js側的資料適配與互動，兩者共用業務契約。

本輪只有獨立實驗目錄，不重寫Java，也不遷移整個部落格。TypeScript僅為開發依賴，驗證使用原生語言能力。實際版本為Node.js 26.8.2、TypeScript 7.0.2、Java 1.8.0_171、Gson 2.10.1。Maven使用JAVA_HOME，可能與另一個終端不同。

## 2. 型別斷言做了什麼？

[TypeScript官方文件](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)說明斷言不執行執行期驗證。

```json
{"category":"llm","tags":[42]}
```

這是合法JSON，卻包含數字標籤。斷言不會把42變成字串，後續呼叫字串方法仍可能失敗。較好的入口是unknown：先保留未知，通過驗證後才回傳可信型別。

## 3. 明確列出契約

| 邊界 | 規則 |
|---|---|
| 根物件 | 只有category與tags |
| category | ai-apps / llm / embodied-ai / needs-review |
| tags | 1～3個不重複字串 |
| 單一標籤 | 非空、無首尾ASCII空白、無控制字元 |
| 標籤長度 | 最多20個Unicode碼點 |
| 原始長度 | 最多8000個UTF-16代碼單元 |
| 重複根欄位 | 拒絕，包含跳脫後同名欄位 |
| 結果 | 獨立複製並凍結物件與陣列 |

碼點不等於UTF-16長度。本輪20個emoji碼點通過，21個被拒絕；原始長度則與Java字串邊界對齊。尚未另計字素簇或組合字元。

首尾空白沿用Java String.trim的ASCII規則。NBSP案例被兩邊接受，是已記錄的契約選擇，不代表禁止全部Unicode空白。

## 4. 為何只驗證物件仍有缺口？

```json
{"category":"ai-apps","category":"llm","tags":["json"]}
```

JSON.parse之後只留下最後的category值。重複欄位資訊已丟失，物件驗證器無法從解碼結果找回。

```typescript
const decoded: unknown = JSON.parse(raw);
uniqueRootKeys(raw);
return validateClassification(decoded);
```

原始入口先檢查長度與JSON語法，再追蹤字串跳脫及巢狀層級，掃描解碼後的根欄位名稱。這只是扁平契約的根欄位去重，業務物件不允許巢狀結構；不是通用JSON解析器或JSON Schema引擎。

## 5. 32組樣本從哪裡來？

20組沿用Java離線案例，12組補充跳脫同名鍵、重複tags欄位、根陣列、巢狀標籤、字串內符號、Unicode、NBSP與超大輸入。

其中6組預期有效、26組無效，都是刻意構造的邊界，不是32次模型回應。這種分布適合找漏洞，不適合估計真實錯誤比例。

另保留「分類語義錯誤但結構有效」的案例，防止把格式正確當作內容正確。

## 6. 實際結果

| 入口 | 誤接收無效輸入數 | 與契約一致 |
|---|---:|---:|
| JSON.parse後直接斷言 | 22 | 10 / 32 |
| 只驗證解碼物件 | 4 | 28 / 32 |
| 原始JSON + 物件驗證 | 0 | 32 / 32 |
| 既有Java驗證器 | 0 | 32 / 32 |

物件入口漏掉普通重複category、跳脫同名category、重複tags，以及超出原始長度的合法物件。最後一項不是型別問題，而是入口已失去原始文字長度。

兩語言原始入口32/32一致，只能支持這批固定案例的契約一致性，不保證所有JSON都一致，也不是模型錯誤率。

## 7. 歷史真實回應的離線重放

2026-09-28儲存的真實回應帶有單一JSON圍欄。嚴格入口仍拒絕；明確移除包圍完整內容的單一json圍欄後，再走同樣驗證，結果通過。

這是離線重放，沒有再次呼叫模型。歷史agnes-2.5-flash型號保持不變，新呼叫使用agnes-3.0-flash。

適配器不猜分類、不補欄位、不轉型、不從解釋文字挑出JSON，也不默默處理多個圍欄。保留原文，將寬容設為明確選項。

## 8. 執行.ts不代表型別檢查

Node可以執行本例可擦除型別語法，但仍須單獨型別檢查，見 [Node官方文件](https://nodejs.org/api/typescript.html)。

```bash
npm run typecheck
npm test
npm run experiment -- evidence/my-run
node audit.mjs evidence/my-run
```

編譯期以@ts-expect-error檢查unknown不能直接流入Classification；37項執行期測試涵蓋輸入邊界、凍結結果、圍欄適配與語義限制。兩者不能互相替代。

## 9. 重現Java與TypeScript對照

```bash
mvn -q -f demos/04-structured-output/pom.xml compile
cd experiments/03-typescript-boundary
npm ci
npm run typecheck
npm test
npm run experiment -- evidence/my-run
```

Java探針使用JAVA_HOME與Maven倉庫的Gson 2.10.1；自訂倉庫可設定程序環境變數GSON_JAR。無須API Key。

產物保存輸入、四路判定、版本、提交與原始碼/歷史回應雜湊。稽核僅允許Git檢出造成的LF/CRLF換行差異，不忽略其他內容變動。

## 10. 可帶進實際專案的規則

模型輸出、HTTP請求本文與瀏覽器快取都先視為unknown。物件驗證處理形狀，原始入口處理解碼會丟失的資訊；語義、來源與操作授權需要另外驗證。

單一扁平契約可由原生程式低成本維護。日後若出現多種巢狀輸出、共享Schema與錯誤定位需求，再評估成熟Schema函式庫。先建立邊界，比先統一語言更重要。

繼續看 [交易式對話歷史](/docs/ai-apps/java-transactional-history)：結果通過驗證後，何時才應進入長期會話狀態？
