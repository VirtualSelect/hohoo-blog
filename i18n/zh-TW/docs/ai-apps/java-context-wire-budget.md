---
title: "Java 會話歷史與請求窗口：裁掉的舊事實還能回來嗎？"
description: "通過裁剪、提交、重啟和擴窗的連續實驗，分離可回看的完整歷史與一次模型請求的上下文。"
slug: "/ai-apps/java-context-wire-budget"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:java-context-wire-budget", "project:hohoo-ai-lab", "doc:ai-apps/java-transactional-history"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant) · [原始證據](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant/evidence/20261007) · [實驗檔案](/labs/java-context-wire-budget)

[事務式會話歷史](/docs/ai-apps/java-transactional-history)已經實現完整輪裁剪、UTF-8請求預算和失敗回滾。這篇不重新發明這些規則，而是追問一個產品問題：當裁剪後的候選歷史被提交後，用戶還能回看被裁掉的舊輪嗎？

舊方案把有界候選作為下一輪歷史，適合只需要短期會話窗口的應用。本篇選擇另一種語義：追加日志保存完整已確認問答，ContextBudget每次只生成請求投影。**“本次不發送”與“從記錄中刪除”不再是同一個動作。** 這不是後篇修復前篇，而是可回看需求改變了存儲邊界。

本篇實現一個可以直接閱讀的 ContextBudget：**保存完整歷史，只為本次請求選取連續的最近若干整輪。** 它約束的是序列化後 UTF-8 位元組，不宣稱知道 Agnes 的 Token 數。本輪沒有呼叫模型；模型欄位預留 agnes-3.0-flash。

## 從一個失敗的裁剪方式開始

~~~text
保存：  U1 A1 | U2 A2 | U3 A3
當前：  U4
逐消息：      A2 | U3 A3 | U4  ← A2失去所屬問題
整輪：           U3 A3 | U4
請求：  SYSTEM + 選中的完整輪 + 當前問題
~~~

歷史是一份可回看的記錄，請求上下文則是針對當前任務的投影。兩者不能共用一個會被 remove 操作破壞的列表。當前問題與系統約束是必需輸入：連它們都放不下時應明確拒絕，而不是悄悄切掉用戶的問題或安全約束。

## 預算必須量最終發出的東西

配套實現把 model 和 messages 一起構造為 Gson JSON，再編碼為 UTF-8。中文常常占多個位元組，換行和雙引號還涉及 JSON 轉義，Java String.length() 計數的是 UTF-16 單元，不能代替傳輸體積。

核心選擇器只有一個方向：從完整歷史開始，依次丟棄最早一輪，找到第一個可放下的連續後綴。這樣保留順序，且不會為了塞入較短舊輪而跳過較新的大輪。

~~~java
for (int start = 0; start <= history.size(); start++) {
    byte[] payload = request(system,
        history.subList(start, history.size()), current);
    if (payload.length <= maxBytes) {
        return new Selection(payload, history.size() - start, start);
    }
}
throw new IllegalArgumentException("mandatory input exceeds budget");
~~~

這里仍是教學規模算法：多次序列化會重復工作。長歷史可以維護每輪的編碼貢獻或二分搜索，但必須包含 JSON 分隔符及框架欄位，不能拿“每條文字的位元組數之和”冒充完整請求長度。本輪優先把邊界寫清楚，沒有測量這些優化。

## 實際得到什麼

固定材料包含英文、中文、引號、換行和 Emoji；原始用例在 Suite.java，結果在 results.json。

| 請求預算（位元組） | 保留歷史輪 | 丟棄歷史輪 | 最終請求位元組 |
| --- | --- | --- | --- |
| 140 | 0 | 2 | 140 |
| 235 | 1 | 1 | 235 |
| 308 | 2 | 0 | 308 |
| 408 | 2 | 0 | 308 |

139 位元組的預算被拒絕，因為必需輸入已經需要140位元組。原歷史仍是兩輪。這些數字屬于固定序列化樣本，不是平臺上下文容量，也不是建議給所有應用設置308位元組。

## 連續實驗：裁剪後提交，再重啟擴窗

