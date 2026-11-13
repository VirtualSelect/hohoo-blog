---
title: "Java 對話歷史落盤：程序崩潰後，半輪記錄怎么辦？"
description: "校驗追加日志、142種截斷前綴和三個真實異常退出子進程，明確本地提交與遠端冪等的邊界。"
slug: "/ai-apps/java-durable-turns"
status: "published"
published_at: "2026-10-07"
updated: 2026-11-13
reading_minutes: 9
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:java-durable-turns", "project:hohoo-ai-lab", "doc:ai-apps/java-context-wire-budget"]
---

<span id="published-correction"></span>

> **2026-11-13 修訂程式碼已發布。** [固定版本與執行說明](https://github.com/VirtualSelect/hohoo-ai-lab/tree/fdea0d8cc8c0a986deee47718cddbe1288afabed/demos/14-turn-flow)現可取得。下文「本機分支／尚未發布」保留為2026-11-12複核時的狀態；歷史固定命令仍用於原實驗歸檔，不用於尋找新修訂。使用修訂時，在配套倉庫根目錄執行`git checkout fdea0d8cc8c0a986deee47718cddbe1288afabed`，再按對應目錄README執行，輸出使用新目錄。歷史結果與AI輔助揭露不變。

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant) · [原始證據](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant/evidence/20261007) · [實驗檔案](/labs/java-durable-turns)

內存里的整輪提交只在進程活著時有意義。把歷史每次覆蓋寫成一個JSON檔案，也會引入新問題：寫到一半退出後，整個檔案可能不能解析。本文把已經驗收的問答作為追加記錄，并明確說明哪些損壞能恢復、哪些必須拒絕打開。

范圍是單寫者、本地小檔案。沒有數據庫、多用戶服務或在線模型呼叫；測試刻意讓子進程用 Runtime.halt(23) 退出，再由另一個JVM重開檔案。

## 一輪是一條記錄，不是兩次獨立寫入

~~~text
JSON {id, question, answer}
        ↓ UTF-8
Base64(payload) + 空格 + SHA256(payload) + 換行
        ↓ 寫完全部位元組
FileChannel.force(true)
        ↓
更新內存歷史、向呼叫者確認
~~~

換行是完成記錄的邊界；Base64讓正文內的換行不會混淆邊界，代價是檔案變大。SHA256幫助發現意外損壞，不是鑒權：能修改檔案的人也能重算校驗和。本例不能防御惡意本地篡改。

