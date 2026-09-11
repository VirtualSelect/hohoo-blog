# 论文导读与实验关联

`data/papers.json` 是论文卡片的唯一内容来源。首批为基础论文，不作为“最新资讯”或个人研究成果发布。方法和证据基于指定 arXiv 版本的摘要；阅读边界和追问是编辑提示，不能表述为作者原文或本站实验结果。

- RAG: https://arxiv.org/abs/2005.11401v4
- ReAct: https://arxiv.org/abs/2210.03629v3
- RT-2: https://arxiv.org/abs/2307.15818v1

新增条目需填写稳定的 `paper:<arxiv编号>` ID、唯一 slug、研究分类、指定版本链接和两种语言的阅读提示。`data/experiments.json` 的项目关联必须双向一致。实验提案统一在实验室标为计划中；实际开始后再补充代码、环境、测量方式与结果，不能仅因添加卡片而声称复现。

论文沿用当前浏览器阅读收藏，不迁移或覆盖原有资讯 ID。专题页和实验室都链接到同一张卡片。验证：`node --test tests/papers.test.mjs tests/reading-state.test.mjs`，随后运行双语构建检查站内链接。

自动翻译本轮暂缓：没有修改采集翻译开关或配置模型接口。
