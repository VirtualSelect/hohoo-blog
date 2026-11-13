---
title: "Java LLM 實踐（十）：點了取消，讀取執行緒為什麼還在運行？"
description: "30次本地HTTP連接，區分會話取消、讀取退出與遠端工作；本地補充將每輪連接歸屬接入完整輪日誌。"
slug: "/ai-apps/java-transport-cancellation"
status: "published"
published_at: "2026-10-05"
updated: 2026-11-13
reading_minutes: 16
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:transport-cancellation", "project:hohoo-ai-lab", "doc:ai-apps/java-stream-session-ownership", "doc:ai-apps/java-streaming-boundary"]
---

<span id="published-correction"></span>

> **2026-11-13 修訂程式碼已發布。** [固定版本與執行說明](https://github.com/VirtualSelect/hohoo-ai-lab/tree/fdea0d8cc8c0a986deee47718cddbe1288afabed/demos/15-cancellable-turn-flow)現可取得。下文「本機分支／尚未發布」保留為2026-11-12複核時的狀態；歷史固定命令仍用於原實驗歸檔，不用於尋找新修訂。使用修訂時，在配套倉庫根目錄執行`git checkout fdea0d8cc8c0a986deee47718cddbe1288afabed`，再按對應目錄README執行，輸出使用新目錄。歷史結果與AI輔助揭露不變。

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/503f5271ef0d5baa12353d6eeda672dec5fc240e/demos/10-transport-cancellation) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-ai-lab/tree/503f5271ef0d5baa12353d6eeda672dec5fc240e/demos/10-transport-cancellation/evidence/20261005) · [實驗檔案](/labs/transport-cancellation)

點下“停止生成”，頁面不再更新，不代表網路讀取也已經停止。

上一篇解決了[舊回呼覆蓋新會話](/docs/ai-apps/java-stream-session-ownership)：只有當前請求才能提交預覽和歷史。本篇往下一層走，把記憶體中的 SSE 換成真實本地 HTTP 連接，檢查取消之後工作執行緒到底什麼時候退出。

## 先把三個“停止”分開

| 層次 | 希望停止什麼 | 本篇的驗證方式 |
| --- | --- | --- |
| 會話 | 舊回答繼續寫入預覽或歷史 | 檢查 Session 最終狀態 |
| 客戶端 | 工作執行緒繼續阻塞在讀取上 | 讀取函數的 finally 單獨記錄退出時間 |
| 服務端 | 繼續計算或生成 | 記錄本地服務端完成了多少個工作步驟 |

這三個狀態沒有共同的完成按鈕。UI 可以立即撤銷請求的寫入資格，而讀取執行緒仍在運行；連接關閉了，服務端也可能繼續執行自己的任務。

