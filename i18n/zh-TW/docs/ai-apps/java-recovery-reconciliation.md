---
title: "對話恢復：從意圖、回執到完整問答"
description: "在三個提交邊界真實終止JVM，以持久事實恢復完整歷史，保留遠端重複執行反例。"
slug: "/ai-apps/java-recovery-reconciliation"
status: "published"
published_at: "2026-10-11"
updated: "2026-11-25"
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

Demo13 原版依序處理已持久化的意圖，恢復時只檢查意圖、回執與歷史。原版沒有撤銷紀錄，即使使用者已經撤銷，恢復程序仍會執行舊意圖。處理撤銷時，需要另外記下使用者的決定，並保留既有的遠端證據。

它也沒有會話並發策略。之前介紹的串行、先提交者獲勝、最新請求獲勝仍是不同產品選擇；這份恢復鏈沒有推翻它們。要整合時，先決定一個turn是否仍有寫入資格，再考慮如何提交完整回答。丟失資格的遠端操作仍可能需要對賬。

紀錄不做保留和壓縮；每次掃描的成本隨記錄數增長。已經有事務資料庫時，可用唯一鍵和事務存儲意圖與本地狀態，但HTTP副作用仍在事務之外。當前實驗只覆蓋Windows、本機協作行程和固定故障點。

### 從讀懂到修改

先找到 `recover-receipt` 目錄，讀取 `processes.json` 中第一次退出碼23的位置，確認該時刻不是“無操作發生”。再比較 `recover-two_intents`：第二條是新key，應該保留為獨立輪次，不能被錯誤去重。

可在新輸出目錄中練習加入一個只讀狀態查詢：分別顯示待投遞、已確認待落歷史、已完成。預期它不改變任何業務記錄，不將未知狀態轉成失敗。若重啟後重複出現問答，檢查歷史是否仍沿用原turn key；若回執沖突被吞掉，應該停止並保存錯誤，而不是臨時生成新key繞過它。

三篇一起涵蓋本機提交、遠端重送和最後的問答對帳。下方用相同的接收端驗證撤銷紀錄如何改變恢復順序。

## 撤銷後重啟，還會執行舊意圖嗎？

補充實驗使用同一個冪等鍵，將撤銷寫入獨立的持久紀錄，並與恢復程序共用同一把本機鎖。受控版本先檢查是否已撤銷，再決定是否投遞或補寫問答。它在送出 HTTP 請求前寫入投遞標記。每種情形都用新的 JVM 連續恢復兩遍，分別核對請求觀察紀錄、接收端效果、回執及問答歷史。

| 首次恢復前的條件 | HTTP POST | 接收端效果 | 回執 | 問答歷史 |
| --- | ---: | ---: | ---: | ---: |
| 投遞前撤銷，依原版規則恢復 | 1 | 1 | 1 | 1 |
| 投遞前撤銷，依受控規則恢復 | 0 | 0 | 0 | 0 |
| 寫入投遞標記後、送出前結束，再撤銷 | 0 | 0 | 0 | 0 |
| 接收端執行後、寫入回執前結束，再撤銷 | 1 | 1 | 0 | 0 |
| 寫入回執後、寫問答前結束，再撤銷 | 1 | 1 | 1 | 0 |
| 接收端執行後、寫入回執前結束，未撤銷 | 2 | 1 | 1 | 1 |

第三、四列的本機證據相同：有投遞標記和撤銷紀錄，沒有回執。只有接收端和請求觀察紀錄能區分實際效果是 0 或 1。恢復程序將兩種情形都標示為結果未知，並停止重送。第五列保留既有回執，並停止補寫一般問答。第六列仍使用原鍵重送，由接收端去重後傳回原結果。

補充實驗使用 macOS、JDK 8 和本機迴路接收端。撤銷與恢復依序執行，撤銷在鎖內寫入後才生效。執行中的請求能否中斷、已發生的效果能否補償，以及真實服務如何對帳，都需要另外驗證。

### 查看固定封存

執行報告的 `cases` 收錄六種時序的 HTTP 請求、日誌和恢復檢查點，可逐列核對上表。

