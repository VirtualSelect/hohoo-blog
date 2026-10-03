---
title: "Java LLM 实践（六）：先验收检索证据，再谈RAG回答"
description: "10篇原创合成资料、14个固定问题，手写BM25与引用边界；保留词汇失配和无答案题的误命中。"
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

[固定版本代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows) · [原始记录与审计](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows/evidence/20261003-reviewed) · [实验档案](/labs/retrieval-eval)

一个检索Demo把前三段资料塞给模型，再看到一段流畅回答，很容易让人觉得RAG已经完成。问题是：资料找对了吗？真正放进请求的资料有哪些？引用是否来自这些资料？原资料里根本没有答案时怎么办？

本篇先交付可以独立运行的检索与证据装配层，没有调用生成模型。原有RAG实验仍保留为进行中，尚未完成“有检索/无检索”的模型回答对照。

## 1. 先把语料和问题固定下来

代码包含10篇自写的英文运维说明，主题包括读取超时、历史提交、工具白名单、取消、结构化输出、KV Cache、检索、夹爪释放、重试和密钥保存。它们明确标记为合成教学资料，不是用户文档或生产知识库。

问题共14个：12个标注了唯一相关文档；2个故意没有答案。其中一个是 `photosynthesis`，与语料没有词汇交集；另一个是 `cache payment`，虽然包含资料里的词，却没有对应的完整答案。

这里不根据测试结果修改查询或补关键词。否则“测完再把题改简单”会让结果失去解释价值。

## 2. 用一个能手算的BM25基线

分词仅将文本转成小写，按非英文字母/数字拆开。参数固定 `k1=1.2`、`b=0.75`：

```text
idf(t) = ln(1 + (N - df(t) + 0.5) / (df(t) + 0.5))
score(d,q) = Σ idf(t) × tf(t,d) × 2.2
             / (tf(t,d) + 1.2 × (0.25 + 0.75 × len(d)/avgLen))
```

查询词去重；分数大于0才进入候选；同分按文档ID排序，保证重跑顺序稳定。这不是中文分词器，也没有Embedding或重排模型。选择简单基线，是为了让漏检原因可以沿着词项和公式检查。

## 3. 真实结果没有全对

| 统计对象 | 本次结果 | 可以说明什么 |
|---|---|---|
| 12道有答案题，首位命中 | 11/12 | 本组问题的相关文档首位覆盖 |
| 同12题，前三位命中 | 11/12 | 增大到前三位没有救回漏检题 |
| 2道无答案题，仍返回候选 | 1/2 | 词汇匹配不能证明问题可回答 |
| 生成回答正确率 | 未测量 | 没有调用生成模型 |

漏检题是 `conversation race`，标注的相关资料使用 `history / version / commit` 等表达，没有查询中的字面词。它连候选集都没进入，因此把top1改成top3没有帮助。

`cache payment`则命中了不同文档里的词。它提醒我们，空列表可以触发拒答，但非空列表不能自动授权回答。也不能从一个正分数推导“70%的可信度”。

这些问题与语料都很小、由同一作者构造，词汇重叠较高。11/12是这组固定材料的观察，不是某种检索系统的总体能力。

## 4. 预算裁剪之后，再确定哪些引用有效

检索到的资料不一定全部放得进上下文。`pack`按完整块装配，不从中间切断文档，同时返回实际纳入的证据集合：

```java
Retrieval.Evidence evidence = Retrieval.pack(hits, 1000);
String context = evidence.text;
boolean allowed = evidence.cites("timeouts", "A read timeout");
```

容量按Java字符串的UTF-16代码单元计算，不冒充Token预算。过大的块被跳过；较小的后续块仍可纳入。若只能容纳20个字符，测试中的资料整块被省略，它的引用也必须被拒绝。

这是一个常见的边界：不能用“检索结果全集”校验引用，却把其中一部分裁掉后才发送给模型。校验必须对准**本次实际提供的证据**。

## 5. 引用存在，只完成第一层检查

本例要求文档ID存在于已装配集合中，且引用文字是非空的精确子串。伪造ID、伪造句子、引用被预算省略的文档都被拒绝。

但它不会理解引用是否支持答案。例如“读取超时不证明服务器未执行”确实在文档里，模型却回答“超时表示服务器一定没执行”；即使引用文本是真实的，答案依旧相反。下一步需要独立的蕴含/事实一致性验收，不能把字符串校验当作语义验证。

语料也可能包含命令式文本。检索模块只把它作为资料输出，不给它工具权限。后续接入模型时，应在请求中清楚分隔系统指令与引用资料。

## 6. 复现、审计与后续实验

```sh
cd demos/06-reliable-workflows
python run.py --out evidence/my-rag-run
python audit.py evidence/20261003-reviewed
```

Java Suite的10项检索边界检查，加上Python独立重算全部14题分数与排序，构成这次验收。原始文件保留每题查询、gold、命中文档、分数和top1/top3结果，不能只展示总分。

下一轮值得测试的是：固定同一问题集，加入明确版本的中文分词或语义检索，再比较候选召回变化；之后才在获批预算内接入同一生成模型，检查引用支持与回答正确性。当前不把这两项未做的工作写成成果。

## 同方向继续阅读

- [Java LLM 实践（四）：两个请求同时返回，谁有资格写入历史？](/docs/ai-apps/java-concurrent-history)
- [Java LLM 实践（五）：工具超时了，为什么任务还在执行？](/docs/ai-apps/java-tool-boundary)
