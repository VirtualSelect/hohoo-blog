---
title: "Java LLM 實踐（九）：取消請求後，舊回答為什麼還會覆蓋新會話？"
description: "18 種固定執行緒交錯，驗證流式預覽、完成和錯誤回呼的請求歸屬，以及取消和有限冪等的邊界。"
slug: "/ai-apps/java-stream-session-ownership"
status: "published"
published_at: "2026-10-04"
updated: "2026-10-06"
reading_minutes: 10
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:stream-session-ownership", "project:hohoo-ai-lab", "doc:ai-apps/java-streaming-boundary", "doc:ai-apps/java-first-llm"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/920fee3717a373dc796269ee3a4a03ec33700ae3/demos/09-stream-session) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-ai-lab/tree/920fee3717a373dc796269ee3a4a03ec33700ae3/demos/09-stream-session/evidence/20261004) · [實驗檔案](/labs/stream-session-ownership)

上一輪解決了一個協議問題：流式回答必須正常結束，才能把問答寫入歷史。但完整回答也可能屬於一個**已經被取消的舊請求**。

假設 A 正在回答，使用者取消 A，立即發送 B。取消發生時，A 的最後一個回呼可能已經排進執行佇列。如果回呼只負責 `setText(answer)`，舊回答仍然能寫到 B 的位置。即使 B 稍後覆蓋回來，頁面中途也顯示過錯誤內容。

這篇把問題從“回答完整嗎”推進到“這次更新還屬於當前請求嗎”。

## 先選產品語義，再選並行策略

[事務式歷史](/docs/ai-apps/java-transactional-history)、[版本票據](/docs/ai-apps/java-concurrent-history)與本篇服務不同的產品要求。後篇不代表前篇一律錯誤。假設使用者先發出 A，再發出 B：

| 產品要求 | 策略 | B 是否包含 A 的回答 | A 晚到時怎麼辦 |
| --- | --- | --- | --- |
| 兩個問題都要回答，B 延續 A 的上下文 | 同會話序列執行（Demo 05） | A 成功提交後 B 才取歷史，因此包含 | B 排隊，正常提交不會越過 A |
| 允許基於相同歷史並行求解，只接納一份提交 | 先提交者勝出（Demo 06） | A/B 同時取得版本 v 時不包含 | 先合法提交者使 v 失效；另一份重試前須重新取得歷史 |
| B 表示新的意圖，舊回答不應繼續改介面 | 最新發起請求勝出（Demo 09） | 不保證；B 開始時 A 若未提交就不包含 | B 開始即撤銷 A 的寫入資格，即使 A 較早完成也拒絕 |

以下是**語義推演**，不是新增實驗：

```text
序列執行：      發起 A → 提交 A → 發起 B → 提交 B
先提交者勝出：  發起 A(v0) → 發起 B(v0) → A 提交(v1) → B 拒絕
最新發起勝出：  發起 A(e1) → 發起 B(e2) → A 拒絕      → B 提交
```

如果 B 發起後失敗，A 後來成功，三者仍不同。序列執行保留已提交的 A；版本票據模式中，B 未提交就不消耗版本，A 仍可能提交；本篇的最新意圖模式已撤銷 A，不因 B 失敗而復活。若要保留兩份答案，應使用佇列或獨立分支，不要硬套單一活動請求模型。

<details><summary>小練習：把「最新請求」理解成「最後完成的請求」，會怎樣？</summary>

A 發起早但回傳慢，B 發起晚卻回傳快；最後完成者勝出會讓 A 覆蓋 B，違反最新意圖的語義。必須依請求身分與代次判斷，不依網路返回順序。本篇的 `late-preview` 是可執行反例。

</details>


## 先看發生錯誤的時刻

下面是 `late-preview` 案例的實際調度順序。A 的工作執行緒停在預覽回呼前，主執行緒啟動 B，再放行 A：

```text
主執行緒：begin(A)
工作執行緒：已經解析出 answer-A，等待放行
主執行緒：begin(B) → preview(B, answer-B)
工作執行緒：preview(A, answer-A) → complete(A)
主執行緒：complete(B)
```