[執行報告](https://github.com/VirtualSelect/hohoo-blog/blob/07bc16aba4fb1b01e00743c21d5db5faf84d8e7c/reports/java-cancellation-recovery-20261125.json) · [重現指令碼](https://github.com/VirtualSelect/hohoo-blog/blob/07bc16aba4fb1b01e00743c21d5db5faf84d8e7c/scripts/research/java-cancellation/run.py) · [凍結協定](https://github.com/VirtualSelect/hohoo-blog/blob/07bc16aba4fb1b01e00743c21d5db5faf84d8e7c/scripts/research/java-cancellation/protocol.json) · [配套原始碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch)

### 在新目錄重跑六種時序

在 macOS 上準備 Git、Python 3 和 JDK 8，將 `JAVA_HOME` 設為同時包含 `bin/java` 和 `bin/javac` 的 JDK 8 目錄。指令會下載兩個固定提交，並在暫存目錄重跑。程式會核對協定與原始碼指紋，實驗請求透過本機迴路傳送。

```bash
(
  set -eu
  : "${JAVA_HOME:?Set JAVA_HOME to your JDK 8 directory}"
  study_dir="$(mktemp -d "${TMPDIR:-/tmp}/hohoo-java-cancellation.XXXXXX")"

  git init -q "$study_dir/blog"
  git -C "$study_dir/blog" fetch --depth 1 \
    https://github.com/VirtualSelect/hohoo-blog.git \
    07bc16aba4fb1b01e00743c21d5db5faf84d8e7c
  git -C "$study_dir/blog" checkout FETCH_HEAD -- scripts/research/java-cancellation

  git init -q "$study_dir/lab"
  git -C "$study_dir/lab" fetch --depth 1 \
    https://github.com/VirtualSelect/hohoo-ai-lab.git \
    0d4009cf840052c3111bbfc40dce900326daa3ae

  python3 "$study_dir/blog/scripts/research/java-cancellation/run.py" \
    --repo "$study_dir/lab" \
    --java-home "$JAVA_HOME" \
    --run-dir "$study_dir/run"
)
```

成功後，終端機會輸出新報告的完整路徑與六種結果。新報告及原始日誌皆存放於暫存目錄下的 `run`，可與上方封存內容比較。

## 撤銷後，如何唯讀對帳？

接著檢驗上表中本機都顯示「結果未知」的兩種情形。另啟一個本機查詢服務，透過 HTTP GET 核對原本的冪等鍵與請求摘要。查詢以唯讀模式開啟現有帳本，並在共享鎖內驗證所有紀錄。如果帳本尾端截斷，即使前面已有符合的紀錄，仍會回報證據不可用。用戶端也會檢查回傳的鍵、請求摘要和快照結果是否完整。

| 查詢條件 | 對帳結論 |
| --- | --- |
| 接收端已執行，同一個鍵的摘要相符 | 確認已執行 |
| 健康的完整快照沒有紀錄 | 查詢時該接收端沒有紀錄 |
| 帳本檔案不存在，或帳本尾端截斷 | 結果未知 |
| 同一個鍵對應不同的請求摘要 | 結果未知，記錄衝突 |
| 查詢逾時，或 HTTP 200 缺少完整證據 | 結果未知 |

七種情形各以新的查詢服務和用戶端 JVM 重查兩次，共觀察到 14 次 GET。對帳階段新增的業務 POST 為 0。每次查詢前後，六類業務日誌的位元組內容與檔案存在狀態均一致。確認已執行後也沒有補寫回執或成功問答。查無紀錄只描述本機接收端在查詢當時的完整快照。真實服務的多副本、日誌保留、補償與執行中取消仍需另外驗證。

在包含本節指令碼的部落格工作區根目錄執行以下指令。配套儲存庫需包含上方已固定的提交，並將 `JAVA_HOME` 指向 JDK 8。指令會建立新的輸出目錄，重現故障並核對日誌。七種情形的封存紀錄見 `reports/java-cancellation-reconciliation-20261125.json`。

```bash
study_dir="$(mktemp -d "${TMPDIR:-/tmp}/hohoo-java-reconcile.XXXXXX")"
python3 scripts/research/java-cancellation-reconciliation/run.py \
  --repo /path/to/hohoo-ai-lab \
  --java-home "$JAVA_HOME" \
  --run-dir "$study_dir/run"
```

下節重現 Windows 上的原版 Demo13 協定。

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

原版完整測試在 Windows 上驗證，使用 Java JDK 1.8.0_171 和 Python 3.12.14，共 17 種場景、193 筆子行程紀錄。獨立稽核預期輸出 `PASS`。若只核對封存結果，可將稽核參數換為 `demos/13-durable-dispatch/evidence`。原始碼以 LF 換行計算雜湊，證據以原始位元組計算。

將JDK路徑替換為本機帶 `javac` 的JDK8。子行程退出碼23是主動故障注入，其他意外退出需要排查；不要把教學HTTP服務暴露到公網。

程式碼與文章由AI輔助整理，結論以歸檔且可審計的實際運行記錄為限。本輪沒有新增付費模型請求，也不代表作者已親手重現或完成人工審校。
