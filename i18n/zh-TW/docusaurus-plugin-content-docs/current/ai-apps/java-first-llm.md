---
title: 用 Java 8 呼叫大型語言模型：從第一次請求到多輪對話
description: 透過三個實際執行的 Java 範例，理解模型請求、JSON 解析、讀取逾時與對話歷史。
slug: /ai-apps/java-first-llm
status: published
published_at: '2026-09-12'
updated: '2026-09-12'
reading_minutes: 15
learning_step: first-call
domain: ai-apps
difficulty: beginner
related: ['project:hohoo-ai-lab']
---

:::note 實作說明
本文為簡體中文原文的 AI 翻譯，尚未經人工審閱譯文。程式碼由 AI 協助撰寫，API 呼叫結果由 Hohoo 在本機執行驗證。下列數字是這次實作紀錄，不是效能測試或服務承諾。預計閱讀 15 分鐘，實際操作時間另計。
:::

第一次呼叫模型，我從熟悉的 HTTP 請求開始：先在 API 測試工具送出問候，再用 Java 完成相同操作，最後擴充成可以連續輸入的主控台對話。

本文不討論模型訓練，也不急著引入 Spring AI。我想先看清楚：問題如何送出、回答如何取出，以及下一輪如何接上前文。

## 選一個範例開始

三個階段都收在 [Java LLM 實作集](/projects/hohoo-ai-lab)。連結固定到本文對應的版本，避免程式碼更新後與文章不一致。

