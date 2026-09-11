# AI 资讯采集与审核

本功能将官方 RSS/Atom 转成独立资讯板块 `/news` 和 `/news/daily/YYYY-MM-DD` 日报。采集脚本只读取订阅源，**不抓取全文、不自动合并 PR**。资讯不会进入个人学习时间轴。

## 当前默认值

- 主要来源：AIHOT 中文聚合摘要；补充来源：Hugging Face、Google DeepMind、OpenAI。
- 每天北京时间约 08:35 运行一次（GitHub 调度可能延迟）。
- 最多 5 条/UTC 自然日，优先 AIHOT 最多 4 条，补充来源各最多 2 条；同日重复运行仍受总量限制。
- 只考虑最近 14 天、具有有效原文日期的条目，不将采集时间伪装成发布时间。
- URL 去除追踪参数后去重，标题做基本重复检查；**不同报道描述同一事件的语义去重尚未实现**，审核时需留意。
- 分类按关键词与来源默认分类生成，优先具身智能，再识别应用与模型内容；分类不是事实判断，审核可修改。
- 每个源最多重试 3 次，单次超时 20 秒、体积上限 2 MB。重定向不自动跟随，来源迁移时需要更新配置中的地址及域名。
- 部分来源失败时继续处理其余来源；所有来源失败则任务失败，已有资讯不变。
- 存在打开的 `codex/ai-news` PR 时暂停整轮采集，避免覆盖人工编辑；合并/关闭后下次恢复。超过 14 天再审核可能错过早期消息。

来源配置在 `config/news-sources.json`。`blockedUrls` 记录排除项，`enabled` 可暂停某个来源。

## 首次启用 GitHub Actions

1. 将本轮代码提交并推送到默认分支。
2. 在仓库 **Settings → Actions → General → Workflow permissions** 中允许 GitHub Actions 创建 PR。若组织禁用此选项，需要管理员配置。
3. 采集默认启用；如需暂停，在 **Settings → Secrets and variables → Actions → Variables** 设置 `NEWS_ENABLED=false`。采集工作流、脚本或来源配置推送到 `main` 后会自动运行一次。
4. 在 Actions 中手动运行 **Collect AI news for review**，检查 `news-run-report` artifact 和生成的草稿 PR。
5. 核对原文、分类与摘要，必要时修改，然后把草稿标记为 Ready 并手动合并。合并后沿用现有默认分支的部署流程；工作流本身不会操作 Vercel。

默认使用仓库 `GITHUB_TOKEN`，不需要个人访问令牌。由它创建的 PR 不一定触发额外的 PR 工作流，因此采集任务**已在创建 PR 前运行测试、内容检查和双语构建**。人工编辑后的验证由 `Validate blog changes` 工作流负责；必要时在该 PR 分支手动运行此工作流。如果仓库要求必须通过额外的 PR 状态检查，可改用具有 Contents/Pull requests 权限的 GitHub App token，并按该 action 文档配置。

要暂停采集，将 `NEWS_ENABLED` 改为 `false`。不要开启自动合并；建议对默认分支启用人工审批规则。

## 可选中文摘要

不配置模型也可运行：使用来源的短摘录（最多 180 字符），没有摘要时仅给原文入口，**不会把英文摘录标成中文摘要**。

使用提供 Chat Completions 兼容接口、支持 JSON 输出的服务时，设置：

| 类型 | 名称 | 内容 |
| --- | --- | --- |
| Variable | `NEWS_SUMMARIZE` | `true` 才会调用模型 |
| Variable | `NEWS_LLM_URL` | 完整 HTTPS 接口地址，包含 `/chat/completions` 路径 |
| Variable | `NEWS_LLM_MODEL` | 你的服务实际支持的模型 ID |
| Secret | `NEWS_LLM_API_KEY` | 访问密钥，不能写入仓库 |

发送内容仅为公开资讯的标题与短摘录。每批至多 5 次摘要调用，每次最多请求 900 个输出 token。此限制不等同于费用上限，费用取决于服务计价。当前不自动重试模型请求，以免重复计费；调用失败、配置不完整、输出格式或长度不符合要求时保留来源摘录，并写入回退记录。

摘要仅基于 RSS 提供的信息，不会读取原文补充事实。AI 输出不保证准确，需人工审核。双语标题与摘要保存在 `translations.zh` 和 `translations.en`；原始标题和摘录始终保留。已有内容可在审核分支运行 `npm run news:translate` 补译，再执行 `npm run news:render`。补译失败不会写入半批内容。

## 本地使用

需要 Node.js 22（与 Actions 一致）。

```sh
npm ci
npm run test:news
npm run news:collect
```