不檢查歸屬的實現，在第 4 步把 `answer-B` 改回了 `answer-A`，並將舊問答寫入歷史。只檢查最後一張截圖，很容易遺漏這個錯誤。因此紀錄保存了**每次回呼後的預覽和歷史**，審計會檢查整條軌跡。

<img src="/media/practice/stream-session.png" width="1500" height="600" loading="lazy" alt="18個固定執行緒交錯：樸素實現7種失敗，請求歸屬檢查9種通過" />

## 實驗到底測了什麼

使用 Java 8、一個真實工作執行緒和主執行緒。輸入是合成的記憶體 SSE，解析器原樣重用[上一篇的文本協議](/docs/ai-apps/java-streaming-boundary)。本輪不呼叫 Agnes，也不重新測試網路傳輸。

通過兩把 `CountDownLatch` 控制先後關系：工作執行緒告訴主執行緒“已經到達指定位置”，主執行緒完成取消、清空或切換後，再放行回呼。這比不斷運行帶 `sleep` 的測試更明確：每次都確實進入所聲稱的交錯。

[Java 8 CountDownLatch 文檔](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/CountDownLatch.html)定義了等待與放行之間的可見性關系。這裡用它構造可重複測試，不用它作為產品會話鎖。等待設置了 5 秒上限；超時視為測試失敗，不作為模型延遲。

| 固定場景 | 任意回呼均可寫入 | 僅當前請求可寫入 |
| --- | --- | --- |
| 正常完成 | 通過 | 通過 |
| 取消後舊回答完成 | 失敗 | 通過 |
| 清空後舊回答完成 | 失敗 | 通過 |
| 切換 B，A 先完成 | 失敗 | 通過 |
| 切換 B，B 先完成 | 失敗 | 通過 |
| B 已預覽，A 的預覽遲到 | 失敗 | 通過 |
| 同一完成回呼執行兩次 | 失敗 | 通過 |
| SSE 截斷 | 通過 | 通過 |
| B 已開始，A 的錯誤遲到 | 失敗 | 通過 |

18 次執行中，樸素對照有 7 種交錯違反預期，帶歸屬檢查的 9 種全部通過。它是有限場景的確定性驗證，**不是線上故障率，也不是所有並發情況的證明**。

## 一個請求需要一張“寫入通行證”

`Session.begin` 返回一個 `Ticket`，里面包含：

- `owner`：創建它的會話物件，外部不能構造或更換。
- `epoch`：請求代次。開始、取消和清空都會使舊代次失效。
- `id` 與 `question`：請求標識和對應問題。

寫入前的核心檢查只有一行：

```java
t.owner == this && t == active && t.epoch == epoch
```

三項檢查各自有作用。`owner` 拒絕把另一個會話的憑據拿來用；物件身份限定當前請求；`epoch` 明確表達失效代次。它們不是登錄認證，也不能替代服務端鑒權。

僅檢查“版本號相同”還不夠描述整個生命周期。A 完成後即使沒有新請求，也不能再次提交。所以成功提交會把 `active` 清空，重複完成自然被拒絕。

## 檢查與修改必須在同一把鎖里

下面的寫法仍然存在競態：

```java
if (isCurrent(ticket)) {
    // 此處可能發生 cancel() 或 begin(B)
    history.add(answer);
}
```

本例讓 `preview`、`complete`、`cancel`、`clear` 和 `fail` 都在同一個 `Session` 的同步方法里執行。核對歸屬和修改狀態構成一個不可分割的短操作。

網路讀取和解析不放在鎖里：

```java
Session.Ticket ticket = session.begin(id, question);
if (ticket == null) return; // 本地 ID 保留窗內重複，不啟動請求

try {
    String answer = new StreamReader().read(input,
        text -> session.preview(ticket, text));
    session.complete(ticket, answer);
} catch (IOException ex) {
    session.fail(ticket);
}
```

