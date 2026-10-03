---
title: "Java LLM 實踐（六）：先驗收檢索證據，再談RAG回答"
description: "10篇原創合成資料、14個固定問題，手寫BM25與引用邊界；保留詞匯失配和無答案題的誤命中。"
slug: "/ai-apps/java-retrieval-evidence"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 8
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:retrieval-eval", "project:hohoo-ai-lab", "doc:ai-apps/java-concurrent-history", "doc:ai-apps/java-tool-boundary"]
---

[固定版本程式碼](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows) · [原始記錄與審計](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows/evidence/20261003-reviewed) · [實驗檔案](/labs/retrieval-eval)

一個檢索Demo把前三段資料塞給模型，再看到一段流暢回答，很容易讓人覺得RAG已經完成。問題是：資料找對了嗎？真正放進請求的資料有哪些？引用是否來自這些資料？原資料里根本沒有答案時怎麼辦？

本篇先交付可以獨立運行的檢索與證據裝配層，沒有調用生成模型。原有RAG實驗仍保留為進行中，尚未完成“有檢索/無檢索”的模型回答對照。

## 1. 先把語料和問題固定下來

程式碼包含10篇自寫的英文運維說明，主題包括讀取超時、歷史提交、工具白名單、取消、結構化輸出、KV Cache、檢索、夾爪釋放、重試和密鑰保存。它們明確標記為合成教學資料，不是用戶文檔或生產知識庫。

問題共14個：12個標注了唯一相關文檔；2個故意沒有答案。其中一個是 `photosynthesis`，與語料沒有詞匯交集；另一個是 `cache payment`，雖然包含資料里的詞，卻沒有對應的完整答案。

這裡不根據測試結果修改查詢或補關鍵詞。否則“測完再把題改簡單”會讓結果失去解釋價值。

## 2. 用一個能手算的BM25基線

分詞僅將文本轉成小寫，按非英文字母/數字拆開。參數固定 `k1=1.2`、`b=0.75`：

```text
idf(t) = ln(1 + (N - df(t) + 0.5) / (df(t) + 0.5))
score(d,q) = Σ idf(t) × tf(t,d) × 2.2
             / (tf(t,d) + 1.2 × (0.25 + 0.75 × len(d)/avgLen))
```

查詢詞去重；分數大於0才進入候選；同分按文檔ID排序，保證重跑順序穩定。這不是中文分詞器，也沒有Embedding或重排模型。選擇簡單基線，是為了讓漏檢原因可以沿著詞項和公式檢查。

## 3. 真實結果沒有全對

| 統計對象 | 本次結果 | 可以說明什麼 |
|---|---|---|
| 12道有答案題，首位命中 | 11/12 | 本組問題的相關文檔首位覆蓋 |
| 同12題，前三位命中 | 11/12 | 增大到前三位沒有救回漏檢題 |
| 2道無答案題，仍返回候選 | 1/2 | 詞匯匹配不能證明問題可回答 |
| 生成回答正確率 | 未測量 | 沒有調用生成模型 |

漏檢題是 `conversation race`，標注的相關資料使用 `history / version / commit` 等表達，沒有查詢中的字面詞。它連候選集都沒進入，因此把top1改成top3沒有幫助。

`cache payment`則命中了不同文檔里的詞。它提醒我們，空列表可以觸發拒答，但非空列表不能自動授權回答。也不能從一個正分數推導“70%的可信度”。

這些問題與語料都很小、由同一作者構造，詞匯重疊較高。11/12是這組固定材料的觀察，不是某種檢索系統的總體能力。

## 4. 預算裁剪之後，再確定哪些引用有效

檢索到的資料不一定全部放得進上下文。`pack`按完整塊裝配，不從中間切斷文檔，同時返回實際納入的證據集合：

```java
Retrieval.Evidence evidence = Retrieval.pack(hits, 1000);
String context = evidence.text;
boolean allowed = evidence.cites("timeouts", "A read timeout");
```

容量按Java字串的UTF-16程式碼單元計算，不冒充Token預算。過大的塊被跳過；較小的後續塊仍可納入。若只能容納20個字符，測試中的資料整塊被省略，它的引用也必須被拒絕。

這是一個常見的邊界：不能用“檢索結果全集”校驗引用，卻把其中一部分裁掉後才發送給模型。校驗必須對準**本次實際提供的證據**。

## 5. 引用存在，只完成第一層檢查

本例要求文檔ID存在於已裝配集合中，且引用文字是非空的精確子串。偽造ID、偽造句子、引用被預算省略的文檔都被拒絕。

但它不會理解引用是否支持答案。例如“讀取超時不證明服務器未執行”確實在文檔里，模型卻回答“超時表示服務器一定沒執行”；即使引用文本是真實的，答案依舊相反。下一步需要獨立的蘊含/事實一致性驗收，不能把字串校驗當作語義驗證。

語料也可能包含命令式文本。檢索模塊只把它作為資料輸出，不給它工具權限。後續接入模型時，應在請求中清楚分隔系統指令與引用資料。

## 6. 重現、審計與後續實驗

```sh
cd demos/06-reliable-workflows
python run.py --out evidence/my-rag-run
python audit.py evidence/20261003-reviewed
```

Java Suite的10項檢索邊界檢查，加上Python獨立重算全部14題分數與排序，構成這次驗收。原始檔案保留每題查詢、gold、命中文檔、分數和top1/top3結果，不能只展示總分。

下一輪值得測試的是：固定同一問題集，加入明確版本的中文分詞或語義檢索，再比較候選召回變化；之後才在獲批預算內接入同一生成模型，檢查引用支持與回答正確性。當前不把這兩項未做的工作寫成成果。

## 同方向繼續閱讀

- [Java LLM 實踐（四）：兩個請求同時返回，誰有資格寫入歷史？](/docs/ai-apps/java-concurrent-history)
- [Java LLM 實踐（五）：工具超時了，為什麼任務還在執行？](/docs/ai-apps/java-tool-boundary)
