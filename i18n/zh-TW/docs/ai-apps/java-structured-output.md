---
title: Java LLM 實踐（二）：HTTP 200 之后，怎樣驗收模型的 JSON？
description: 從一次真實的代碼圍欄響應和三次超時出發，用 Java 8 實現嚴格結構校驗、受限格式適配與可追溯的失敗處理。
slug: /ai-apps/java-structured-output
status: published
published_at: '2026-09-28'
updated: '2026-09-28'
reading_minutes: 16
learning_step: structured-output
domain: ai-apps
article_kind: tutorial
difficulty: intermediate
prerequisites: ["doc:ai-apps/java-first-llm"]
related: ["project:hohoo-ai-lab", "doc:ai-apps/java-first-llm"]
---

[開啟輸出驗證台：編輯真實回應，逐層觀察拒絕原因 →](#output-validation)


上一篇讓 Java 接上了多輪對話。這一篇向前走一步：假設博客需要根據文章簡介選擇分類，模型的回答怎樣才能進入程序，而不只是打印給人看？

本次實驗沒有得到“一切順利”的演示。模型第一次返回 HTTP 200，卻沒有遵守“不要代碼圍欄”的要求；后面還遇到了讀取超時。我們把這些真實結果保留下來，完成一個可以拒絕不合格結果、也可以明確適配特定格式的 Java 程序。

:::note 實踐與證據范圍
實驗於北京時間 2026-09-28 使用本機 Java 8 和 Agnes API 執行。線上呼叫共四次；離線驗證、HTTP 故障注入和回應重放分別標註。全部程式碼與去識別化紀錄位於獨立的 [hohoo-ai-lab 倉庫](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0f91065aeac1cb1da22a20ec87a2ab2c14b21938/demos/04-structured-output)。
:::

## 1. 先定義“可用”，再寫提示詞

任務是給文章簡介分類。希望得到這樣的對象：

```json
{
  "category": "ai-apps",
  "tags": ["Java", "JSON"]
}
```

這只是一個**格式示例**，不是模型運行記錄。程序約定如下：

| 字段 | 約束 | 為什么需要 |
| --- | --- | --- |
| category | ai-apps、llm、embodied-ai、needs-review 四選一 | 不能生成網站不存在的分類 |
| tags | 1～3 個非空字符串，不重復 | 列表組件需要可預期的數據 |
| 單個標簽 | 不超過20個 Unicode 碼點，無控制字符及首尾空白 | 攔截異常長度與格式 |
| 對象本身 | 必須且只能有這兩個字段，不允許重復鍵 | 避免字段缺失、額外指令或覆蓋歧義 |

`needs-review` 表示無關或依據不足，需要再看一下。它是程序里的待審核值，不是博客新增的第四條研究方向。沒有它，就可能把“番茄炒蛋”硬分到 LLM。

約束寫在 [contract.schema.json](https://github.com/VirtualSelect/hohoo-ai-lab/blob/0f91065aeac1cb1da22a20ec87a2ab2c14b21938/demos/04-structured-output/contract.schema.json)。這份文件用來說明本地契約，**沒有發送給 Agnes**；Java 的額外檢查包括重復鍵和控制字符，也不等同于實現了完整的 JSON Schema 標準。

## 2. 兩層 JSON，分別負責什么

接口返回值本來就是 JSON，但里面的 `message.content` 仍是一個字符串：

```text
HTTP 响应正文
└─ 外层 JSON：choices、message、finish_reason、usage
   └─ message.content：模型生成的字符串
      └─ 内层 JSON：category、tags
```

因此要依次過四道關：

1. **傳輸**：HTTP 請求有沒有拿到可接受的響應？
2. **協議**：有沒有 assistant 消息，是否正常結束，content 是否存在？
3. **結構**：content 是不是符合本地契約的 JSON？
4. **含義**：給這篇文章分的類別是否合理？

前面通過不會自動保證后面通過。例如，模型把炒飯分成 `llm`，字段完全合法，含義仍然錯誤。

這也是本例的邊界：程序解決前三層的一部分檢查；語義評價需要獨立的標注和判斷，不能拿“JSON 能解析”代替分類準確性。

## 3. 第一次真實請求：200 了，為什么還被拒絕？

請求仍使用上一課的端點和模型：

```text
POST https://apihub.agnes-ai.com/v1/chat/completions
model: agnes-2.5-flash
```

system 消息列出了分類和標簽規則，明確要求“只返回一個 JSON 對象，不能有 Markdown 或解釋”。user 消息是這段公開教學材料：

> 本文介紹使用 Java 調用大模型 HTTP 接口，并用 Gson 解析 JSON。示例中有術語 "接口" 和換行。包括多輪對話。

請求由 Gson 構造，不手拼引號、反斜杠或換行。第一條真實響應的 `content` 是下面這個**字符串表示**；反引號和換行都屬于返回內容：

```json
"\n\n```json\n{\"category\":\"ai-apps\",\"tags\":[\"LLM應用\",\"API集成\",\"多輪對話\"]}\n```"
```

外層報告 HTTP 200、`finish_reason=stop`；usage 為輸入431、輸出79、總計510 Token。嚴格的內層解析器遇到代碼圍欄，拋出 `MalformedJsonException`，結果沒有被接受。

這條記錄說明：**提示詞表達了期望，卻沒有在這一次調用中保證輸出格式。** 它沒有說明模型永遠不遵守格式，也不能據此計算穩定通過率。[查看完整脫敏記錄](https://github.com/VirtualSelect/hohoo-ai-lab/blob/0f91065aeac1cb1da22a20ec87a2ab2c14b21938/demos/04-structured-output/evidence/live-20260928/live-1.json)。

## 4. Java 如何嚴格驗收

實現拆成四個小職責：

| 類 | 負責什么 |
| --- | --- |
| ChatClient | HTTPS、等待時間、響應大小、狀態碼 |
| Classification | API 外層協議和內層分類對象 |
| ContentFormat | 可選且受限的格式適配 |
| StructuredOutput | 組織請求、運行模式、保存證據 |

先檢查外層的角色、結束原因和正文。如果 `finish_reason=length`，即使眼前的 JSON 看上去完整，本例也選擇拒絕，避免把未完整結束的生成當作確定結果。

內層使用 Gson 的 `JsonReader` 逐個檢查 token，而不只是把任意響應反序列化成 DTO。下面摘自核心邏輯：

```java
JsonReader reader = new JsonReader(new StringReader(text));
reader.setLenient(false);

require(reader.peek() == JsonToken.BEGIN_OBJECT, "object_required");
reader.beginObject();

Set<String> seen = new HashSet<String>();
while (reader.hasNext()) {
    String key = reader.nextName();
    require(seen.add(key), "duplicate_field");
    // category 检查字符串及枚举；tags 检查数组、元素类型和数量。
    // 未知字段直接拒绝，完整实现见 Classification.java。
}
```

這里的 `require` 是本例的顯式檢查方法，不是 Java 的 `assert`。失敗就拋異常，運行時不需要另外啟用斷言開關。

為什么檢查實際類型？因為“可以轉換成字符串”和“原本就是字符串”不是一回事。標簽 `12` 不應因為能顯示成“12”就被偷偷接受。

為什么拒絕重復鍵？像下面這種對象會產生解釋歧義：

```json
{"category":"llm","category":"ai-apps","tags":["Java"]}
```

不能讓后面的值悄悄覆蓋前面的值，再假裝輸入沒有問題。完整原始碼也檢查尾隨內容：合法對象之后再接一個對象，同樣拒絕。

## 5. 明確適配格式，而不是修補所有壞回答

真實響應里的 JSON 本身滿足契約，問題是它被一個代碼塊包住。產品可以選擇繼續嚴格拒絕，也可以**明確允許這種特定包裝**。

本例提供一個可選適配器：

```java
String normalized = ContentFormat.unwrapOneJsonFence(raw);
Classification result = Classification.parse(normalized);
```

適配范圍很窄：只移除覆蓋整個內容的一對 `json` 代碼圍欄。前面有解釋、后面有多余內容、出現兩個代碼塊，都不接受。移除圍欄后仍必須通過同一個嚴格校驗器。

它不會猜測類別，不會把 `java` 改成 `ai-apps`，不會從一大段文字里尋找第一對花括號。否則格式適配很容易悄悄變成內容修改。

我們拿已經保存的首次真實響應做了**離線重放**，得到：

```json
{
  "transformation": "unwrap-one-json-fence",
  "accepted": true,
  "classification": {
    "category": "ai-apps",
    "tags": ["LLM应用", "API集成", "多轮对话"]
  }
}
```

這是對同一份舊響應的本地處理結果，**不是新增的一次模型成功調用**。重放文件記錄了原始證據路徑和 SHA256，便于檢查處理的是哪份材料。

## 6. JSON 模式與 Schema 模式不能混為一談

可以把約束分成三個層次：

| 方式 | 意圖 | 本次確認了什么 |
| --- | --- | --- |
| 提示詞要求 JSON | 用自然語言說明輸出格式 | 曾收到帶代碼圍欄的回答 |
| JSON 模式 | 由支持此能力的服務限制合法 JSON | 本次顯式探測超時，支持情況未確認 |
| Schema 約束輸出 | 由支持此能力的服務約束字段結構 | 本次未驗證，不對 Agnes 作能力承諾 |

顯式探測增加了：

```json
{"response_format":{"type":"json_object"}}
```

但這次請求發生了 `SocketTimeoutException`。超時既不能證明參數被支持，也不能證明參數不被支持。因此這個模式是代碼里的**可選能力探測入口**，沒有自動開啟或悄悄回退。

即使服務保證合法 JSON，`{"category":"java"}` 也仍然是合法 JSON，卻違反我們的字段和枚舉契約。本地驗收依然有意義。

## 7. 四次嘗試，全部保留

| 請求 | 實際觀察 | 本地結果 |
| --- | --- | --- |
| Java 簡介，提示詞約束 | HTTP200，回答帶代碼圍欄 | 嚴格校驗拒絕 |
| 做飯簡介，提示詞約束 | 讀取超時 | 無可用回答 |
| MuJoCo 簡介，提示詞約束 | 讀取超時 | 無可用回答 |
| Java 簡介，json_object 探測 | 讀取超時 | 能力未確認 |

沒有刪除不順利的記錄，也沒有為超時請求填上猜測的 Token 用量。證據保留了請求、模型標識、提示詞版本、時間、異常類型與客戶端耗時，不包含密鑰、響應頭和 `reasoning_content`。

客戶端設置了連接等待10秒、讀取等待90秒。讀取等待不是嚴格的整次請求總時限，因此日志里的總耗時可能超過90秒。**客戶端超時只說明它沒有及時得到可用結果；服務端是否處理、是否計費，不能由這個異常單獨確定。** 本例不自動重試。

## 8. 自己運行：先離線，再在線

進入 Java 倉庫的 `demos/04-structured-output`，使用 Java 8 和 Maven：

```powershell
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git
cd hohoo-ai-lab
git checkout 0f91065aeac1cb1da22a20ec87a2ab2c14b21938
cd demos/04-structured-output
mvn -q compile exec:java '-Dexec.args=--self-test'
mvn -q compile exec:java '-Dexec.args=--replay evidence/live-20260928/live-1.json'
```

第一條運行35項離線檢查，第二條重放真實響應。無需密鑰，不產生模型調用。

在線模式需要在 IDEA 的運行配置或當前進程環境中設置 `AGNES_API_KEY`。不要把它寫進代碼或截圖。下面命令固定執行三個教學請求，輸出目錄必須為空：

```powershell
mvn -q compile exec:java '-Dexec.args=--live evidence/my-run'
```

顯式 JSON 模式探測只執行一次：

```powershell
mvn -q compile exec:java '-Dexec.args=--live-json evidence/my-json-probe'
```

[代碼、環境說明與所有證據](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0f91065aeac1cb1da22a20ec87a2ab2c14b21938/demos/04-structured-output)。本次 Java 版本為1.8.0_171、Gson為2.10.1；文章“第二篇”對應工程的第04個 Demo，因為首篇已經使用了01～03三個 Demo。

35項檢查中，HTTP 500、重定向、非法響應和讀取超時來自 localhost 測試服務；它們驗證客戶端的處理行為，不是 Agnes 的錯誤樣本。另有一個刻意設計的測試讓“llm + 炒飯”通過結構校驗，用來提醒我們不要混淆結構與含義。

## 9. 學完這一篇，應當能解釋什么

先自己回答，再展開核對：

<details><summary>為什么 HTTP 200 不能代表分類成功？</summary>

它只通過傳輸層的一部分檢查。仍需檢查響應協議、模型正文格式、字段約束和分類含義。本文首次響應就是200但格式不合格。

</details>

<details><summary>移除圍欄后，是不是可以直接信任結果？</summary>

不可以。移除圍欄只改變包裝，不能代替字段校驗，更不能證明分類語義正確。測試中的非法枚舉在適配后仍被拒絕。

</details>

<details><summary>這篇是否已經實現機器人任務控制？</summary>

沒有。當前輸出只是文章分類，未接入博客發布或機器人執行。下一步做 Tool Calling 時，需要重新定義工具參數、權限和執行結果，不能把任意合法 JSON 當作可執行指令。

</details>

下一步最值得繼續練的，是用同樣的“先定義契約，再驗收輸出”方式，為一個只讀工具編寫參數檢查與失敗處理。先把輸入邊界做好，再讓模型產生外部效果。

## 參考與復現依據

- [Gson 2.10.1 JsonReader 原始碼](https://github.com/google/gson/blob/gson-parent-2.10.1/gson/src/main/java/com/google/gson/stream/JsonReader.java)：用于核對所用版本的流式 JSON 讀取行為。
- [JSON Schema：對象約束](https://json-schema.org/understanding-json-schema/reference/object)：required、properties 與 additionalProperties 的含義。
- [Agnes 平臺](https://platform.agnes-ai.com/)及本倉庫實際響應：本文僅報告已執行請求，不推斷未驗證的提供商能力。
