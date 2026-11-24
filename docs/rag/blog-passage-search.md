---
title: "博客里搜到一句话，为什么还不能当作答案？"
description: "用本站中文正文实现可追溯段落检索，沿着一个真实误命中解释分词、排序、引用和验收边界。"
slug: "/rag/blog-passage-search"
status: "published"
published_at: "2026-11-11"
updated: "2026-11-24"
domain: "rag"
article_kind: "case-study"
difficulty: "intermediate"
reading_minutes: 8
related: ["doc:ai-apps/java-retrieval-evidence", "doc:ai-apps/java-grounded-claims", "lab:retrieval-eval", "project:hohoo-blog", "project:hohoo-ai-lab"]
---

在v1冻结验收中输入 `缓存 保证成功`，前五个候选中出现了一篇会话并发文章。命中的文字讲的是“响应验证成功才提交”，并没有回答缓存能否保证成功。

这不是页面没有加载，也不是来源链接失效。**检索确实找到了文字，却没有找到问题所要求的依据。** 这个反例比“搜索框能返回结果”更能说明原型还缺什么。

打开全站搜索，选择“正文段落”，输入文章里的关键词就能查看原文小节。[博客项目](/projects/hohoo-blog)保存这套搜索的实现与验收脚本；[检索质量实验](/labs/retrieval-eval)记录此前的 Java 检索与引文校验。本文由 AI 辅助整理，问题的相关性标注待作者复核。

## “保证成功”和“验证成功”共享了什么

中文没有天然的空格分词边界。这个轻量基线把连续汉字拆成相邻双字：

```js
import { searchTerms } from "./apps/web/lib/section-search.mjs";
console.log(searchTerms("保证成功")); // 保证、证成、成功
console.log(searchTerms("验证成功")); // 验证、证成、成功
```

两组共享“证成”和“成功”。查询允许部分词项匹配，因此即使候选没有谈到缓存，也可能获得分数。“证成”在这里还是跨词边界产生的字符组合，并不是作者想检索的概念。

排序使用词频、词项在语料中的普遍程度和段落长度；文章标题只提供较低权重，正文或小节标题必须实际命中。这些规则能够排出一个顺序，不能理解“保证”的断言，也不能判断段落是否支持它。直接给第一名贴上“答案”或把分数转成“可信度”，都会把词汇匹配夸大成另一种能力。

## 先保证每段话都能回到原文

段落来自本站已经发表的教程与随笔。构建器读取清理后的文章HTML，沿用页面实际使用的二级、三级标题锚点，不另造一套标题ID。较短的相邻段落在同一小节内合并；单块最多900字符。代码块、表格、资讯、计划和缺失语言的回退正文不进入这个索引。

为什么合并？单独检索到“读取超时90秒”容易丢掉后面那句“不是整个请求的总时限”。合并能保留一些相邻解释，但900字符上限仍可能切断更长的论证。它是有边界的取舍，不保证所有答案都完整落在一个块里。

本地复查还发现了一种实际丢失：缓存文章的折叠练习原题是“864 行降到 432 行，能否说快了 50%？”，旧提取器只取`p/li`，跳过`summary`，却把解答“不能”拼到前一段后面。即使引用文字来自原文，这样的摘录也缺少回答对象。

现在由已有HTML解析器保留“原题＋解答”，与折叠区外的文字分开；长解答需要分块时，每块重复原题，连同原题最多900字符。搜索结果单列原题，复制引用也包含它。这里修正的是提取边界，没有改写原题、生成新答案或证明检索已经能理解否定。原v1语料与成绩保留，当前索引另做回归。

早期原型用数组位置生成段落编号：前面增加一篇文章，后面的编号都会改变。现在用以下输入生成内容相关的标识：

```text
段落ID = 文档ID + SHA-256(原文小节地址 + 换行 + 完整段落)的前20位
内容指纹 = SHA-256(完整段落)
```

