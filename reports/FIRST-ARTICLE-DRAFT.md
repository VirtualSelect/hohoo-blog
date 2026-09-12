# 第一篇实践文章初稿

## 发布更新 · 2026-09-12

作者审阅通过并明确要求正式发布。已移除 unlisted，设置 published、真实发布日期、预计阅读 15 分钟与 first-call 学习节点；更新项目文章入口和 Now。下文为初稿阶段的历史验收记录，不代表当前发布状态。

## 基线与范围

开始修改前 fetch origin/main，确认本地主干与远端均为 `6460390f6460dfa8f465e55670f4d53bde93a646`。保留用户已有 pnpm-lock.yaml、yarn.lock，不修改包管理器或当前视觉体系。

## 内容与展示

- 文章：`/docs/ai-apps/java-first-llm`，初稿、unlisted，noindex，不进入 sitemap、Latest 或已发布学习路线。英文路径沿用中文初稿，不虚构译文。
- 项目：`/projects/hohoo-ai-lab`，状态 building；作为一个实践集，三个 Demo 为内部阶段。
- 首页：现有 Featured Builds 下增加轻量项目行；项目页：代码与配套阅读列表；文章：原生 TOC、代码块、结果表与学习总结。
- 已确认公开 GitHub 仓库与提交 `845fa9f18475b77e761806d14565612680ba6fe1`；文章与项目的 Demo 链接固定到该版本。
- 数据来自用户实际运行反馈：首次 Java 293/104/397；解析 293/157/450；控制台输入 299/246/545；多轮 285/60/345、318/75/393、368/81/449。不作为 Benchmark、计费承诺或性能提升证据。

## 改动文件

- docs/ai-apps/java-first-llm.md
- data/projects.json
- src/components/HomeProjects.js
- src/components/ProjectEvidence.js
- docs/CONTENT-MODEL.md
- 本报告

## 验证

- 现有 38 项测试通过。
- 中英文生产构建通过；初稿不在 sitemap，输出含 noindex。
- 6 个页面 × 6 种宽度 × 深浅主题，共 72 次检查，无横向页面溢出和浏览器异常。原始结果：`.cache-loader/verification/first-article.json`。
- 已查看手机文章浅色与项目深色截图。复用现有响应式 rows、原生代码块和移动 TOC，无新增 CSS 或运行依赖。

## 边界与下一步

本轮没有提交、推送或部署，没有新增真实模型调用。文章仍待作者审阅，项目没有标记 production。正式发布时审阅正文与代码版本，移除 unlisted，填写真实发布日期与预计阅读时间，关联 first-call 学习节点；本轮不自动执行发布。
