# 正文检索 v2 人工复核清单

**状态：AI 已核对冻结记录，待作者盲审。** 简体中文语料共 513 段，v2 有 12 道有据题、8 道无据题。原排序在前五命中 8 道有据题，5 道无据题仍有候选。本页只列这 9 道待查题。题目与指定引文见[冻结题单](../apps/web/tests/fixtures/section-search-comparison-v2.json)，前五结果见[逐题报告](section-search-comparison-v2.json)。

## 怎样进行盲审

1. **独立判读。** 协作者只提供问题和打乱顺序的匿名段落，混入正常命中的对照题。先遮住下表、预期标签、排名及检索方式。作者逐段选「足以回答／只能解释边界／无关」，抄下支持判断的一句及适用条件。初判锁定后，对判为无据的题补查冻结合集，记录遗漏的段落或核查范围。
2. **对照归档。** 揭开下表和原报告。作者为每题记录「保留原标注／新增可接受段落／修订题目／暂缓」及理由、日期。有分歧时另存新版本，保留 v2 的题目、引文及分数。下表的待判项尚无人填写。

## 四道指定证据漏检题

用[冻结检索器](../apps/web/lib/section-search.mjs)对相同语料运行 `search(query, Infinity)`，下表计数为每文最多两段之后的完整候选数。另在内存中将每段视为独立文档，仅解除这个名额限制，词项、分数和排序规则相同。由此得到的第 25、16 名仅用于定位原因。四个指定段落均未进入正式完整候选，没有一个只是排在正式第六名以后。

| 题目 | 归档依据与实际首候选 | AI 初查与作者待判项 |
| --- | --- | --- |
| `lexical-gap` 为什么扩到前三名也找不到描述并发冲突的那篇文档？ | [检索证据 §3][lex]记有 `conversation race` 与 `history / version / commit` 的措辞差异。完整候选 **0**。 | 指定段落仅匹配 22 个查询词项中的 1 个。待判：题干应保留这组口语改写，还是需点明是在问文中那次实验？ |
| `group-size-cost` 缩短 KV 量化组长，为什么 scale 数组反而更大？ | [分组打包「方向与长度」][group]说明每组需要自己的 scale。首条是 [int8 量化导言][int8]，完整候选 **43**。 | 指定段落在单文名额前排第 25，同文其他两段占了正式第 4、6 名。待判：第 4 名明确组长 8 用更多空间，是否还足以解释 scale 数量变化？ |
| `flagged-stale-samples` 一直收到内容正常的旧包，机械臂监测器为什么还是报警？ | [观测新鲜度 §1][stale]区分观测过期与接触异常。首条是[同篇导言][fresh]，完整候选 **15**。 | 指定段落匹配 4/22 个词项，低于 20% 门槛。导言已说捕获时间暴露了旧证据。待判：导言能否独立回答，是否应列作第二条可接受证据？ |
| `check-in-silence` 传感器长时间没有发消息，监测器在哪里检查观测过期？ | [观测新鲜度 §2][silence]明确在每个控制步执行。首条是[同篇导言][fresh]，完整候选 **13**。 | 指定段落在单文名额前排第 16，同文导言与 §3 占了正式第 1、2 名。待判：回答是否必须指出执行位置？只说「检查捕获时间」是否足够？ |

## 五道无据但有候选的题

五题的冻结标注均为 `expected: []`。表中链接打开当时排名第一的原段落，括号为正式完整候选数。请分别判断原文能否回答提问、能否解释证据边界。

