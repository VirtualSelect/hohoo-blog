---
title: "Outbox投遞：本地可靠，不等於遠端只執行一次"
description: "對照有鍵和無鍵接收端，解釋回復丟失、回執缺失與遠端重複副作用。"
slug: "/ai-apps/java-outbox-delivery"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "ai-apps"
article_kind: "tutorial"
difficulty: "intermediate"
prerequisites: ["doc:ai-apps/java-durable-idempotency"]
related: ["lab:durable-dispatch", "project:hohoo-ai-lab"]
---

[固定程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch) · [原始證據](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch/evidence) · [實驗檔案](/labs/durable-dispatch)

把請求意圖寫進持久紀錄後，行程重啟不會忘記“還有什么要做”。但這只解決了任務不丟的問題。服務端執行成功、客戶端來不及寫回執時，恢復程序仍要面對一個問題：**再發一次，究竟是繼續原任務，還是多執行一次？**

本篇將上一節的 `Ledger` 接到真實本機HTTP連接，比較接收端支援與不支援持久冪等的行為。工具只增加教學紀錄的記錄數，沒有外部模型和真實業務副作用。

## Outbox不是執行成功的證明

這裡的Outbox是一份已提交意圖紀錄。它保存穩定操作key和正文；dispatcher掃描未有回執的意圖，發送HTTP，再把接收端返回的結果記入另一份回執紀錄。

```text
intents.wal      dispatcher          HTTP receiver       receipts.wal
保存key/body → 發送原key/body ───→ 提交效果與結果
                         ←────── 200 / result
                   崩潰！                         沒有回執
恢復掃描     → 再發送同key/body ─→ 重放或再次執行？
```

這個崩潰窗口不能被客戶端的“已經發送”標記消除。先標記已送再發，可能丟任務；發完再標記，可能重複。實驗采用後者，接受重送，並要求接收端說明重複請求的語義。

## 穩定身份必須跨過HTTP邊界

`Workflow.deliver` 把意圖的key寫進 `Idempotency-Key`，每次重試保持同一正文。接收端有兩個模式：`keyed` 把這個key交給持久Ledger；`unkeyed` 每收到一次就生成新身份。

兩種模式走同樣的真實回環連接、同樣的“收到回復但沒寫回執”崩潰點。區別只有接收端是否把兩次投遞當成同一個意圖。請求頭沒有標準魔法：沒有接收端約定，它只是一個字串。

## 五個場景，三個不同的答案

| 場景 | 接收端效果數 | 回執數 | 完整歷史數 |
| --- | ---: | ---: | ---: |
| 支援冪等，投遞後崩潰再恢復 | 1 | 1 | 1 |
| 不支援冪等，同樣崩潰再恢復 | **2** | 1 | 1 |
| 支援冪等，接收端也重啟 | 1 | 1 | 1 |
| 接收端暫時不可用，之後恢復 | 1 | 1 | 1 |
| 接收端已有同key不同正文 | 1個舊效果 | **0** | **0** |

第二行是本篇最重要的反例：本地最終只有一個回執和一輪歷史，遠端卻已經執行兩次。**觀察自己的歷史沒有重複，不能推出工具沒有重複。**

不可用場景先停止接收端，確認dispatcher非零退出，並且此時回執與歷史均為空，然後啟動接收端重新投遞。表中的1是恢復後的狀態，不是把第一次連接失敗算成成功。沖突場景則保留接收端的舊效果，返回409；dispatcher不寫成功回執，也不偽造回答。

## 為什么還需要單一dispatcher

本例用 `dispatcher.lock` 包住一次恢復循環，避免多個本地行程同時為同一目錄投遞。各Ledger再獨立鎖定自己的檔案。這讓“恢復協調”和“記錄原子性”分工清楚，也讓實現容易重現。

代價同樣明確：持鎖跨越網路等待，一個慢請求會擋住後續意圖。生產系統可能采用租約、認領狀態和並行分區，但租約過期又會引入重複投遞窗口，不能只換成執行緒池就宣稱問題解決。本例只展示正確性邊界，不實現任務佇列平臺。

## 保留時間也是協議的一部分

本輪接收端不會刪除key。因而重啟後仍能重放舊結果。若生產系統只保留key一分鐘，而發送端兩小時後仍重試，重複執行窗口就重新出現。也不能用同一個key去代表修改過的請求：它應該成為顯式沖突，而不是悄悄執行新參數。

這次沒有測TTL、跨區域副本、身份鑒權或真正的業務資料庫。它也不證明模型提供方支援這個頭，更不能據此承諾重複呼叫不收費。對無法冪等的外部操作，應保留“結果未知”，使用提供方的狀態查詢或人工對賬路徑。

### 動手練習

找到 `unkeyed_delivery` 的三份紀錄：接收端有兩條，回執和歷史各一條。先畫出崩潰發生的位置，再將接收端改成keyed模式，在**新輸出目錄**運行對照。若得到兩個效果，檢查重試是否生成了新key、接收端是否清空舊紀錄，以及正文是否改變。

同一運行工具也保存完整子行程命令與退出碼。紀錄中的 `halt(23)` 是注入的真實退出；不要把所有非零退出都叫成網路超時。下一篇處理另一個缺口：遠端和回執都成功，完整對話卻尚未提交。

## 最小重現與排錯

從干凈檢出目錄運行以下PowerShell命令。輸出目錄必須尚不存在。同組的三篇文章共用一份凍結協議，只需運行一次，再按各篇的證據分組查看。

```powershell
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 0d4009cf840052c3111bbfc40dce900326daa3ae
python -m venv .venv
$py = '.\.venv\Scripts\python.exe'
& $py demos/13-durable-dispatch/run.py --java-home "E:/Java/jdk1.8.0_171" --out demos/13-durable-dispatch/target/my-run
& $py demos/13-durable-dispatch/audit.py demos/13-durable-dispatch/target/my-run
```

本機Windows已驗證：Java JDK 1.8.0_171 + Python 3.12.14；17種場景、193條子行程記錄；獨立審計預期輸出 `PASS`。其他操作系統未復測。若只想核驗歸檔，不重新實驗，可將審計參數換為 `demos/13-durable-dispatch/evidence`。原始碼哈希統一LF，證據哈希按原位元組；不要改寫manifest掩蓋差異。

將JDK路徑替換為本機帶 `javac` 的JDK8。子行程退出碼23是主動故障注入，其他意外退出需要排查；不要把教學HTTP服務暴露到公網。

程式碼與文章由AI輔助整理，結論以歸檔且可審計的實際運行記錄為限。本輪沒有新增付費模型請求，也不代表作者已親手重現或完成人工審校。
