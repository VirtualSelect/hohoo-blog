---
title: "持久冪等：讓操作身份與結果一起提交"
description: "用帶CRC的追加紀錄、行程崩潰與99個截斷前綴，解釋持久冪等的提交邊界。"
slug: "/ai-apps/java-durable-idempotency"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "ai-apps"
article_kind: "tutorial"
difficulty: "intermediate"
prerequisites: ["doc:ai-apps/java-idempotent-retry"]
related: ["lab:durable-dispatch", "project:hohoo-ai-lab"]
---

[固定程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch) · [原始證據](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/demos/13-durable-dispatch/evidence) · [實驗檔案](/labs/durable-dispatch)

上篇的冪等鍵擋住了同一行程里的重複請求，卻擋不住重啟：副作用已經寫入計數檔案，記憶體中的 key 消失，重試又執行一次。本篇不再給記憶體表補一個“保存”按鈕，而是改變提交邊界——**讓業務結果和冪等身份成為同一條紀錄記錄**。

讀完後，你可以實現一個跨行程恢復的最小操作紀錄，解釋尾部截斷與完整記錄損壞為什么不能使用相同的恢復策略。這裡的業務僅為固定材料的計數操作，沒有真實訂單、支付或模型呼叫。

## 兩份檔案之間，永遠還有一道縫

```text
計數器加一 → 行程崩潰 → 冪等表還沒記住 key
先保存成功 key → 行程崩潰 → 計數器卻還沒加一
```

交換兩個寫入的順序，只是換一種錯誤。這個實驗把計數定義成“有效操作記錄數”，每條記錄同時攜帶 key、請求正文、正文 SHA-256 和結果序號。重啟時重放完整記錄，業務狀態與冪等身份從同一來源恢復。它不是通用資料庫；如果真正業務在另一個系統，這個邊界就不成立，下一篇會專門驗證。

## 先判斷記錄完整，再判斷請求是否相同

`Ledger.java` 的記錄格式是：

```text
magic(4B) | payload長度(4B) | CRC32(4B) | payload
payload = key + bodyHash + body + result
```

字串使用 Java `DataOutputStream.writeUTF` 的長度編碼，不靠換行分隔。長度最多 65,536 位元組；CLI還限制 key 和請求體，避免從損壞長度無限分配記憶體。CRC覆蓋payload，用於檢測意外損壞，不提供抗惡意篡改能力。

恢復順序很關鍵：讀取頭部與長度 → 判斷尾幀是否完整 → 驗CRC → 校驗正文hash、key唯一性與連續結果序號。**完整幀CRC失敗時直接拒絕恢復**，不能把它當成“未寫完，刪掉就好”。否則一次已提交操作可能被忘記，下一次重試重新生效。

只有檔案末尾不足一個完整幀時，本實現才截斷到上一個確認邊界。這個策略假定只有單個追加寫者、此前確認的前綴可信；不適用於任意磁盤損壞。例子故意保留 `corrupt.wal`，審計驗證拒絕後位元組未變。

## 同一個鎖里完成查找、判斷與追加

```java
try (RandomAccessFile file = new RandomAccessFile(path.toFile(), "rw");
     FileLock lock = file.getChannel().lock()) {
    LinkedHashMap<String, Entry> entries = scan(file);
    // 同 key / 同正文：重放；同 key / 不同正文：拒絕
    // 新 key：追加一個完整 frame，再 force(true)
}
```

本輪的並發單元是**八個獨立 JVM 行程**。它們鎖定同一紀錄，從掃描到追加均持鎖，所以不能同時認領同一 key。不要把這個例子直接搬到同一 JVM 的多執行緒中：Java 的檔案鎖以 JVM 為單位，同行程還需要執行緒級串行化。這一邊界可核對 [FileLock 官方說明](https://docs.oracle.com/javase/8/docs/api/java/nio/channels/FileLock.html)。

檔案鎖也不是分布式鎖。本輪只在本機 Windows 檔案系統上驗證，沒有覆蓋 NFS、跨主機副本、非合作寫者或磁盤掉電。

## 真正退出行程，再看重試結果

故障使用 `Runtime.halt(23)`，不是拋異常後讓 finally 完成寫入。

| 條件 | 重試後的有效操作數 | 關鍵證據 |
| --- | ---: | --- |
| 追加前退出 | 1 | 重試完成新操作 |
| 寫入半個幀後退出 | 1 | 截去未完成尾幀，再追加 |
| 完整幀force後、回復前退出 | 1 | 恢復原記錄並重放 |
| 八行程同key並發 | 1 | 只有一條有效記錄 |
| 同key不同正文 | 1 | 拒絕沖突，不執行第二次 |
| 完整幀payload被翻轉一位 | 不恢復 | 原檔案保持不變 |
| 99種嚴格截斷前綴 | 每種均為1 | 恢復後的位元組與完整參考幀一致 |

固定 `turn-1/add-one` 幀長99位元組，前綴測試覆蓋0至98位元組；不是“99種業務故障”。它檢查的是幀邊界恢復，不證明任何隨機損壞都可恢復。獨立Python審計重新解析紀錄和CRC，不呼叫Java恢復函數。

## 什么時候可以用，什么時候應該換方案

這是小型單機教學紀錄：每次操作全量掃描，紀錄與key不做淘汰，吞吐和磁盤增長都沒有生產保障。它適合觀察提交邊界，或為單機低頻任務設計恢復測試；已有資料庫時，通常應優先使用資料庫的唯一約束和事務，而不是擴建這個檔案系統。

`force(true)` 的行為應以 [FileChannel 文檔](https://docs.oracle.com/javase/8/docs/api/java/nio/channels/FileChannel.html)和檔案系統為準。本輪實測的是指定位置的**行程終止**，沒有模擬斷電，也沒有證明目錄項、控制器快取和損壞磁盤的耐久性。

### 小練習與排錯

先預測：完整幀寫入後沒有收到回復，客戶端該生成新key還是復用舊key？運行 `ledger-after.wal` 案例後，再用不同key提交同正文；它們應當是兩個意圖。若並發生成了多條同key記錄，首先檢查“查找”和“追加”是否仍在同一個鎖里。若CRC失敗，不要修改manifest讓檢查通過，應保留損壞樣本並定位寫入鏈路。

下一篇把紀錄中的意圖送到真正的本機HTTP服務，驗證這份本地保證為何不能直接跨越網路。

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