寫入先于內存更新，force先于成功返回。在系統允許的范圍內，這減少“告訴呼叫者成功但內容仍僅在程序緩沖區”的窗口。[Java8 FileChannel文檔](https://docs.oracle.com/javase/8/docs/api/java/nio/channels/FileChannel.html)也說明該保證與存儲設備類型相關；本輪沒有斷電試驗或網絡檔案系統驗證。

## 恢復規則必須保守

打開時按完整行逐條驗證格式、校驗和與重復ID。如果最後還有沒有換行的尾巴，截回最後一條完整記錄；如果一條已經完整的記錄校驗失敗，則拒絕打開。不能為了“修復成功”跳過中間壞行繼續拼接歷史，否則會掩蓋數據丟失。

本例限制檔案4MiB，并持有排他FileLock；第二寫者被拒絕。同步程序只在一個擁有者線程使用它，不聲稱提供數據庫隔離級別。

| 故障位置 | 重啟後完整輪數 | 解釋 |
| --- | --- | --- |
| 第二輪寫入之前退出 | 1 | 沒有新提交 |
| 第二條記錄寫入一半後退出 | 1 | 清除未完成尾部 |
| 第二輪提交并force後退出 | 2 | 完整記錄被恢復 |

這三個案例真的啟動并異常結束了子JVM，不是把“失敗”字串寫進結果。除此之外，第二條142位元組記錄的每個未完成前綴都檢查過；完整記錄的損壞另行測試為拒絕打開。

## 去重能解決什麼

同一ID、同一問題再次提交會返回原答案；相同ID用于另一問題則拒絕。呼叫遠端前可先 find(id)，避免把已有本地結果重復生成。

但有一個無法靠此日志消除的窗口：

~~~text
遠端已生成答案 → 本地尚未落盤 → 進程退出
~~~

重啟後沒有記錄，不代表遠端沒執行。本例既沒有事務性遠端API，也沒有提供商冪等憑證，因此不承諾“模型恰好呼叫一次”。日志中的去重，只是本地已提交回合的去重。

## 復現與練習

跑完 Suite 後，再看 before.log、partial.log、committed.log 與 crashes.json。前兩個檔案只有一輪，第三個有兩輪；turns.log則是刻意破壞的負例，不能拿它當健康樣本。

練習：把完整記錄的一個Base64字符改掉但不改校驗和，預期打開失敗。然後只把最後一行截短，預期舊完整輪仍可恢復。不要在真實聊天檔案上練習，使用新目錄。

若遇到“journal already open”，先查第二個進程或尚未關閉的實例；若遇到完整記錄損壞，保留原檔案并排查存儲與寫入鏈，不應自動清空。寫入異常後應結束本次使用并重新打開恢復，不在同一個可能含部分寫入的實例上繼續追加。

三個部件可以按“讀取已提交歷史 → 選擇請求上下文 → 執行有預算的操作 → 驗收回答 → 提交完整輪”組合。2026-10-07這一版只交付這些可驗證部件，完整在線助手仍需請求語義、模型邊界和真實端到端驗證。

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

## 一輪對話的整合參考

前面的日誌解決「已提交的問答如何恢復」，卻沒有決定HTTP回應後是否應該提交。先保存使用者問題、再等回應，會留下半輪紀錄；收到文字便落盤，也可能忽略使用者已經取消。

本地補充實作`demos/14-turn-flow`把這條路徑放入一個協調器，復用前述固定版本的`ContextBudget`與`TurnJournal`，沒有修改舊實驗。**本節為AI輔助實作與執行的離線參考，尚未由作者人工復現；整合程式碼仍在本地分支，沒有已發布的固定提交。** 它不在上方2026-10-07的檢出版本中。

~~~text
完整歷史 → 投影本次請求 → 單次傳送 → 驗收完整回應 → 提交整輪
已有ID   → 復用已提交答案
失敗、觀察到取消或期限耗盡 → 保留舊歷史，丟棄候選
~~~

### 提交檢查之前，哪些事已經發生？

`TurnFlow.ask`先核對ID。相同ID與問題在重開日誌後可以返回原答案；同ID卻換了問題，則在傳送前拒絕。只有新的一輪需要選擇請求視窗並呼叫回應適配器。

以下是協調器內的關鍵順序摘錄，不是可獨立編譯的檔案；參數檢查、擁有者執行緒限制與重開要求屬於完整本地實作。

~~~java
ContextBudget.Selection selected = ContextBudget.select(
    system, journal.history(), question, maxRequestBytes);
String answer = source.generateOnce(
    selected.payload, remaining(deadline, cancelled));
remaining(deadline, cancelled);
if (answer == null || answer.trim().isEmpty()
    || answer.getBytes(StandardCharsets.UTF_8).length > maxAnswerBytes) {
    throw new IOException("answer rejected by the plain-text contract");
}
remaining(deadline, cancelled);
try {
    answer = journal.commit(id, question, answer);
} catch (IOException failedCommit) {
    unusable = true; // 寫入可能只完成一部分，重開之前不可繼續追加。
    throw failedCommit;
}
~~~

回應契約只有非空純文字及512個UTF-8位元組，不是事實驗證。171個「中」已有513位元組，按字元數檢查會漏過這組輸入。結構化輸出仍需要獨立的[輸出驗收](/docs/ai-apps/java-structured-output)，不能把「非空」視為業務可用。

取消與期限是檢查點語義。測試在回應到達後、提交檢查前設定取消，候選確實沒有寫入；但取消若與最後檢查後的寫盤競爭，不能撤銷已提交的一輪。一個協調器限制自己的擁有者執行緒，不能建立多個協調器並行共用同一日誌。

### 接收請求數，與新增問答數分開看

回應來自真實回環HTTP服務的固定規則，不是模型。以下摘自16個固定場景，預先寫入的測試問答不計作新增結果。重開一行只計算同一JVM內關閉並重開日誌後的復用階段，首次寫入已於此前完成。

| 本地階段 | 該階段收到請求 | 該階段新增完整輪 | 應理解成什麼 |
| --- | --- | --- | --- |
| 正常連續兩輪 | 2 | 2 | 第二次請求帶上第一輪問答 |
| 請求視窗裁掉最早一輪 | 1 | 1 | 請求只帶最近一輪，磁碟仍保留三輪 |
| 回應後、提交檢查前取消 | 1 | 0 | 不接納候選，不代表遠端未處理 |
| 服務端讀完請求後不回應 | 1 | 0 | 本地沒有結果，仍無法據此判斷遠端狀態 |
| 重開後復用同ID結果 | 新增0次 | 新增0輪 | 復用既有提交；同ID不同問題仍拒絕 |

空白回應、503、期限檢查失敗、畸形UTF-8及超過體積限制的回應，都保留原完整輪。提交IO錯誤使用真實的已關閉通道觸發，不是新的斷電或崩潰實驗。期限場景採受控單調時鐘，不用於報告網路延遲。

`generateOnce`沒有應用層重試迴圈；測試適配器關閉自動重新導向並啟用[固定長度串流寫入](https://docs.oracle.com/javase/8/docs/api/java/net/HttpURLConnection.html#setFixedLengthStreamingMode-int-)。丟失回應的本次執行，接收端只記錄一份POST。原`RetryBudget`適用於明確可安全重試的讀取，不能直接包住生成POST；相關邊界見[冪等重試](/docs/ai-apps/java-idempotent-retry)。

### 執行本地補充程式碼

**先取得本輪整合程式碼。** 目前只在配套倉庫的本地`codex/bounded-turn-flow-20261112`分支，尚未推送；若只有上方固定提交，請執行原Demo 11，不要在該提交尋找Demo 14。正式歸檔前不補造固定版本連結。

~~~sh
python demos/14-turn-flow/run.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out demos/14-turn-flow/out/my-run
python demos/14-turn-flow/audit.py demos/14-turn-flow/out/my-run --verify-sources
~~~

對照`lost.log`與`requests.json`：日誌只留下舊完整輪，服務端卻記錄了請求。再比較`project-not-delete.log`與該場景請求，確認「沒有傳送」不等於「被刪除」。輸出目錄已存在時會停止。

執行未讀取金鑰、呼叫模型或使用新服務。回環 Socket 的可中斷讀取現有[連接取消整合補充](/docs/ai-apps/java-transport-cancellation#把連接取消接到整輪落盤)。真實提供商適配與並行提交協定仍待處理；本地整合通過不等於完整線上助手已交付。