`Future.cancel(true)` 的含義是嘗試取消並中斷執行緒；成功取消後的 Future 狀態，不是執行緒已經退出的證明。[Java 8 Future 文件](https://docs.oracle.com/javase/8/docs/api/java/util/concurrent/Future.html)

## 實驗如何排除“只是改了一個標誌”

使用 Java 8 的經典阻塞 `Socket`，服務端綁定 loopback 隨機連接埠。回應為 `text/event-stream`，通過關閉連接結束 HTTP 回應；沒有 TLS、代理、HTTP/2 或 chunked 編碼。A6 的 SSE 解析器與 A7 的 Session 原樣重用。

五種條件各執行兩種策略，每組重複三次，共 **30 次真實本地連接**。六次正常完成作為控制組，其餘 24 次觸發取消或截止。

| 條件 | 服務端行為 | 觸發動作 |
| --- | --- | --- |
| 正常完成 | 首段文字後發送 stop 和 DONE | 不取消 |
| 手動取消／靜默 | 首段後一直等待測試清理 | 收到首段後取消 |
| 手動取消／持續發送 | 每輪等待約 80ms，共發送八段 | 收到首段後取消 |
| 截止／靜默 | 首段後靜默 | 讀取階段開始約 200ms 後取消 |
| 截止／持續發送 | 繼續八輪有界工作 | 讀取階段開始約 200ms 後取消 |

兩種策略都會先 `session.cancel()`，撤銷舊請求的歸屬。差別只有：**僅執行 `future.cancel(true)`，還是再執行 `socket.close()`**。讀取閒置超時統一為 500ms。

持續發送條件中的 80ms 是請求的休眠時間，不保證真實發包間隔精確為 80ms。調度、緩衝和運行環境都會影響時間，因此表中使用實際記錄，不能用八乘八十替代測量。

## Future 已取消，讀取仍然沒結束

下表測量的是“取消動作開始 → 讀取任務 finally 記錄時間”，單位毫秒。每格為三次運行的中位數和最小—最大範圍。

| 條件 | 僅取消 Future | 同時關閉 Socket |
| --- | ---: | ---: |
| 手動取消／靜默 | 507.211（501.246—509.968） | 0.137（0.119—0.389） |
| 手動取消／持續發送 | 747.739（740.487—750.737） | 0.176（0.173—0.181） |
| 截止／靜默 | 310.534（309.455—310.868） | 0.418（0.402—0.710） |
| 截止／持續發送 | 532.356（526.331—543.952） | 0.420（0.316—0.536） |

<img src="/media/practice/transport-cancellation.png" width="1500" height="600" loading="lazy" alt="兩種取消策略的實際讀取退出耗時；兩幅圖使用不同橫軸尺度，並顯示三次測量範圍。">

兩幅圖的橫軸尺度不同，請比較數值，不要比較柱子的視覺長度。這是本機 Java 1.8.0_171 的固定條件測量，不是網路 SLA，也不是所有 Java HTTP 客戶端的統一行為。

僅中斷的靜默組最終收到 `SocketTimeoutException`；持續發送組反而一直讀到了完整回答，之後由 Session 拒絕提交，結果為 `STALE_COMPLETE`。關閉連接的十二次故障運行都以 `SocketException` 退出。

`Socket.close()` 會使正在該 Socket I/O 操作中阻塞的執行緒拋出異常，這是此處主動喚醒讀取的機制。[Java 8 Socket 文件](https://docs.oracle.com/javase/8/docs/api/java/net/Socket.html#close--)

## 為什麼要有第二個完成信號

不能把 `future.get()` 當作取消後的執行緒回收憑證。它可能立即拋出取消異常，而實際讀取還沒有返回。實驗把退出記錄放在工作函數內部：

```java
try {
    String answer = reader.read(input, text -> session.preview(ticket, text));
    session.complete(ticket, answer);
} finally {
    exitedAt.set(System.nanoTime());
    workerExited.countDown();
}
```

取消端先撤銷寫入資格，再嘗試中斷和關閉連接：

```java
session.cancel();
future.cancel(true);
socket.close();
// 用獨立退出信號做有界等待，不用 isDone() 證明執行緒已回收。
workerExited.await(5, TimeUnit.SECONDS);
```

上面是關鍵邏輯摘錄，完整 Demo 還處理資源關閉、服務端收尾和異常。等待與 I/O 不放進 Session 的同步區；否則負責取消的執行緒可能反而拿不到鎖。

24 次取消運行都沒有寫入歷史，六次正常運行各保留一組問題和回答。**會話正確性相同，不代表資源回收及時性也相同。** 只檢查聊天界面，很容易漏掉這個問題。

## 閒置超時與截止時間也不是一回事

500ms 的閒置超時約束一次阻塞讀取等待資料的時間。對方持續發送時，任務總時長仍可以繼續增加。200ms 截止由獨立調度器觸發，不依賴下一段資料到達。

不過本 Demo 的計時起點在連接建立並發出請求之後，因此它只覆蓋讀取階段，**不包括 DNS、建連或寫請求**。如果要升級為完整請求截止，需要把時間預算傳播到這些階段，並處理取消與連接創建之間的競態。本篇沒有驗證這一擴展。

## 為什麼不能據此聲稱“停止計費”

持續發送的本地服務端被刻意設計為：即使寫入失敗，也完成八個有界工作步驟。四組持續發送條件、兩種策略下，記錄都保留了八步工作。

這只證明“客戶端已關閉”不足以推出“遠端任務已取消”。它沒有測試 Agnes 的服務端實現，也沒有賬單資料。真實供應商是否支援任務取消、是否確認取消、如何計費，需要對應協議和實際記錄。

因此狀態可以分別保留 `sessionInvalidated`、`readerExited` 和未來的 `remoteCancellationAcknowledged`，不要用一個 `cancelled=true` 向所有層承諾完成。

## 自己重現與讀證據

進入程式碼倉庫的 `demos/10-transport-cancellation`，準備 Java 8、Maven 和 Python。`run.py` 中 Maven 使用本機安裝路徑，換機器時調整為自己的路徑；首次需要解析已聲明的 Maven 依賴，運行器使用離線構建。

```text
python run.py --out evidence/my-run
python audit.py evidence/my-run
```

輸出目錄必須是新目錄，避免覆蓋已歸檔測量。`results.json` 保留 30 條記錄及 Session 事件，`environment.json` 記錄 JVM，`manifest.json` 固定實驗源程式碼與結果哈希。獨立審計檢查條件唯一性、歷史提交數量、退出時間順序和服務端工作步驟；它沒有把“小於一毫秒”寫成測試通過門檻。

建議先打開一條 `cancel-dripping / interrupt-only` 記錄：比較 `futureCancelledAtAction`、`workerExitedAtAction`、`outcome` 和空的 `history`。四個欄位放在一起，就能讀出“Future 取消了、執行緒繼續讀、協議完整了、會話仍拒絕提交”的全過程。

## 下一步該驗證什麼

本篇解決單個經典 Socket 的取消邊界。真實 SDK 的連接池重用、取消與完成同時發生、取消早於連接創建、多個並發請求的關閉歸屬，都應單獨建立測試。下一步優先接入實際使用的 HTTP 客戶端，再討論連接池和重試，而不是把這個教學 Socket 直接包裝成生產 SDK。

## 修復進展 · 2026-10-07

2026-10-07 修正：Demo08–10 增加 JSON 詞法校驗，三個範例各通過 53 項離線回歸；執行腳本改用 Maven 參數列表，支援含空格目錄。Demo10 稽核補上原始碼指紋檢查。原文固定版本與原始資料保持不變，修正版不是新增線上模型結果。

[修正版程式碼與回歸指令](https://github.com/VirtualSelect/hohoo-ai-lab/blob/1d5a9fad9607ec981094c19a2381475762cd0d23/REVIEW-FIXES-20261007.md)。

## 把連接取消接到整輪落盤

**2026-11-12 本地補充。** 本節是 AI 輔助編寫並執行的整合參考，作者尚未獨立重現。它使用固定 SSE 回應，沒有模型呼叫；上文 30 次測量、原固定提交與原始資料保持不變。新增程式碼仍在配套倉庫本地分支，尚無已發布的固定版本。

[整輪提交的補充](/docs/ai-apps/java-durable-turns#一輪對話的整合參考)已把請求窗口、一次發送與完整輪日誌接起來，但只在檢查點讀取取消標記。如果讀取者正等下一段 SSE，就無法執行下一次檢查。於是可能出現：這一輪已失去提交資格，連接與工作執行緒卻仍佔用資源。

這裡補的是連接的**歸屬與交接**，不是再加一個會話歷史。仍只有工作執行緒擁有並寫入 `TurnJournal`；沿用原 `TurnFlow` 的提交檢查，不再疊加 Demo 10 的另一份 `Session` 歷史。傳輸適配器重用[經過 JSON 詞法修訂的解析器](https://github.com/VirtualSelect/hohoo-ai-lab/blob/7fb37e8cdc7420c41fa474867b1fb268e97564e9/demos/10-transport-cancellation/src/main/java/com/hohoo/ailab/stream/StreamReader.java)，它與上文原始實驗版本分開。

### 一輪請求，只擁有自己的連接

設 A 已結束，B 正在讀取。若「停止 A」的回呼去關閉一個全域 `currentSocket`，它可能關掉 B。取消標記同樣不能重設後供 B 繼續使用：遲到的 A 回呼仍持有它。

因此每輪建立新的 `CancellationLease`，保存不可重設的取消標記及本輪唯一的連接。取消時先撤銷提交資格，再取出自己的資源，最後在鎖外關閉。以下是實際類別的方法摘錄，並非可單獨編譯的完整程式：

```java
public void cancel() throws IOException {
    // 即使關閉失敗或資源尚未註冊，也先撤銷提交資格。
    cancelled.set(true);
    Closeable closing;
    synchronized (this) { closing = owned; owned = null; }
    if (closing != null) closing.close();
}
```

資源註冊也要檢查這個標記。**先取消、後註冊**時，註冊方立即關閉遲到的 Socket；**先註冊、後取消**時，取消方取出並關閉它。註冊與取出在同一同步區內交接，實際關閉在同步區外完成，不用鎖包住 I/O。

適配器在 `socket.connect(...)` 之前註冊 Socket，因此取消方能看到已建立、尚未連接的資源。正常結束也釋放同一資源；舊 A 的 lease 不保存 B 的 Socket。[Java 8 的 `Socket.close()` 契約](https://docs.oracle.com/javase/8/docs/api/java/net/Socket.html#close--)說明，被關閉 Socket 上阻塞的 I/O 會拋出 `SocketException`。這解決的是本地等待，不是遠端任務的完成確認。

### 先看這個對照，再看「通過」

本地伺服器先發送 `fixture:`，然後停在一個繼續門前。只設定取消標記的 `flag-only` 場景中，100ms 觀察窗口結束時，工作執行緒仍未發出退出訊號。隨後清理程式碼顯式關閉連接，工作執行緒在伺服器被放行之前退出。`close-reading` 則在首段到達後直接呼叫 lease 的取消方法，同樣在伺服器放行前確認退出。

退出訊號來自工作執行緒自己的 `finally`，還要檢查 `join` 後執行緒確實結束；不用 `Future.isDone()` 代替。100ms 是固定觀察窗口，不是回應時間指標，也沒有測取消延遲的分布。

| 交接位置 / 場景 | 伺服器收到請求 | 新增完整輪 | 這次執行說明什麼 |
| --- | ---: | ---: | --- |
| 正常完成 | 1 | 1 | 完整 SSE 驗收後提交 |
| 啟動前、註冊前、註冊後但連接前取消（各一場景） | 各 0 | 各 0 | 未發送；已建立的資源最終關閉 |
| 只設定標記 `flag-only` | 1 | 0 | 觀察時仍阻塞；顯式關閉後才在繼續門前退出 |
| 讀取中關閉 `close-reading` | 1 | 0 | 退出與拒絕提交分別得到檢查 |
| 已讀完、提交檢查前取消 `before-commit` | 1 | 0 | 完整回應仍只是候選，不能繞過提交檢查 |
| A 提交後，B 讀取時取消舊 A lease | 2 | 2 | B 的資源與提交資格未被舊憑據撤銷 |

八個場景各預置一輪歷史；最終 11 條保存記錄中，8 條為預置、3 條為新增，不能將 11 當作成功次數。上表只計算各場景實際收到的請求與新增輪，不把已有歷史混進去。

伺服器的繼續門被放行後，仍執行剩餘一步固定工作，最終每份請求記錄兩步。即使讀取端已退出，也不能據此說遠端停止計算，更不能說停止計費。

### 本地補充怎樣重現

先取得配套倉庫本地 `codex/bounded-turn-flow-20261112` 分支中的 `demos/15-cancellable-turn-flow`。上文原固定提交與解析器修訂提交都**不包含**這個新目錄；它們仍用於重現各自版本。以下路徑以配套倉庫根目錄為起點，Java 與 Gson 路徑替換成本機實際位置：

```sh
python demos/15-cancellable-turn-flow/run.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out demos/15-cancellable-turn-flow/out/my-run
python demos/15-cancellable-turn-flow/audit.py demos/15-cancellable-turn-flow/out/my-run --verify-sources
```

輸出目錄必須不存在。執行器使用已有 Java 8、Python 3 與 Gson 2.10.1，先重跑解析器的 53 項詞法回歸，再執行八個場景；不安裝依賴、不讀取模型金鑰。獨立檢查把 `results.json`、實際請求、完整日誌幀與原始碼指紋對起來。

可以先預測：**取消發生在完整回應之後，為何仍不應增加日誌？** 然後對照 `before-commit` 的 `completeCandidate=true` 與只含預置輪的日誌。再看 `flag-only` 的 `workerExitedAtControlObservation=false`、`workerExitedBeforeServerRelease=true`：兩個值描述不同階段，並不矛盾。

這裡的 `SocketFixtureReplyClient` 只接受回環位址、固定的 HTTP/1.1 關閉連接分幀與 SSE。沒有驗證 TLS、鑑權、chunked 回應、阻塞寫入、真實阻塞建連或連接池，也沒有把連接/讀取逾時升級為嚴格總期限。取消若發生在最後檢查之後，仍可能與寫盤競爭，無法撤銷已提交的記錄。下一步應先選擇實際客戶端與提交語義，再驗證對應協議，不能把這個窄適配器直接用於公網。
