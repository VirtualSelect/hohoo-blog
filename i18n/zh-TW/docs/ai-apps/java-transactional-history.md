---
title: "Java LLM 實作（三）：逾時之後，別讓對話歷史悄悄變了"
description: "以候選副本、整輪提交與UTF-8請求預算重寫多輪會話邊界：41項離線檢查，失敗不污染歷史，裁剪失敗仍保留原狀態。"
slug: /ai-apps/java-transactional-history
status: published
published_at: "2026-09-30"
updated: "2026-09-30"
reading_minutes: 10
domain: ai-apps
article_kind: case-study
difficulty: intermediate
related: ["doc:ai-apps/java-first-llm", "doc:ai-apps/java-structured-output", "doc:ai-apps/typescript-output-boundary", "lab:transactional-history", "project:hohoo-ai-lab"]
---

[第一篇Java呼叫](/docs/ai-apps/java-first-llm)揭示多輪對話：每次重新傳送訊息歷史。持續使用時，問題變成**哪一輪應進入歷史，失敗後保留什麼？**

逾時的問題若殘留，模型看到的順序就與使用者收到的結果不同；若為騰空間先刪除舊歷史，失敗還可能抹掉成功對話。

第五個Demo分離候選請求與已提交歷史。**41項離線檢查通過，13次測試替身呼叫，真實網路請求為0。**這是程式狀態實作，不是新的模型記憶能力評測。

[完整Demo](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/demos/05-transactional-chat) · [狀態實作](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/demos/05-transactional-chat/src/main/java/com/hohoo/ailab/history/Session.java) · [檢查紀錄](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/demos/05-transactional-chat/evidence/20260930-contract.json)

## 1. 一輪對話的提交邊界

```text
舊歷史 → 複製候選 → 加目前問題 → 裁剪候選 → 請求 → 驗收 → 提交完整問答
```

請求期間已提交歷史不變。只有收到符合完整性條件的回覆，才將candidate取代committed。失敗就丟棄候選。

此處「交易」只指單一程序的記憶體狀態，不是資料庫交易，也不代表供應商的工作能被回滾。

## 2. 為何不直接add再remove？

入門Demo已會在失敗後撤回最後一條user。加入裁剪與更多拒絕路徑後，回滾分支較難維護。候選副本把提交集中到一處：

```java
List<Message> candidate = new ArrayList<Message>(committed);
candidate.add(new Message("user", question));
Reply reply = transport.send(request);
if (reply == null || reply.content == null ||
        reply.content.trim().isEmpty()) {
    throw new Failure("EMPTY");
}
if (!"stop".equals(reply.finishReason)) {
    throw new Failure("INCOMPLETE");
}
candidate.add(new Message("assistant", reply.content));
committed = candidate;
```

範例省略請求建構與容量裁剪，完整版本在倉庫。最後賦值是成功路徑唯一替換歷史之處。對外快照是獨立且不可修改的清單，Message欄位也不可變。

## 3. 哪些回覆能提交？

| 結果 | 行為 |
|---|---|
| 非空且finish_reason=stop | 提交完整user/assistant一對 |
| HTTP 429或其他非2xx | 不提交 |
| 讀取逾時或I/O失敗 | 不提交 |
| 回應缺欄位或無法解析 | 不提交 |
| 空回覆 | 不提交 |
| length、缺失或其他結束原因 | 不提交 |
| 空問題或單獨超出預算 | 傳輸前拒絕 |

本例是純文字對話，不支援tool_calls。日後需要工具循環時，應重新定義完成邊界。stop也不證明回答事實正確。

## 4. 以完整問答對淘汰

控制台最多保存4個已提交問答對。下一次可傳4對加目前問題；新回覆驗收後裁掉最舊一對。

```text
錯誤邊界：assistant1 → user2 → assistant2 → user3
本例邊界：user2 → assistant2 → user3
```

system由請求建構器單獨加入，不參與淘汰。目前問題始終完整保留，單獨太大就拒絕，不暗中截斷後傳送。

## 5. 位元組預算不是Token預算

本例另限制序列化請求為16000 UTF-8位元組，包括model、system、角色與跳脫：

```java
while (request.getBytes(StandardCharsets.UTF_8).length > maxRequestBytes
        && candidate.size() > 1) {
    candidate.subList(0, 2).clear();
    request = serialize(candidate);
}
```

這是可確定驗證的傳輸量，不是模型上下文窗口或計費估計。新回覆很長時，下一輪可能淘汰整對。本例不摘要，避免把生成文字悄悄當成原始記憶。

## 6. 裁剪後又逾時怎麼辦？

測試先保存較長的成功回覆，下一問題使候選必須裁剪，再由測試傳輸層丟出TIMEOUT。預期是整個候選作廢，原成功問答仍完整保留。

下一次若成功，提交實際傳送的候選加回覆；已裁掉的內容不會再突然出現。失敗不改狀態，成功則反映實際使用的上下文。

## 7. 離線驗證的實際範圍

Maven使用Java 1.8.0_171與Gson 2.10.1。41項斷言涵蓋順序、失敗後狀態、傳輸前拒絕、模型型號、完整問答裁剪、快照不可變、UTF-8預算與畸形回應。

13次呼叫全由程序內替身處理。TIMEOUT、HTTP_429、PARSE是明確注入的事件，不是真實供應商故障。它們證明狀態反應，不證明網路行為、模型記憶或所有線上相容性。

報告保留檢查名稱、合成請求JSON、Java版本與原始碼SHA-256。

## 8. 線上入口與逾時含義

可選的--live使用agnes-3.0-flash，從AGNES_API_KEY環境變數取得密鑰；本輪未執行。

連線逾時10s、讀取等待90s、回應本文上限256KiB；不列印錯誤本文、不自動重試。讀取逾時無法證明服務端未處理或未計費。

[Java 8 URLConnection文件](https://docs.oracle.com/javase/8/docs/api/java/net/URLConnection.html#setReadTimeout-int-)限制的是讀取等待，不是整體請求的絕對期限。總deadline需要另外設計取消與結果核對。

## 9. 執行方式

在demos/05-transactional-chat目錄：

```bash
mvn -q compile
mvn -q exec:java "-Dexec.args=--self-test evidence/my-run.json"
```

報告使用CREATE_NEW，不能覆蓋既有證據。自行設定環境變數後才使用線上入口：

```bash
mvn -q exec:java "-Dexec.args=--live"
```

輸入exit結束。重新啟動就清空記憶，沒有帳號、磁碟保存或雲端同步。

## 10. 距離正式服務還缺什麼？

Session以synchronized序列化同一會話，網路等待期間持鎖。適合簡單控制台推理，不是高並行服務的最終架構。

尚無跨程序一致性、冪等、取消後對帳、持久化或串流交易。下一步分別驗證授權後的真實請求與錯誤回應，以及帶版本號的並行提交方案；不能以離線通過宣告線上完成。

結合 [TypeScript輸出邊界](/docs/ai-apps/typescript-output-boundary)，兩條界線更清楚：外部輸出先驗收，完整合格的一輪才進入歷史。