ProjectionScenario.java把兩個組件接起來。首先持久保存兩輪：第一輪給出虛構項目代號ORCHID-17，第二輪說明Java 8。隨後把請求預算縮到只夠最近一輪，并用固定本地回答提交第三輪。關閉日志、重新打開，再擴大請求預算。

| 階段 | 實際請求 / 保存結果 | 能說明什麼 |
| --- | --- | --- |
| 縮小窗口 | 264位元組，只帶最近1輪，沒有ORCHID-17 | 舊事實確實沒有被發送 |
| 提交固定回答 | 磁盤保留完整3輪 | 不用裁剪結果覆蓋完整記錄 |
| 重開并擴窗 | 480位元組，帶3輪，ORCHID-17重新出現 | 早期事實能從保存記錄重新構造 |
| 必需輸入超限 | 拒絕請求，日志位元組前後相同 | 失敗的投影不污染已確認歷史 |

原始projection.json與conversation.log見[集成實驗記錄](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant/evidence/projection-20261007-verified)。這是本地固定材料，**只證明請求數據恢復，不證明模型在缺少舊事實的那輪仍能回答項目代號**。

~~~text
完整日志 U1 A1 | U2 A2
          ↓ 投影（不改日志）
本次請求 SYSTEM | U2 A2 | U3
          ↓ 完整回答提交
完整日志 U1 A1 | U2 A2 | U3 A3
          ↓ 重開 + 擴窗
下次請求 SYSTEM | U1 A1 | U2 A2 | U3 A3 | U4
~~~

這個拆分也有代價：完整日志占磁盤，且“用戶刪除歷史”必須刪除保存記錄，不能僅把它藏出請求。示例限4MiB并拒絕超限；壓縮、保留期限、用戶刪除與跨設備同步都尚未實現，不稱為完整助手產品。

首次集成驗證曾在Windows持有獨占檔案鎖時另開讀取句柄，核對程序因此失敗。修正為關閉擁有者後核對檔案位元組，再重新打開繼續驗證，未通過繞開鎖改變日志實現。

## 產品取舍：少傳不等于少保存

最近輪優先適合普通聊天，但未必保住用戶早期給出的重要事實。固定系統約束、長期記憶和檢索證據應有獨立來源與預算；本例沒有自動摘要，也沒有實驗支持“裁剪後模型仍記得關鍵事實”。

如果服務提供 Tokenizer 或明確的 Token 計數接口，應另做模型級檢查，并為輸出預留空間。傳輸預算解決請求大小，Token 預算解決上下文窗口，不能互相代替。

## 動手檢驗

把第二輪改成長段中文，并把預算設成“必需輸入加第一輪剛好能放下”的大小。預期：最新一輪放不下時，選擇器會最終只保留必需輸入，不回頭拼接第一輪。然後把當前問題改長，觀察必需輸入超限的顯式失敗。

排錯時先打印 payload.length 和保留/丟棄輪數，別在正式日志輸出完整聊天或 API Key。若順序出錯，檢查是否把答案作為獨立消息裁剪；若位元組不符，檢查是否測量了實際 JSON 編碼。

本篇是請求構造組件，尚無登錄、跨設備記憶或線上質量結論。下一篇討論預算之外的另一個邊界：[一次請求最多能等多久](/docs/ai-apps/java-retry-deadline)。

## 從干凈目錄復現

需要 Java 8、Python 3、Gson 2.10.1。請將兩個路徑替換為自己的 JDK 和 jar；既有工程可復用 Maven 快取。

~~~sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 02a2660e22c969e70e3a6f095003614a7dfa448e
python demos/11-bounded-assistant/run.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out outputs/my-run
python demos/11-bounded-assistant/audit.py outputs/my-run
python demos/11-bounded-assistant/projection.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out outputs/projection
python demos/11-bounded-assistant/projection.py --audit --out outputs/projection
~~~

輸出目錄必須不存在。本機驗證環境為 Windows，Linux/macOS尚未復測。不需要模型密鑰或付費服務。manifest中的程式碼凍結提交早于上方含證據的歸檔提交，源碼哈希對應實際執行檔案。