默认是**安全预览模式**，输出到 `.cache-loader/news-preview/`，不修改发布目录：

- `.cache-loader/news-preview/data/news/items.json`：本轮候选资讯。
- `.cache-loader/news-preview/src/pages/news/daily/`：日报 Markdown。
- `.cache-loader/news-report.json`：每个来源的结果、跳过数和摘要失败记录。
- `.cache-loader/news-pr.md`：审核说明。

预览结果不会自动加载到线上或本地 `/news`。若正式列表为空，页面会显示等待发布。

在专门的审核分支上，使用下列命令生成可提交内容：

```sh
node scripts/news/collect.mjs --write
npm run news:check
npm run build
```

`--write` 会修改 `data/news/items.json` 和 `src/pages/news/daily/`；不要直接在生产分支运行后未经审核就推送。

## 审核与拒绝

打开 PR 分支，编辑 `data/news/items.json` 的分类、`titleZh` 或摘要。分类允许 `ai-apps`、`llm`、`embodied-ai`。不要修改原文发布时间以提升排序。

```sh
# 修改后重新生成日报，并检查与列表一致
npm run news:render
npm run news:check

# 永久排除此 URL：同时移除条目、更新 blockedUrls 和日报
node scripts/news/render.mjs --reject <资讯id>
```

拒绝后需要把 **config/news-sources.json、data/news/items.json、相关日报** 一起提交至审核分支并合并，这样之后不会重新采集该条。只关闭整个 PR 而不合并排除列表，不会记住拒绝；仍在时间窗口内的内容可能在下次出现。

## 运维与限制

- Actions 的 `news-run-report` 保存 30 天，包含来源状态与摘要回退数，不含密钥。没有新资讯不会创建空 PR。
- 首次本地联网验证：DeepMind 与 OpenAI 成功，Hugging Face 本次网络连接失败；可在 GitHub runner 上重试或临时关闭该来源。
- 来源失败常见原因：网络不可达、Feed 迁移、429 限流、没有有效条目。更新配置并手动运行验证，不绕过访问限制。
- 只采集官方公开 Feed，仍需定期核对各来源的使用条件；若来源不允许展示摘录，可调整为仅显示链接。
- 列表和日报目前使用静态文件，按 5 条/天增长。长期运行后可按年拆分内容和索引；本版不自动删除历史内容。
- 列表、专题与日报随页面语言展示对应翻译；缺少翻译时明确回退原文。模型接口尚未配置时不会调用服务。

## 参考

- [Hugging Face 官方 RSS 公告](https://github.com/huggingface/blog/issues/42)
- [create-pull-request 权限与工作流说明](https://github.com/peter-evans/create-pull-request)
- [RSS Parser](https://github.com/rbren/rss-parser)

## 阅读收藏

资讯列表、专题和日报均可“稍后读”和手动标记已读；通过导航栏“探索 → 稍后读”查看未读、全部或已读收藏。状态只存在当前浏览器，不上传服务端，不跨设备同步。中英文页面使用相同资讯 ID；已下架资讯不再出现在清单中。存储失败时退回本次访问内存并提示用户。学习路线的规划选题继续使用原有独立清单。验证命令：`node --test tests/reading-state.test.mjs`。

## 研究筛选规则

采集在数量限制之前执行严格主题筛选（scripts/news/relevance.mjs），要求同时包含 AI 应用工程、LLM 技术或具身智能主题证据，以及实现、训练、评测、数据集、推理或仿真等技术信息。泛商业动态、气象与基因组消息默认排除；不因来源知名就收录，不凑每日数量。每条排除原因保存在运行报告 rejected 中。规则只能检查 RSS 标题和短摘录，可能漏收；人工审核仍负责事实与实际价值。

首批不相关条目已移至 archive/news，URL 加入 blockedUrls，避免重新入选。周汇总 /news/weekly 使用原文发布周（UTC 周一），只整理阅读索引。项目实验室 /lab 展示真实代码与已知局限。

## AIHOT 主来源

AIHOT 配置 priority=100、dailyLimit=4，先通过研究相关性筛选，再按来源优先级和日期选入每日批次。没有合格条目或获取失败时由补充来源填充，不保证每天满额。相同日期重复采集仍受上限限制。条目保留 AIHOT 阅读页地址；该页面提供原始出处，不将聚合摘要冒充官方原文。RSS 提供的 pubDate 作为来源日期，不保证与原始报道日期一致。按 URL 与标题做基本去重，不保证识别聚合站与原始报道的同一事件。

用户指定的 aiHot actor 参数保留在订阅地址中。参考：https://aihot.news/agent?tab=rss 。本轮不启用全文订阅、自动翻译或自动合并。
