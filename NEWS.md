# AI 资讯采集与自动发布

## 当前流程

每天北京时间约 08:35、12:35、16:35、20:35（GitHub 调度可能延迟）执行：RSS → 研究相关性筛选 → 去重与限量 → 数据校验 → 三语构建 → 自动提交默认分支。多次运行共用原有每日额度，不按每次运行增加额度。规则检查不是独立事实核验，摘要保留来源归属。自动翻译暂时关闭，不需要模型密钥。

Actions 摘要显示运行时间、各来源读取状态、筛选前候选数、相关性拒绝数与最终新增数。没有新增不等于没有执行；先检查当天运行记录，再查看摘要和报告。每天多次调度提供补偿机会，但不保证准点启动。

每天最多 5 条，AIHOT 优先且最多 4 条，其他来源各最多 2 条。仅考虑近 14 天且日期有效的条目。AIHOT 是聚合来源，条目链接通往其阅读页与原始出处；日期是 Feed 提供的日期。相同事件不同链接可能未被识别，当前仅做 URL 与标题去重。

主题规则在 scripts/news/relevance.mjs；来源配置在 config/news-sources.json。泛商业与不相关领域内容不收录，不凑数量。所有来源失败时任务失败；部分来源失败时继续其他来源。单源重试与超时保持不变。

工程方法也作为技术证据：上下文工程／harness 必须同时有预算、卸载、压缩等具体机制；OCR 必须同时有分步解析方法及检索或按相关页面处理的证据。仅出现 Agent 或产品名称不会放行。页面按来源原始发布时间排序，补采时间不替换发布日期。

## 发布与暂停

工作流名为 Collect and publish AI news。默认启用，设置仓库变量 NEWS_ENABLED=false 可暂停。修改采集脚本、来源配置或工作流并推送 main 时也会触发一次。

自动提交只允许 data/news/items.json 与 src/pages/news/daily/*.md。没有新内容不提交；构建失败不提交；普通 git push 遇到远端新提交会失败，下次重跑重新采集和验证，不强推、不改分支保护。如果仓库保护规则禁止机器人直推，需要改用符合仓库规则的发布方式。

旧的草稿 PR 不再阻塞新采集，但不会由工作流合并或删除。避免再合并包含过期完整 items.json 的旧分支；先同步默认分支核对数据。采集报告作为 Actions artifact 保留 30 天。

## 本地检查

Node.js 22；安装使用 npm ci。

- npm run news:collect：只写入 .cache-loader/news-preview，正式数据不变。
- node scripts/news/collect.mjs --write：生成正式内容文件。
- npm run news:render：编辑数据后同步日报。
- npm run news:check：校验数据和日报一致性。
- npm run news:reject -- <id>：移除条目并将 URL 加入 blockedUrls；提交数据、配置和日报后生效。
- npm run build：构建双语站点。

报告 .cache-loader/news-report.json 记录源状态、排除原因和选中条目。.cache-loader/news-pr.md 是兼容旧文件名的运行摘要，不再创建 PR。

## RSS 与收藏

/subscribe 提供原创 /blog/rss.xml 和资讯 /news/rss.xml，英文对应 /en/ 路径。资讯 Feed 包含最近 100 条已发布条目，使用稳定 ID，保留来源摘录和链接；由站点构建生成，与网页同时更新。

资讯和论文可收藏到 /reading。数据仅保存在当前浏览器，中英文共用；浏览器存储不可用时回退内存。规划选题仍在 /learning 使用独立清单。

## 后续可选翻译

双语字段与本地 news:translate 命令仍保留，自动工作流不调用。恢复时需明确开启 NEWS_SUMMARIZE，并配置 NEWS_LLM_URL、NEWS_LLM_MODEL 与 Secret NEWS_LLM_API_KEY；禁止将密钥写入仓库。模型输出必须符合双语字段与长度限制。

## 来源说明

AIHOT RSS 接入说明：https://aihot.news/agent?tab=rss 。保留用户指定 actor 参数，不启用全文订阅。首批清理记录在 archive/news；论文资料说明见 PAPERS.md。
