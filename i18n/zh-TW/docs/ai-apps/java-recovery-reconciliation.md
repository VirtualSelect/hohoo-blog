---
title: "對話恢復：從意圖、回執到完整問答"
description: "在三個提交邊界真實終止JVM，以持久事實恢復完整歷史，保留遠端重複執行反例。"
slug: "/ai-apps/java-recovery-reconciliation"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "ai-apps"
article_kind: "tutorial"
difficulty: "intermediate"
prerequisites: ["doc:ai-apps/java-outbox-delivery"]
related: ["lab:durable-dispatch", "project:hohoo-ai-lab"]
---

[固定程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch) · [原始證據](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch/evidence) · [實驗檔案](/labs/durable-dispatch)

工具已經完成，回執也寫好了，行程卻在保存回答前退出。重新啟動後，助手應該重做工具、提示失敗，還是把已有結果補回對話？這不是一個“catch後重試”就能準確表達的問題。

本篇把前兩篇的組件連接起來，用**持久意圖、回執和完整歷史三份不同證據**重建進度。回答仍是固定工具返回的計數，不呼叫模型；它驗證恢復鏈，不宣稱完整在線助手已經交付。

## 給狀態起名之前，先定義證據

```text
有 intent，無 receipt：待投遞，或遠端結果未知
有 receipt，無 history：遠端結果已獲確認，待補交完整問答
有 history：這一輪本地問答已提交
```

第一行不能叫“工具還沒執行”，因為遠端可能已經成功。第二行也不能重新呼叫工具：回執已經足夠支援本地恢復。本例不另外維護一個可能過時的 `status.json`；每次從這些記錄重建狀態，降低多個狀態檔案互相矛盾的機會。

完整歷史的正文是 `question => result`，以同一個turn key冪等提交。真實產品需要結構化訊息、角色、版本和顯示規則；本例使用簡單固定字串，是為了把焦點放在何時提交，而非模型輸出解析。

## 恢復按單調證據前進

`Workflow.resume` 的核心順序可以讀成：

```text
for 每條持久意圖:
    查找已有回執
    沒有回執 → 使用原key投遞 → 持久保存結果
    使用回執結果 → 冪等寫入完整問答
```

恢復程序不依賴上次行程活著時的Future、回呼或記憶體標志。收到HTTP成功後立即崩潰，回執可能尚不存在：這時仍會重送，依賴上一節的接收端冪等。回執已存在時，恢復只做本地寫入。

“沒有半輪歷史”只是一條本地不變量；它與遠端執行次數是兩條不同的保證，不能互相替代。

## 故障點不同，恢復動作也不同

| 崩潰或恢復條件 | 恢復後遠端效果 | 回執 | 完整問答 |
| --- | ---: | ---: | ---: |
| 收到遠端結果後、回執前退出 | 1 | 1 | 1 |
| 回執後、問答前退出 | 1 | 1 | 1 |
| 問答後退出，再次恢復 | 1 | 1 | 1 |
| 兩個不同turn，依次恢復兩遍 | 2 | 2 | 2 |
| 八個dispatcher行程競爭恢復 | 1 | 1 | 1 |

前三種使用真實行程終止，之後啟動新JVM恢復。最後一種驗證本地協調鎖，不能當成分布式多消費者性能測試。獨立審計會逐條核對意圖key、回執key與歷史key，並檢查歷史中的結果來自那份回執，而不只比較三份檔案的條數。

## 這條鏈仍然缺什么

本實現串行處理已持久化的意圖，沒有取消、過期、使用者編輯和權限撤銷。如果使用者在行程重啟前撤銷了操作，恢復程序目前仍會執行舊意圖；因此不能把它直接接到有風險的生產工具。下一步應設計撤銷記錄和下游停止語義，不能用刪除歷史代替撤銷副作用。

它也沒有會話並發策略。之前介紹的串行、先提交者獲勝、最新請求獲勝仍是不同產品選擇；這份恢復鏈沒有推翻它們。要整合時，先決定一個turn是否仍有寫入資格，再考慮如何提交完整回答。丟失資格的遠端操作仍可能需要對賬。

紀錄不做保留和壓縮；每次掃描的成本隨記錄數增長。已經有事務資料庫時，可用唯一鍵和事務存儲意圖與本地狀態，但HTTP副作用仍在事務之外。當前實驗只覆蓋Windows、本機協作行程和固定故障點。

### 從讀懂到修改

先找到 `recover-receipt` 目錄，讀取 `processes.json` 中第一次退出碼23的位置，確認該時刻不是“無操作發生”。再比較 `recover-two_intents`：第二條是新key，應該保留為獨立輪次，不能被錯誤去重。

可在新輸出目錄中練習加入一個只讀狀態查詢：分別顯示待投遞、已確認待落歷史、已完成。預期它不改變任何業務記錄，不將未知狀態轉成失敗。若重啟後重複出現問答，檢查歷史是否仍沿用原turn key；若回執沖突被吞掉，應該停止並保存錯誤，而不是臨時生成新key繞過它。

至此，三篇完成的是一條可復核的本地恢復鏈：提交邊界、遠端重送、最後的問答對賬。在線模型質量、權限與取消仍是後續問題。

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
