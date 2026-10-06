---
title: "Java LLM 實踐（十）：點了取消，讀取執行緒為什麼還在運行？"
description: "30次本地HTTP連接，區分會話取消、阻塞讀取退出與遠端工作，比較Future中斷和主動關閉連接。"
slug: "/ai-apps/java-transport-cancellation"
status: "published"
published_at: "2026-10-05"
updated: "2026-10-07"
reading_minutes: 11
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:transport-cancellation", "project:hohoo-ai-lab", "doc:ai-apps/java-stream-session-ownership", "doc:ai-apps/java-streaming-boundary"]
---

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
