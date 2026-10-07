---
title: "Java 請求重試：三次超時，不等于一個總期限"
description: "七種真實本地 HTTP 情況，比較狀態碼、Retry-After、嘗試上限和總等待預算。"
slug: "/ai-apps/java-retry-deadline"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:java-retry-deadline", "project:hohoo-ai-lab", "doc:ai-apps/java-transport-cancellation"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant) · [原始證據](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant/evidence/20261007) · [實驗檔案](/labs/java-retry-deadline)

給每次請求設五秒超時，再重試三次，并不能得到“最多五秒”。連接、讀取和等待都會消耗時間。更危險的是，客戶端超時并不能證明服務端沒有執行；把所有異常重試可能重復產生答案、費用或副作用。

本篇實現 RetryBudget，用本地 HTTP 服務驗證決策。它只對呼叫方明確認定可安全重試的 GET 操作開放重試，不把這套規則自動套到模型生成 POST。七個條件都有真實連接，但響應文字是固定 fixture，不是模型輸出。

## 兩道門：能否重試，以及來不來得及

~~~text
收到結果 → 成功：返回
         → 不可安全重試 / 401：停止
         → 429或503：檢查次數 → 計算等待 → 檢查剩余預算
                                              ↓
                                     夠等才發下一次
~~~

次數上限保護呼叫數量，總期限控制用戶等待；兩者都要有。使用 System.nanoTime() 計算經過時間，避免把系統日歷時鐘調節混進預算。每次連接和讀取前重新計算剩余量，已經耗盡就停止。

但這個 Java8 實現是協作式期限，不是硬實時取消器：DNS、操作系統調度、一次阻塞呼叫的階段切換可能超出理想時刻。慢響應案例的40ms預算實際記錄為45ms，不能把它包裝成精確40ms保證。

## Retry-After 不能被隨意壓短

本地服務返回503和 Retry-After: 1，而本次總預算只有500ms。正確結果是停止，并報告 deadline-before-retry；不是只等剩下的幾十毫秒再請求。

~~~java
if (wait >= remaining(deadline)) {
    result.outcome = "deadline-before-retry";
    break;
}
Thread.sleep(wait);
~~~

示例只解析秒數形式；HTTP 日期形式會明確報告 unsupported-retry-after，而非猜測一個值。正式客戶端應按協議補充日期解析、退避抖動、連接池策略與可觀察日志。這里20ms線性等待只是本地可檢驗參數，不是公網服務的推薦退避。

## 實測決策表

| 本地情況 | 嘗試次數 | 結果 |
| --- | --- | --- |
| 立即200 | 1 | ok |
| 先503再200 | 2 | ok |
| 401 | 1 | not-retryable |
| Retry-After超過剩余預算 | 1 | deadline-before-retry |
| 持續503 | 3 | attempt-limit |
| 響應頭延遲200ms，預算40ms | 1 | deadline-or-interrupt |
| 呼叫方未允許安全重試 | 1 | not-retryable |

嘗試數是客戶端開始嘗試的次數，不等于服務端已處理或已計費數量。原始結果保留了耗時，但沒有統計樣本支持延遲百分位。

## 接入聊天前必須補的一層

對模型呼叫，先判斷失敗發生在發出前還是發出後，確認平臺是否有真正的冪等語義。僅自己加一個 request ID 并不能讓遠端去重。重試拿到回答之後仍要走輸出驗收與整輪提交；臨時預覽不能提前寫成最終歷史。

本例關閉自動重定向，限制成功響應體4096位元組；失敗響應不解析為模型消息。IO異常不會被泛化為自動重試。中斷在等待階段向呼叫者傳播，已觀察到線程中斷的讀取預算檢查則停止，不清除中斷標志。

## 小練習與排錯

把總預算改成10ms，但保留首次503後的20ms等待。預期不會開始第二次嘗試。再把 maxAttempts 改成1，預期即使服務器下一次可能成功也不會重試。二者說明預算優先于“多試一次可能成功”的猜想。

若看到超過總預算的耗時，先區分程序決策檢查點與底層阻塞階段；本輪沒有TLS、真實網絡故障或連接池壓力測試。繼續閱讀[崩潰後恢復完整問答](/docs/ai-apps/java-durable-turns)，把請求失敗和歷史持久化分開。

## 從干凈目錄復現

需要 Java 8、Python 3、Gson 2.10.1。請將兩個路徑替換為自己的 JDK 和 jar；既有工程可復用 Maven 快取。

~~~sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 02a2660e22c969e70e3a6f095003614a7dfa448e
python demos/11-bounded-assistant/run.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out outputs/my-run
python demos/11-bounded-assistant/audit.py outputs/my-run
~~~

輸出目錄必須不存在。本機驗證環境為 Windows，Linux/macOS尚未復測。不需要模型密鑰或付費服務。manifest中的程式碼凍結提交早于上方含證據的歸檔提交，源碼哈希對應實際執行檔案。
