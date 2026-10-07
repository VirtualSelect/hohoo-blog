---
title: "Java 對話歷史落盤：程序崩潰後，半輪記錄怎么辦？"
description: "校驗追加日志、142種截斷前綴和三個真實異常退出子進程，明確本地提交與遠端冪等的邊界。"
slug: "/ai-apps/java-durable-turns"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:java-durable-turns", "project:hohoo-ai-lab", "doc:ai-apps/java-context-wire-budget"]
---

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

三個部件可以按“讀取已提交歷史 → 選擇請求上下文 → 執行有預算的操作 → 驗收回答 → 提交完整輪”組合。但本輪只交付這些可驗證部件，完整在線助手仍需請求語義、模型邊界和真實端到端驗證。

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