| 階段 | 要理解的問題 | 程式碼與執行說明 |
| --- | --- | --- |
| 01 / REQUEST | Java 如何送出模型請求？ | [第一次呼叫](https://github.com/VirtualSelect/hohoo-ai-lab/tree/845fa9f18475b77e761806d14565612680ba6fe1/demos/01-first-llm-call) |
| 02 / PARSE | 如何從 JSON 取出回答？ | [解析與主控台輸入](https://github.com/VirtualSelect/hohoo-ai-lab/tree/845fa9f18475b77e761806d14565612680ba6fe1/demos/02-parse-llm-response) |
| 03 / CHAT | 下一輪如何使用歷史訊息？ | [多輪對話](https://github.com/VirtualSelect/hohoo-ai-lab/tree/845fa9f18475b77e761806d14565612680ba6fe1/demos/03-multi-turn-chat) |

準備 Java 8、IDEA 和自行申請的 Agnes API Key。我的執行環境為 `1.8.0_341`，程式碼也用 `javac 1.8.0_171` 編譯驗證。第一個範例只用 JDK 標準函式庫，後兩個使用 Gson 2.10.1 與獨立的 Maven 設定。

## 01 / 一次呼叫送出了什麼

這次使用的平台範例位址已在本機驗證：

```text
POST https://apihub.agnes-ai.com/v1/chat/completions
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

基礎網址是 `https://apihub.agnes-ai.com/v1`，`/chat/completions` 是操作路徑。程式呼叫的 API 位址與管理帳號的網站不同。`YOUR_API_KEY` 只是預留文字。

```json
{
  "model": "agnes-2.5-flash",
  "messages": [{ "role": "user", "content": "你好！" }]
}
```

`model` 指定模型，`messages` 是本次提供的訊息陣列。使用者訊息的角色是 `user`，模型回覆的角色是 `assistant`；文字放在 `content`。

```java
String apiKey = System.getenv("AGNES_API_KEY");
connection.setRequestMethod("POST");
connection.setDoOutput(true);
connection.setRequestProperty("Authorization", "Bearer " + apiKey);
connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
byte[] requestBytes = requestBody.getBytes(StandardCharsets.UTF_8);
```

這是重點片段，完整的串流關閉與錯誤處理請看 Demo 01。金鑰從環境變數讀取，不要寫進原始碼或 GitHub。IDEA 的執行設定可設定 `AGNES_API_KEY`；已開啟的 IDEA 不會自動取得之後在其他終端機設定的變數。

第一次 Java 呼叫回傳 HTTP 200，輸入 293、輸出 104、總計 397 Token。接下來要讓程式只顯示回答，而不是整份 JSON。

## 02 / 從 JSON 找到回答

`responseBody` 一開始是 Java 字串。Gson 將它解析成物件和陣列，才能依照欄位逐層取值。以下保留首次 Java 回應的相關欄位；回答維持實際回傳的簡體中文，並非另一次測試：

```json
{
  "choices": [{
    "finish_reason": "stop",
    "message": {
      "role": "assistant",
      "content": "\n\n大语言模型是一种基于深度学习和海量文本数据训练的人工智能系统，能够理解、生成和处理复杂的自然语言任务。"
    }
  }],
  "usage": {"prompt_tokens": 293, "completion_tokens": 104, "total_tokens": 397}
}
```

尋找順序是 `choices` → 第一項 → `message` → `content`。陣列索引從 0 開始，因此第一項寫成 `[0]`。

```java
// 簡化片段；完整範例會檢查缺少欄位、型別錯誤及空陣列。
JsonObject root = JsonParser.parseString(responseBody).getAsJsonObject();
JsonArray choices = root.getAsJsonArray("choices");
JsonObject firstChoice = choices.get(0).getAsJsonObject();
JsonObject message = firstChoice.getAsJsonObject("message");
String answer = message.get("content").getAsString();
System.out.println(answer.trim());
```

`\n` 會轉成實際換行，`trim()` 可移除顯示文字前後的空白。服務另回傳 `reasoning_content`，本範例不依賴、顯示或儲存此欄位，也不將它視為可驗證的內部計算紀錄。

用量位於 `usage.total_tokens`，這次 `293 + 104 = 397`。Token 不等於中文字數，輸入統計可能包含問題文字之外的結構；若沒有計費規則，不能直接推算費用。缺少用量時顯示「未提供」，不填入假的 0。

### 改成主控台輸入

```java
String question = scanner.nextLine();
userMessage.addProperty("content", question);
```

`question` 儲存使用者輸入的問題，Gson 處理 JSON 跳脫。我實際輸入 `请解释 Java 中的 "接口"，并给一个简短例子。`，成功回應報告 299 / 246 / 545 Token。雙引號沒有破壞請求格式。

## 遇到 Read timed out

這個問題第一次執行時出現：

```text
请求失败: Read timed out
Process finished with exit code 1
```

Demo 02 原本的讀取等待上限為 30 秒，後來改成 90 秒，連線等待維持 10 秒；手動重試後成功。

連線逾時限制建立連線的等待，讀取逾時限制等待回應資料的時間。90 秒不是整個請求的總時限，詳見 [Java 8 URLConnection 文件](https://docs.oracle.com/javase/8/docs/api/java/net/URLConnection.html#setReadTimeout-int-)。

一次成功重試無法證明原本的原因一定是模型生成慢，也可能是網路或伺服器狀態改變。逾時不表示伺服器一定沒有處理請求，所以程式不自動重試。IDEA 的 `Disconnected from the target VM` 是程序結束後的偵錯連線提示。

## 03 / 多輪對話如何接上前文

我先做對照：只送出「上一條訊息是什麼」，模型說不知道；加入之前的問候與助手回覆後，它正確指出「你好！」。

我的理解是：每次對話都帶上先前的問題及回答。程式中的「記憶」就是歷史訊息清單。第三次請求的順序為：

```text
使用者① → 助手① → 使用者② → 助手② → 使用者③
```

收到助手③後才加入清單，供下一輪使用。

```java
history.add(new ChatMessage("user", question));
try {
    ChatResponse response = request(history);
    history.add(new ChatMessage("assistant", response.content));
} catch (RequestFailedException e) {
    removeLastUserMessage();
}
```

失敗時移除本輪使用者訊息，保留之前成功的對話，不捏造回答，也不自動重試。完整程式另有用量和非正常結束狀態提示。

### 實際執行結果

| 輪次 | 原始輸入 | 回應觀察 | 輸入 / 輸出 / 總 Token |
| --- | --- | --- | --- |
| 1 | 你好 | 回傳問候 | 285 / 60 / 345 |
| 2 | 我正在学习Java | 回應 Java 學習話題 | 318 / 75 / 393 |
| 3 | 我正在学习什么 | 正確回答正在學 Java | 368 / 81 / 449 |

第三個問題沒有提到 Java，但本次請求包含的歷史有。輸入 Token 也隨這組對話增加；這是單次學習紀錄，不是效能比較或固定成本。

歷史只保存在目前 Java 程序的記憶體中。輸入 `exit` 結束後，重新啟動就會清空。這沒有改變模型參數，也不是持久或跨裝置記憶。模型有上下文長度上限，本版尚未實作壓縮或截斷。

## 在自己的環境重現

1. 下載或複製 [程式碼儲存庫](https://github.com/VirtualSelect/hohoo-ai-lab)，閱讀所選範例的 README。
2. Demo 01 可用 `javac` 編譯；Demo 02、03 在 IDEA 加入各自的 `pom.xml`，使用 Java 8。
3. 在執行設定中設定 `AGNES_API_KEY`。進入點依序是 `FirstLlmCall`、`ParseLlmResponse`、`MultiTurnChat`。
4. 單輪版輸入問題後按 Enter；多輪版先說正在學 Java，等回答後再問正在學什麼，最後輸入 `exit`。
5. 區分 HTTP、網路逾時與 JSON 結構錯誤。分享紀錄前移除金鑰，不要停用 TLS 驗證來繞過連線問題。

編譯與離線自我測試使用 Java 8 和快取的 Gson JAR。Maven 外掛解析曾在本機儲存庫設定下等待，不能將直接編譯成功寫成 Maven 建置成功。測試資料只驗證跳脫、欄位解析與歷史回復；上述回答與數字來自作者實際執行。

## 成功後仍需驗證

第一次要求兩句話卻只得到一句，後一次才符合。關於 Java 介面的回答，也曾使用「不提供實作」等絕對說法，卻同時示範 `default` 方法。

HTTP 200 與 `finish_reason: stop` 都不保證事實正確或完全遵循要求。語言細節仍應查閱 [Java 8 預設方法說明](https://docs.oracle.com/javase/tutorial/java/IandI/defaultmethods.html)。

至此，請求、解析、輸入和歷史已串成一條可執行流程。下一步是限制並驗證輸出，確認回答適合後續程式處理，再進入框架整合。

[專案說明](/projects/hohoo-ai-lab) · [AI 應用開發](/docs/ai-apps) · [學習路線](/learning)