增加无关文章不再改变这个ID；修改段落会产生新ID。**位置和文本一致性不等于事实正确性**，指纹只回答“是不是这一版摘录”。

## 复制引用时，保留完整段落和版本

结果列表只显示短摘录；“复制引用”保留完整段落、文章与小节、正式来源地址、带哈希的索引快照地址和完整内容指纹。复制失败时显示可选中的文本，不把失败伪装成“已复制”。

来源链接指向原文小节，内容指纹用于核对摘录是否改变。后续构建可能清理旧的索引快照；如需长期引用，请同时保存段落文字和指纹。

浏览器只在切换到正文模式时加载当前语言索引；问题不发送给模型，也不上传给第三方。英文与繁体使用各自的正文，缺少翻译时不悄悄混入中文。

## 在固定版本上复现验收

在博客仓库根目录运行以下命令。首次使用时按两个锁文件安装依赖；已经安装时可从生成内容的命令开始。

```powershell
npm ci
npm ci --prefix apps/web
npm run prepare:content --prefix apps/web
npm run search:evaluate --prefix apps/web
```

v1 归档记录使用 Windows 和 Node.js 26.8.2。命令会重算 `reports/section-search-evaluation-v1.json`；可用[固定版本的报告](https://github.com/VirtualSelect/hohoo-blog/blob/d0e650ef1198fe39743badd671f6a308dbc1b49f/reports/section-search-evaluation-v1.json)核对每个问题的候选、标注引文、排名与指纹。

协议在`apps/web/tests/fixtures/section-search-protocol.json`，快照在同目录的`section-search-snapshot.json`。原始513块文本保存在`section-search-corpus-v1.json`，已逐字核对到原语料指纹；正文后续修订不覆盖这份测试语料。默认命令重跑原问题、算法和冻结语料，发现版本不一致就停止，不能静默沿用旧结论。本篇被排除，避免把解释验收问题的文章重新当作检索答案。

检查当前正文可另执行`node apps/web/scripts/evaluate-section-search.mjs --live`，输出`reports/section-search-evaluation-current.json`。它沿用同一组开发问题，但使用当前语料，是开发回归，不是新的独立评测，也不覆盖v1结果。测试语料不进入网站的公开索引或客户端脚本。

找不到索引时先执行内容生成；出现快照不一致时先检查源码、问题和语料版本。不要为了跑绿而覆盖v1快照。新条件应使用新版本协议，保留旧记录。

## 这12个问题实际说明了什么

冻结语料包含61篇教程与随笔、513个段落块。8个问题指定相关小节和必须出现的原文引句；另外4个问题标为没有可支持的答案。标签由AI整理，尚未经过作者独立复核。

实际运行中，8个有依据的问题均在前5个候选中找到指定段落，且都排在第一。这个结果并不令人意外：查询刻意贴近原文词汇，算法也已经用其他开发示例调整过。它只说明这些工程验收条件成立，**不能当作真实读者问题的准确率，更不是独立保留集成绩**。

4个无答案问题中，3个返回空列表；`缓存 保证成功` 仍返回5个候选。原始记录保留了这次误命中，没有提高阈值后重新挑选好看的结果。检索器返回候选本身不是生成了错误回答；它暴露的是：后续问答层不能把“有候选”当作“有足够依据”。

## v2 对照：多一道词项过滤，会漏掉什么？

另取 20 道简体中文问题，沿用 v1 冻结的 513 个段落。12 题有标注引文，8 题在语料中缺少依据。问题和规则在比较前确定，标签由 AI 对照归档引文整理，待作者复核。

| 在同一批候选上比较 | 有依据题：前 5 名找到标注段落 | 无依据题：返回了候选 |
| --- | --- | --- |
| 原检索排序 | 8/12 | 5/8 |
| 要求小节标题或正文覆盖至少一半的不同查询词项 | 0/12 | 0/8 |

例如 `lexical-gap` 用另一种说法询问为什么扩大候选数仍找不到并发文档，原排序的前五名就漏了标注段落。加上覆盖门槛后，原本会返回候选的五道无依据题都回到了空列表，原本命中的八道有依据题也全部丢失。因此本站保留原排序。这里衡量的是能否找回一段指定文字，生成回答的正确性仍待单独评估。

在仓库根目录运行 `node apps/web/scripts/compare-section-search.mjs`，标准输出可与仓库中的 `reports/section-search-comparison-v2.json` 逐题核对。

## 自己改出一个反例

先保留原排序规则，在博客仓库根目录的 PowerShell 执行下面的代码。它直接读取 v1 的问题和简体中文冻结语料，不写入报告，也不需要模型或构建索引。当前文章内容或搜索语言不同，结果可能随之改变。

```powershell
@'
import fs from "node:fs";
import { searchTerms, createSectionSearcher } from "./apps/web/lib/section-search.mjs";
const root = "apps/web/tests/fixtures/";
const read = (name) => JSON.parse(fs.readFileSync(root + name, "utf8"));
const protocol = read("section-search-protocol.json");
const corpus = read("section-search-corpus-v1.json");
const query = protocol.questions.find((q) => q.id === "absent-guarantee").query;
const queryTerms = [...new Set(searchTerms(query))];
const results = createSectionSearcher(corpus)(query, protocol.topK);
console.log(JSON.stringify({
  query,
  queryTerms,
  firstTwo: results.slice(0, 2).map((p) => {
    const present = new Set(searchTerms(p.heading + " " + p.text));
    return {
      id: p.id,
      href: p.href,
      matched: queryTerms.filter((term) => present.has(term)),
      missing: queryTerms.filter((term) => !present.has(term)),
    };
  }),
}, null, 2));
'@ | node --input-type=module
```

预期`queryTerms`是`缓存、保证、证成、成功`，前两个候选保留以下差异：

| 冻结候选 | 小节标题或正文中重合的词项 |
| --- | --- |
| [会话并发文章开头](/docs/ai-apps/java-concurrent-history) | 证成、成功 |
| [滑动缓存的三个索引](/docs/llm/sliding-cache-positions#5-三个索引不要挤成一个变量) | 缓存、保证 |

第一行的“响应验证成功才提交”在说会话提交，不是在说缓存。第二行的“不保证其他架构具有相同性质”是在限定范围，不能删去“不”或换成成功保证。

这两行都有两个词项重合，第二行甚至有“缓存”，仍不能支持原问题。`matched`只计算查询与小节标题/正文的词项交集，不是评分公式的逐项贡献，也不包含文章标题；标题加权、词频和长度仍会影响排名。**缺词可以提醒你检查，词齐全也不能替你判断语义。**

自检时先说清每条原句允许得出的结论，再写一句它不能支持的扩大说法。如果程序没有输出预期差异，先确认当前目录、冻结文件和算法指纹；别用当前索引替换旧语料。

若要求查询词全部齐全，这两条都会被删掉，但规则仍不能识别否定。可以构造一个教学句子：“缓存不能保证成功。”它含有全部四个查询词，含义却恰好是否定保证。这个句子只用于检查推理，不进入v1语料或成绩。

先在正文搜索里试一组原文关键词，再换成表达相同意思但用词不同的问题。比较返回的小节，而不是只数结果多少；这是探索，不纳入v1成绩。随后选一条引用，删掉限定条件，观察同一段文字为什么可能支持局部判断，却不能支持扩大后的说法。

若要继续研究分块，应先独立标注哪些段落真的支持问题，再冻结问题、分词器和检索器，只改变分块方式。若要研究问答，还需要回答生成、资料不足时的处理和引用支持验收。这些仍是[RAG后续路线](/learning?track=rag)中的计划。

回到[Java LLM 实践集](/projects/hohoo-ai-lab)，可以对照前两步的代码：先[复算候选排序](/docs/ai-apps/java-retrieval-evidence)，再[查清引文支持哪个配置字段](/docs/ai-apps/java-grounded-claims)。
