---
title: "Java LLM 實踐（四）：兩個請求同時返回，誰有資格寫入歷史？"
description: "用真實Java執行緒重現回復亂序，加入版本票據、完整問答提交與有界回執，明確本地冪等和遠端執行的區別。"
slug: "/ai-apps/java-concurrent-history"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 8
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:concurrent-history", "project:hohoo-ai-lab", "doc:ai-apps/java-retrieval-evidence", "doc:ai-apps/java-tool-boundary"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows/evidence/20261003-reviewed) · [實驗檔案](/labs/concurrent-history)

上一版[事務式歷史](/docs/ai-apps/java-transactional-history)把一次問答看成一個整體：響應驗證成功才提交，失敗時不留下半輪消息。但它的 `ask` 方法帶著 `synchronized` 等待整個請求。同一個會話因此按順序工作，代價是慢請求會擋住後來的操作。

如果為了響應速度，把網絡調用移到鎖外，會出現一個新的問題：**回答生成時使用的歷史，提交時可能已經過時。** 本篇實現這個邊界，程式碼不調用在線模型；響應由受控本地執行緒提供，驗證的是會話並發行為。

## 1. 先固定一個一定會亂序的例子

不使用 `sleep` 猜執行緒速度。`CountDownLatch` 規定快請求必須先提交，慢請求之後才嘗試寫入。兩個請求都從版本0開始：

| 時刻 | 慢請求A | 快請求B | 已提交版本 |
|---|---|---|---|
| 開始 | 拿到版本0與空歷史 | 拿到版本0與空歷史 | 0 |
| B先完成 | 等待閂鎖 | 提交問答，成功 | 1 |
| A後完成 | 拿版本0嘗試提交 | 已完成 | 1 |

本次真實Java 8運行的記錄是 `fast:COMMITTED`、`slow:STALE`。最終歷史只有 `fast / new answer`，沒有把兩個基於空歷史生成的回復拼成一條似乎連續的對話。

這不是“更晚返回的回答不好”。問題是它已經不滿足自己的提交前提。若A的回答與B無關，應用可以展示為分支；若必須繼續同一會話，應讓調用方明確選擇重新生成。

## 2. 網絡在鎖外，提交在鎖內

`VersionedSession.begin` 返回不可變票據，包含版本、請求ID、問題和歷史快照。隨後由外部傳輸層生成回答。只有 `commit` 負責改動共享狀態：

```java
VersionedSession.Ticket ticket = session.begin(requestId, question);
// 在鎖外，用 ticket.history 和 ticket.question 構造模型請求。
String status = session.commit(ticket, validatedReply, finishReason);
```

核心條件是 `ticket.version == currentVersion`。比較版本、追加完整問答、裁剪舊輪次、增加版本號，都位於同一個同步方法里。如果把版本判斷放到鎖外，兩個執行緒仍可能同時通過檢查，然後互相覆蓋。

為什麼不用文章開頭直接展示 `AtomicReference.compareAndSet`？它是可以實現這一類原子提交的工具，但本例狀態還包含歷史、容量與回執，短臨界區更容易審查。重點是原子地檢查並更新整份狀態，不是一定要選無鎖結構。

## 3. 重復提交和請求ID沖突不是一回事

回執記錄請求ID對應的問題與回答。在回執仍保留時：

| 情況 | 返回值 | 是否增加版本 |
|---|---|---|
| 相同ID、相同問題和回答再次提交 | `DUPLICATE` | 否 |
| 相同ID，卻帶來不同問題或回答 | `ID_CONFLICT` | 否 |
| 首次提交，但版本落後 | `STALE` | 否 |
| 空回答或 `finish_reason != stop` | `INVALID` | 否 |
| 校驗與版本均通過 | `COMMITTED` | 是 |

回執檢查在版本檢查之前，因此已成功提交的同一票據可以得到明確的重復結果，而不是籠統的過期錯誤。另一個會話創建的票據會被拒絕，不能拿甲會話的版本號更新乙會話。

這只是**本進程內的提交冪等**。它沒有阻止模型服務收到兩次請求，沒有取消已發生的計費，也不是資料庫事務。回執有容量，淘汰之後便失去相應ID的去重記憶；進程重啟也會丟失。生產系統需要結合持久化、過期策略和請求生命周期設計，不能把這個Demo直接稱為“恰好執行一次”。

## 4. 這次到底驗證了什麼

配套Suite共33項邊界檢查，其中8項針對會話：亂序提交、完整問答、重復提交、ID沖突、不完整輸出、整輪裁剪、外來票據、舊快照隔離。它實際啟動兩個Java執行緒，順序由閂鎖決定，沒有用重復次數包裝成並發性能測試。

保留最近兩輪時，裁剪刪除的是一對 `user / assistant`，不會剩下沒有問題的回答。票據中的舊歷史也不會隨新提交一起變化。對話的“讀快照”和“寫當前狀態”由此分開。

尚未測量的是多用戶吞吐、資料庫鎖沖突和真實模型亂序請求的成本。8項案例能說明明確的狀態約束，不能證明所有並發交錯都正確。

## 5. 如何運行與接回已有Demo

```sh
cd demos/06-reliable-workflows
python run.py --out evidence/my-run
python audit.py evidence/20261003-reviewed
```

第一條命令編譯Java、執行實驗，並自動保存新的結果、原始碼指紋與稽核；第二條單獨核對已歸檔結果。輸出必須是新目錄，不能覆蓋既有證據。Java環境為1.8.0_171，Gson2.10.1；沒有新增在線請求。

接入已有 `AgnesTransport` 時，在 `begin` 後構造請求並發送，驗證完協議再 `commit`。遇到 `STALE` 時顯示“會話已更新”，不要自動重新請求，否則同一個按鈕操作可能隱式產生額外調用。失敗響應也不要偽裝成助手消息寫回。

## 6. 繼續追問

嘗試調換閂鎖，讓A先成功，觀察最終版本仍只能增長一次。再讓失敗回復先回來，檢查有效回復是否還能提交。最後將票據交給另一個會話，理解“版本相同”為什麼不代表“屬於同一個狀態”。

下一篇把同一種邊界思維放到[工具調用](/docs/ai-apps/java-tool-boundary)：模型可以建議一個動作，但只有應用負責決定是否執行。

同步原語的語義可查閱 [Java 8 AtomicReference 文檔](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/atomic/AtomicReference.html)。本篇實現采用同步臨界區，實驗數值與執行緒軌跡來自配套工程。

## 同方向繼續閱讀

- [Java LLM 實踐（五）：工具超時了，為什麼任務還在執行？](/docs/ai-apps/java-tool-boundary)
- [Java LLM 實踐（六）：先驗收檢索證據，再談RAG回答](/docs/ai-apps/java-retrieval-evidence)
