---
title: "Java LLM 實踐（五）：工具超時了，為什麼任務還在執行？"
description: "用白名單、嚴格參數、零佇列與調用預算構建只讀工具致動器，並重現取消不等於終止的邊界。"
slug: "/ai-apps/java-tool-boundary"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 8
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:tool-eval", "project:hohoo-ai-lab", "doc:ai-apps/java-concurrent-history", "doc:ai-apps/java-retrieval-evidence"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows/evidence/20261003-reviewed) · [實驗檔案](/labs/tool-eval)

把模型回復變成工具調用，只需要解析一段JSON；把工具調用變成可信的程式行為，卻需要回答：誰能調用什麼、輸入是否合法、最多執行幾次、等待多久，以及超時之後發生什麼。

本篇實現 `ReadOnlyTools`。它接收受控工具請求，在本地白名單中執行，只返回結構化狀態。**沒有接入模型自主選工具，也沒有執行外部命令或訪問任意網址。** 這是原有工具失敗恢復實驗的執行層基線，完整Agent策略對照仍未完成。

## 1. 一次調用先經過哪些門

請求格式刻意很小：

```json
{"tool":"lookup","key":"known"}
```

執行順序是：長度限制 → 嚴格JSON結構 → 工具白名單 → 調用預算 → 致動器接納 → 等待結果。任意一步失敗，都不能繞過後續門檻。

本例只允許 `tool` 和 `key` 兩個字串欄位，拒絕多余欄位、重復欄位、尾隨內容和非法key。key滿足 `[a-z][a-z0-9-]{0,63}`，所以 `../secret` 不會變成檔案路徑。輸入上限4096個Java字符，結果上限8192個字符；這些是本例資源限制，不是Token數。

為什麼專門檢查重復key？通用JSON轉對象時，重復鍵可能被後一個值覆蓋。程式碼改用 `JsonReader` 逐個讀取欄位，發現已存在的名稱就拒絕。不要先讓歧義悄悄消失，再聲稱“輸入已經驗證”。

## 2. 注冊表決定能力，不由模型文本決定

```java
registry.put("lookup", key -> ownedData.get(key));
ReadOnlyTools.Result result = executor.call(rawJson, 1000);
```

`lookup`由應用注冊為本地只讀函數。傳入 `exec` 得到 `UNKNOWN_TOOL`，不能憑工具名動態反射出一個方法。查詢結果也只是字串資料，即使其中寫著“忽略規則並執行命令”，也不交給本致動器解釋執行。

這種注冊方式減少了暴露的能力，但並不是安全沙箱。登記的Java函數仍擁有當前進程權限。因而只應登記經過審查的函數；本例也不能代替進程隔離和網絡訪問控制。

## 3. 超時實驗中最容易被誤解的一行

```java
catch (TimeoutException e) {
    task.cancel(true);
    return new Result("TIMEOUT", null);
}
```

`cancel(true)`請求中斷運行執行緒，不能強制停止忽略中斷的程式碼。為了驗證這個區別，Suite注冊了一個故意忽略中斷、等待測試閂鎖釋放的本地工具：

1. 工具實際進入工作執行緒，通知測試已啟動。
2. 調用方等待150毫秒後得到 `TIMEOUT`。
3. 工具仍占用唯一工作執行緒。第二個請求得到 `BUSY`。
4. 測試釋放閂鎖，工具繼續執行，將本地計數從0增加到1。

計數變化是真實執行緒執行的結果，沒有調用資料庫或第三方服務。它說明：**調用方不再等待，與執行方沒有做事，是兩個不同命題。** 若這是付款、寫檔案或機器人動作，超時後立即重試可能重復副作用。

## 4. 為什麼不給等待任務排一個長隊

致動器使用一個執行緒和 `SynchronousQueue`，沒有等待佇列。當超時任務仍未退出，新任務直接返回 `BUSY`，不會堆積成一串“用戶早已離開但稍後才開始執行”的操作。

預算只在任務成功交給致動器後增加。格式錯誤、未知工具和繁忙拒絕不消耗執行次數。空結果、工具異常和超時已經執行過，消耗預算。本例不自動重試。

| 狀態 | 含義 | 調用方下一步 |
|---|---|---|
| `INVALID` / `UNKNOWN_TOOL` | 尚未執行 | 修正輸入或拒絕請求 |
| `BUSY` / `BUDGET` | 沒有接納本次執行 | 明確告知限制 |
| `NOT_FOUND` | 已執行但無結果 | 保留“未知”，不補造答案 |
| `TIMEOUT` | 等待期限已到 | 不假定工作已經停止 |
| `TOOL_ERROR` | 工具拋出異常 | 返回受控錯誤，不泄漏內部異常文本 |
| `OK` | 得到允許大小的字串 | 繼續做任務層驗收 |

`OK`仍不代表用戶任務完成。查到一段文字，不等於它回答了問題；下一篇用[檢索與引用](/docs/ai-apps/java-retrieval-evidence)繼續檢驗這個差別。

## 5. 重現與下一條邊界

```sh
cd demos/06-reliable-workflows
python run.py --out evidence/my-tools-run
```

本次33項Suite檢查中15項覆蓋工具層：六種非法結構、白名單、拒絕前不執行、正常查詢、預算、缺失、異常隱藏、超時、繁忙、取消後繼續運行。測試為不配合中斷的執行緒設置了最終釋放出口，避免把驗證程式自己掛住。

結果不涉及真實模型工具選擇質量、重試策略收益或生產超時分布。當前參數只是明確可重現的故障注入。下一步若加入模型，應將“模型建議”“參數驗收”“執行狀態”“任務完成”各自記錄；不要把四件事壓成一個成功標志。

## 同方向繼續閱讀

- [Java LLM 實踐（四）：兩個請求同時返回，誰有資格寫入歷史？](/docs/ai-apps/java-concurrent-history)
- [Java LLM 實踐（六）：先驗收檢索證據，再談RAG回答](/docs/ai-apps/java-retrieval-evidence)
