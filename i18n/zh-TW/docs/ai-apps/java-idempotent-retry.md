---
title: "Java 冪等重試：沒收到回答，不等于沒有執行"
description: "用七組本地 HTTP 故障對照，解釋冪等鍵、并發認領、請求沖突與進程崩潰窗口。"
slug: "/ai-apps/java-idempotent-retry"
status: "published"
published_at: "2026-10-09"
updated: "2026-10-09"
reading_minutes: 11
domain: "ai-apps"
article_kind: "tutorial"
difficulty: "intermediate"
prerequisites: ["doc:ai-apps/java-retry-deadline", "doc:ai-apps/java-durable-turns"]
related: ["lab:java-idempotent-retry", "project:hohoo-ai-lab", "doc:ai-apps/java-tool-boundary"]
---

[固定代碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/009289d3c9314d64a495303d9b16517080282788/demos/12-idempotent-retry) · [HTTP 記錄與審計](https://github.com/VirtualSelect/hohoo-ai-lab/tree/009289d3c9314d64a495303d9b16517080282788/demos/12-idempotent-retry/evidence) · [實驗檔案](/labs/java-idempotent-retry)

上一篇為重試設置總時限和次數預算，但預算解決的是“還能等多久”，沒有解決“重試會不會再執行一次”。例如助手調用一個有副作用的工具：服務端已經提交結果，回復卻在路上丟了。客戶端此時只知道自己沒收到答案。

本篇用 Java 8 自帶的 HTTP 服務做一個最小反例：每個請求把本地計數器加一。計數器代表一次邏輯副作用，**不是實際扣費、下單或模型請求**。Python 客戶端通過真實本機連接發請求，服務端主動丟棄回復或終止進程。沒有在線 API 調用。

## 先看那條容易誤判的時間線

```text
客戶端 A             服務端                    本地計數器
POST /effect  ─────→ 執行加一 ──────────────→ 0 → 1
              ←─── 回復前連接被關閉
觀察到 EOF
再次 POST     ─────→ 再執行加一 ────────────→ 1 → 2
收到 200，正文為 2
```

這里觀察到的是連接關閉，不是偽造一個 `Read timed out` 字符串。結果見 `unkeyed_lost_reply`：第一次請求記錄連接異常，第二次返回 200，計數器最終為 2。異常本身不能告訴客戶端第一次是否生效。

[HTTP 語義中的冪等性](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)關注重復請求的預期效果，不是“每次都返回相同狀態碼”。POST 不會因為帶了一個頭就自動獲得冪等語義；接收端必須實現并約定它。

## 一個鍵要代表同一次意圖，而不是一次網絡嘗試

為這次“加一”生成 key，在所有重試中復用它。服務端維護如下狀態：

```text
key 不存在 → 原子認領 → 執行 → 保存結果 → 回復
key 存在且請求體相同 → 等待/重放同一個結果
key 存在但請求體不同 → 409，拒絕執行
```

本例用 SHA-256 比較原始請求體字節。因此兩個字段順序不同、語義相同的 JSON，也會被視為不同請求。這是一個明確的協議取舍；如果想按業務語義比較，需要固定規范化規則，并把租戶、操作類型和版本一起納入身份。不能只比較 key，也不能偷偷忽略不同參數。

認領必須原子化。先 `containsKey`、再執行、最后 `put`，中間仍會讓兩個線程同時進入。核心代碼把“查找與創建記錄”放在同一個鎖里，副作用在鎖外執行：

```java
synchronized (records) {
    record = records.get(key);
    if (record == null) {
        // 容量檢查省略；完整實現見倉庫
        record = new Record(hash);
        records.put(key, record);
    } else {
        // 先校驗 hash；不同請求返回 409
        owner = false;
    }
}
// owner 執行一次；其他請求等待 record.result
```

`CompletableFuture` 讓并發重復請求共享同一個完成結果。案例中 12 個客戶端同時發同一個 key，最終計數為 1；12 個回復都為 1，其中只有一個標記為非重放。等待有五秒上限；等待失敗也不會把已有記錄刪掉并立即重執行。

## 修復了連接丟失，卻沒有修復進程丟失

七組實際結果如下。“最終計數”是服務端本地文件的數值，不是客戶端收到回復的次數。

| 條件 | 最終計數 | 觀察 |
| --- | ---: | --- |
| 無 key，首次回復被丟棄 | 2 | 重試重復執行 |
| 同 key，首次回復被丟棄 | 1 | 重試返回緩存結果 |
| 12 個并發同 key 請求 | 1 | 一次執行，11 次重放 |
| 同 key，不同請求體 | 1 | 第二次返回 409 |
| 第一次已回復，重啟服務，再重試 | 2 | 內存記錄消失 |
| 副作用落盤后、記錄完成前崩潰 | 2 | 崩潰窗口仍重復執行 |
| 非法輸入、64 個 key、容量邊界 | 64 | 400 / 413 拒絕輸入，滿容量返回 429，舊 key 仍可重放 |

最后兩個故障揭示了這個實現的邊界。計數文件通過 `force(true)` 寫入；冪等注冊表仍在內存。`crash_after_effect` 在寫盤完成、完成 Future 之前調用 `Runtime.halt(23)`。客戶端看到連接斷開，測試確認退出碼 23，重啟讀取到計數 1，但注冊表已經空了。重試再次加一。

這也解釋了為什么“把 key 保存到另一個文件”不是充分答案：兩個獨立寫入之間仍可能崩潰。若業務狀態和冪等結果能進入同一數據庫事務，可以把它們原子提交；若副作用在外部工具或模型服務，必須進一步依賴下游的冪等協議、可查詢操作狀態或補償策略。**本篇沒有實現這些生產方案，也不宣稱 exactly-once。**

## 和助手歷史、重試預算如何配合

可以把一次助手操作分為三層：請求預算控制等待；冪等身份控制同一意圖的重送；持久歷史控制完整問答如何保存。三者都需要，但一個層面的成功不能替另一個層面背書。

例如持久歷史沒有半輪記錄，并不代表遠端工具沒有執行。總時限到達也不代表遠端已經停止。模型提供方若沒有承諾冪等支持，向它發送這個頭不能自動防止重復計費。應用層應把“不知道是否生效”保留為待查詢狀態，而不是一律變成“失敗，可以隨便重來”。

為了把實驗做小，本例的注冊表沒有 TTL，也不淘汰舊 key。滿 64 個時拒絕新意圖，仍能重放舊結果；這犧牲了可用性，卻避免“剛刪掉 key，遲來的重試又執行”。生產保留時間應根據業務重試窗口設計。本地文件的 truncate/write 也不具備斷電原子性，本輪只測試指定寫入完成后的進程故障。

## 動手復現與排錯

使用 JDK 8 和 Python 3.12；無需 Maven、Gson、數據庫或密鑰。以下命令把新結果寫到獨立目錄，保留已歸檔證據：

```sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 009289d3c9314d64a495303d9b16517080282788
python demos/12-idempotent-retry/run.py --java-home "E:/Java/jdk1.8.0_171" --out demos/12-idempotent-retry/target/my-run
python demos/12-idempotent-retry/audit.py demos/12-idempotent-retry/target/my-run
```

將 `--java-home` 改成本機 **JDK 根目錄**，其中應同時有 `bin/java` 與 `bin/javac`。服務只監聽 `127.0.0.1`，自動選擇空閑端口；`X-Test-*` 頭僅用于本地故障注入，不能作為公開 API 功能上線。Windows/JDK 1.8.0_171 已實測，Linux/macOS 未復測。

預期審計輸出 `PASS: 7 cases...`。若并發計數大于 1，檢查是否把認領拆成了多個操作；若丟回復的第一次沒有記錄異常，檢查故障是否在真正寫回復之前觸發；若找不到 `javac`，說明配置了 JRE 或錯誤路徑。審計同時驗證源碼和證據哈希，不能直接編輯結果文件讓它通過。

一個小練習：為每次重試改用新 key，先預測計數，再運行獨立實驗。它會變成兩個意圖，冪等表不會“智能識別”你想把它們合并。另一個練習是交換“業務生效”和“記錄完成”的順序：提前寫成功記錄也可能產生“未執行卻重放成功”的問題。真正需要設計的是提交邊界，而不只是添加一個請求頭。