| 题目 | 实际首候选与 AI 初查 | 作者待判项 |
| --- | --- | --- |
| `absent-payment-deployment` payments 的 prod-v2 配置在真实生产部署的访问域名是什么？ | [引用契约 §1][payment]（7）限定为四份教学合成配置，只校核超时与重试。 | 归档中可否找到真实部署域名及其一手记录？ |
| `absent-hardware-safety` 把 MuJoCo 的 60ms 阈值用于真实机械臂，通过了哪项硬件安全认证？ | [新鲜度 §8][hardware]（9）报告仿真审计，并明确限定审计范围。 | 该段是否应保留为澄清边界的材料？有无可识别的硬件认证？ |
| `absent-packed-benchmark` 4-bit KV 缓存在 RTX 4090 上跑 32K 上下文的吞吐量是多少？ | [Mac mini 的 KV 容量算例][bench]（15）估算字节占用，正文没有目标 GPU 的吞吐实测。 | 有无同时匹配显卡、位宽、上下文与吞吐单位的测量？ |
| `absent-answer-quality` 本站的在线 RAG 问答在人类盲测中的回答准确率是多少？ | [引用契约 §4][quality]（2）报告 22 个定向程序案例，列明没有运行在线问答对照。 | 是否只支持说明测试分母？有无独立的人类盲测结果？ |
| `absent-calibration` 现场夹爪力传感器的校准证书编号是什么？ | [抓取门控 §8][calibration]（4）讲模拟器观测，力传感器属于真机讨论。 | 是否出现实际设备、校准记录与编号？只提及传感器能支持什么？ |

## 下一批留出题

从尚未用于 v1/v2 的小节选题，覆盖 AI 应用、LLM、具身实验。有据题兼顾口语改写、执行位置、测量条件；无据题可只改变一项条件，例如把仿真换成真机。由出题者先记录可接受原句或欠缺的关键资料，再交另一人匿名复核。冻结题目、语料指纹和判分规则后才运行基线；调参期间不使用留出题。

分开列出三个分数及分母：有据题前五命中数／有据题数，无据题仍有候选数／无据题数，以及无据题首候选能明确解释证据边界数／有首候选的无据题数。最后一项由人工判读。另列漏检发生在词项门槛、单文名额还是前五截断；这些是段落检索观察，回答质量需要另行测量。

[lex]: https://github.com/VirtualSelect/hohoo-blog/blob/d0e650ef1198fe39743badd671f6a308dbc1b49f/apps/web/tests/fixtures/section-search-corpus-v1.json#L795
[group]: https://github.com/VirtualSelect/hohoo-blog/blob/d0e650ef1198fe39743badd671f6a308dbc1b49f/apps/web/tests/fixtures/section-search-corpus-v1.json#L4788
[int8]: https://github.com/VirtualSelect/hohoo-blog/blob/d0e650ef1198fe39743badd671f6a308dbc1b49f/apps/web/tests/fixtures/section-search-corpus-v1.json#L4689
[stale]: https://github.com/VirtualSelect/hohoo-blog/blob/d0e650ef1198fe39743badd671f6a308dbc1b49f/apps/web/tests/fixtures/section-search-corpus-v1.json#L2566
[fresh]: https://github.com/VirtualSelect/hohoo-blog/blob/d0e650ef1198fe39743badd671f6a308dbc1b49f/apps/web/tests/fixtures/section-search-corpus-v1.json#L2555
[silence]: https://github.com/VirtualSelect/hohoo-blog/blob/d0e650ef1198fe39743badd671f6a308dbc1b49f/apps/web/tests/fixtures/section-search-corpus-v1.json#L2577
[payment]: https://github.com/VirtualSelect/hohoo-blog/blob/d0e650ef1198fe39743badd671f6a308dbc1b49f/apps/web/tests/fixtures/section-search-corpus-v1.json#L454
[hardware]: https://github.com/VirtualSelect/hohoo-blog/blob/d0e650ef1198fe39743badd671f6a308dbc1b49f/apps/web/tests/fixtures/section-search-corpus-v1.json#L2643
[bench]: https://github.com/VirtualSelect/hohoo-blog/blob/d0e650ef1198fe39743badd671f6a308dbc1b49f/apps/web/tests/fixtures/section-search-corpus-v1.json#L5577
[quality]: https://github.com/VirtualSelect/hohoo-blog/blob/d0e650ef1198fe39743badd671f6a308dbc1b49f/apps/web/tests/fixtures/section-search-corpus-v1.json#L487
[calibration]: https://github.com/VirtualSelect/hohoo-blog/blob/d0e650ef1198fe39743badd671f6a308dbc1b49f/apps/web/tests/fixtures/section-search-corpus-v1.json#L2467