這裡仍然依賴上一輪的前置條件：`StreamReader.read` 只有在 `stop` 和 `[DONE]` 都滿足時才返回。`complete` 本身不解析 SSE；不要繞過呼叫邊界，把半句文本直接塞給它。

## 錯誤回呼也要核對歸屬

一個容易漏掉的分支是 `catch`。如果 A 遲到的錯誤執行了“清空 loading、清空預覽”，B 即使沒有被舊答案覆蓋，也會失去自己的狀態。

`late-error` 案例專門驗證這一點：B 已經預覽，A 才進入 `fail`。帶歸屬檢查的實現記錄 `STALE`，不修改 B。錯誤不是擁有更高權限的回呼，它也屬於某個具體請求。

## 取消不等於遠端停止

本輪的取消含義是：**從這一刻開始，A 不能再改變本地當前會話**。它不保證：

- 遠端模型立即停止生成或計費；
- 阻塞的網路讀取已經被中斷；
- 多臺服務器共享同一失效代次；
- 行程重啟後仍能識別舊 ID。

工程接入時仍需關閉連接、處理超時，必要時呼叫供應商支援的取消機制；即便這些操作失敗，本地歸屬檢查也應繼續有效。

## 有界冪等不是永久冪等

示例保留最近 8 個已用 ID 和 8 對完整問答。重複 ID 不啟動新請求；同一 ID 換問題也拒絕。清空內容不會立即清掉 ID 保留窗，避免清空後舊操作被意外重放。

當 ID 被淘汰後，它可以再次使用。因此這是**單行程、有限視窗的防重複機制**。需要長期請求去重時，應使用持久化收據、明確生命周期和認證後的會話鍵，不能把這個示例的集合直接稱作生產冪等服務。事件快照只用於本輪小型實驗，生產紀錄也需要容量限制與脫敏。

## 重現前先檢查環境

使用乾淨目錄固定本篇版本，再執行下方 `run.py`；首篇舊提交不含 Demo 09：

```sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-session
cd hohoo-ai-lab-session
git checkout 920fee3717a373dc796269ee3a4a03ec33700ae3
java -version
mvn -version
```

需要 Python 3、相容 Java 8 的 JDK 與 Maven。首次下載 Gson 相依套件時不要加 `--offline`。將下方 `/path/to/mvn` 換成實際執行檔（Windows 可用 `mvn.cmd`）。預期兩種實作各 9 條軌跡；檢查中間預覽，不僅看最終答案。找不到 Maven 時檢查 PATH；找不到目錄時核對提交；輸出目錄已存在則換新名稱，不覆蓋封存。

**2026-10-06 複核邊界：** 沿用的 Gson 2.10.1 解析路徑即使設定 `setLenient(false)`，仍會接納字串內未跳脫的換行與定位字元。因此歸屬實驗不構成嚴格 JSON 合規證明。接入不可信 SSE 前需補齊拒絕規則；保留原 18 條軌跡，不當成新的線上模型實驗。


## 怎樣重現並檢查證據

在 `hohoo-ai-lab` 倉庫執行：

```text
python demos/09-stream-session/run.py --out demos/09-stream-session/evidence/my-run --maven /path/to/mvn
python demos/09-stream-session/audit.py demos/09-stream-session/evidence/my-run
```

已快取 Maven 依賴時可加 `--offline`。JDK 需為 Java 8 或兼容環境。本次實際運行使用 Java 8u171。

`results.json` 包含 18 條完整事件軌跡和中間狀態；`manifest.json` 固定運行程式碼、輸入協議與原始檔案哈希；`audit.py` 按事件獨立重建歷史和預覽，檢查舊回呼是否曾被接受。另有 7 組契約檢查覆蓋跨會話票據、取消、重複 ID、問答成對裁剪、收據淘汰等邊界。

現在，“一次成功回答”有了兩層條件：協議完整，且提交時仍擁有當前會話。下一步接入真實界面或服務端執行器時，應保留這兩層邊界，並補上連接取消與多行程狀態的實測，而不是繼續增加一個只判斷 HTTP 狀態碼的分支。
