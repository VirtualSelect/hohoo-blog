# 博客阅读路径与内容复核验收

> 本文记录 2026-10-06 的核查快照。获准继续修复、合并和发布后的进展见 [2026-10-07 收尾记录](RELEASE-OPTIMIZATION-20261007.md)。下文“尚未发布”和“工程未修改”均指该快照时点。

本次在 `codex/reading-path-and-evidence-review` 分支优化已有内容，没有新增研究文章、付费模型调用或依赖，没有提交、推送或部署。保留任务开始前已有的锁文件改动。

当前内容有可检查的代码、协议与负结果，但入口没有跟上文章积累，部分判定契约也超出了已记录场景能证明的范围。本轮把重点放在发现、理解和复现已有内容；独立工程的已知缺陷公开标注，未将旧证据重写成“修复后结果”。

## 历史问题核查结果

| 核查项 | 当前事实 | 本轮处理 |
| --- | --- | --- |
| 首页 Java 被标为 MuJoCo | 线上与仓库仍存在二选一误标 | 根据内容索引的 domain 与 articleKind 展示；首页和搜索复用 WritingKind |
| Journey 尚未开始实验与 E14 矛盾 | currentLab 为空，环境和机器人仍写待搭建 | 当前关注 VL01，复用其结果；明确教学直角坐标夹爪场景，VL01 与 M4/M5 不晋升完成 |
| 文章 RSS 被描述为不含 Docs | 线上已有 39 项，其中 38 篇技术文章 | 跳过 RSS 重建，仅修正文案、原发表日期排序和 GUID 语义 |
| 资讯 RSS 被描述为最近 100 条 | 线上实查 186 条 | 保留现有全部归档与两个兼容地址，去掉硬编码数量 |
| 近况和关于页仍停留在早期计划 | Now 为 09-30，具身下一步已由后文回答 | 首页和 Now 继续共用 current.json；关于页更新事实性关注点 |
| 旧文下一步没有结果入口 | 多篇已有后续文章，但读者需自行寻找 | 中央路线提供 followUps；正文顶部显示后续结果，原文时间与结论保留 |
| 真实抓取录像容易误解为真机 | 项目展示仍有该措辞 | 三语改为 MuJoCo 实际仿真录像 |
| 筛选空结果归因于缺译文 | 仍可能误导 | 改为当前筛选无匹配；学习页提供清除筛选，空结果禁用随机探索 |
| 英文内容混中文摘要 | 38 篇技术文章的英文摘要已有；两篇 Weekly 描述缺译文 | 跳过整站文章重译，补 Weekly 描述及相关三语 UI；外部来源无译文仍保留来源语言标识 |
| Vicuna 被当作 2026 年事件 | 聚合与收录日是 2026-10-03，原公告为 2023-03-30 | 保存原公告日期及 LMSYS 链接；页面和 RSS 区分三种时间，日报仍按 UTC 收录日归档 |
| 学习顺序只有少量入门篇 | 正文已有 38 篇 | AI 应用 12、LLM 11、具身 15 全部进入中央路线，未发表计划单独展开 |
| 固定提交与后续目录错位 | 正文已有各自提交链接；缺统一安装入口 | 保留正确链接，为 14 篇 MuJoCo 文章复用各自固定提交的安装、运行与审计说明 |
| 同页路线锚点不展开内容 | 浏览器实测发现 Next Link 改 hash 后未触发展开 | 学习页内使用原生锚点，跨页仍用既有路由组件；展开后再定位 |

原公告核对来源：[LMSYS 的 Vicuna 公告](https://www.lmsys.org/blog/2023-03-30-vicuna/)。没有从聚合时间推算其他资讯的原公告日期；无法核实的聚合条目明确标为日期未核实。

## 阅读与教学改进

首页、三个专题、学习页共用“从第一篇开始／阶段综合结论／阅读顺序”入口。标题、类型、日期仍来自正文元数据；中央路线只维护顺序、学习收获、先修和后续关系，保留已有进度 ID。

每步展示读后能做什么、先修知识、对应文章及已有项目或实验档案。正文保留相邻学习位置、完成标记、目录与阅读工具；顶部先修改为紧凑链接，不复制完整关联文章列表。

代表文章的改动同步到简体、繁体和英文：

- **Java 第九篇**：对照同会话串行、先提交者获胜、最新发起者获胜；用 A/B 时序说明适用语义和 B 失败时的取舍，补复现准备、练习和解析局限。
- **LLM 缓存准入**：区分数值等价、投影计算量与实际耗时；保留缓存更慢的结果，拒绝未测量的开销归因。补固定环境、排错和自检，将详细数值校验放在附录。
- **具身第十四篇**：增加阶段契约、预算、恢复、退出动作和旁路完成观察器的整体关系；用练习区分物理放置、当前有效性与流程合格完成，补已确认的延迟与释放时序勘误。

另外，Radar 工程旧文增加带日期的配置更新提示，保留原固定版本的六条算例，明确当前 AIHOT 动态共享全站十条上限。24 次 Agnes 3.0 调用与 128 项仅离线准备的方案继续分开，未添加新的真实模型结果。

## 配套工程仍需处理的问题

这些是代码复核与最小反例，不是新增物理实验或模型评测；本轮没有修改两个独立工程。

| 问题 | 影响 | 当前处置 |
| --- | --- | --- |
| Java Demo08 至 Demo10 复用的 Gson 2.10.1 路径接受字符串内未转义换行和制表符 | setLenient(false) 不能单独作为严格 JSON 合规保证 | 第九篇补边界；第八、十篇展示复核提示 |
| MuJoCo E11 先检查旧包过期再处理新包 | 20ms 采样、40ms 延迟、60ms 阈值的持续有效观测会反复清空窗口 | E11 入口指向 E14 勘误，保留旧轨迹 |
| E14 只有 released 布尔值，没有释放时间 | 可接纳释放前采样、释放后到达的证据；反例的释放后跨度 240ms 小于所需 250ms | 限定原结论适用范围，不再宣称普遍拒绝释放前证据 |
| Java Demo10 运行脚本写死 Maven 路径并强制离线 | 干净机器不能直接照跑，含空格输出路径也需核对 | 第十篇展示复现限制 |
| Demo10 和缓存准入审计未自动遍历 manifest.sources | 审计结果不证明当前源码与证据源码相同 | 明确审计范围，复现要求固定提交 |

优先建议修复这些实现和复现边界，再继续新增研究。完整 Java 助手的默认会话语义需要产品选择；真实模型评测需要独立预算授权；缓存开销剖析与第二个机器人场景需要新实验协议。本轮只沿用研究待办，没有执行。

## 验证与边界

- `test:web`：90 项通过，包括三语言路线覆盖、先修关系、后续引用、文章类型、RSS 完整性与排序、日期来源和复现版本关联。
- `test:news`：34 项通过；学习索引与本地进度测试 7 项通过。
- `typecheck`、生产构建、项目现有 `format:check` 通过；仓库没有独立 lint script。
- `i18n:check` 无告警；`news:check` 校验 182 条本地原始记录，现有事件聚类生成 181 条公开信号。
- 路由校验：387 个页面、旧地址跳转、三语言 RSS 与 404 检查无错误。
- 已核对 14 个固定提交上的安装文件、实验目录、运行和审计脚本存在；没有重新安装 14 套干净环境，也没有重跑全部物理实验。跨操作系统复现仍未验证。
- HTTP 性能检查只记录本地响应与静态资源大小，不代表 LCP、INP、CLS 或线上网络体验；没有宣称交互性能提升百分比。

浏览器使用本地生产构建，已实际验证：

- 首页、学习页与 E14 文章在 1440、1280、1024、768、430、375px 下没有页面横向溢出；检查护眼和夜间主题，E14 夜间也覆盖上述六个断点。表格与代码保留局部横向滚动。
- 学习页无匹配时显示筛选原因，随机探索禁用，清除后恢复；同页“按顺序学习”会展开对应路线。
- 文章筛选将方向与类型写入 URL；浏览器返回依次恢复 8 篇、11 篇和全部 39 篇的对应筛选状态。
- 搜索按钮、Ctrl+K、输入、Esc 关闭与焦点回归可用；搜索结果和最近阅读使用真实文章类型。
- 切换到英文保持文章地址对应关系并回到顶部；菜单在 375px 下能打开并用 Escape 关闭。
- 文章目录能定位到标题，目标标题位于固定导航下方；先修链接、复现说明展开和三语文章正文可读。
- 便签输入后刷新仍能恢复，备份生成有效 JSON；测试便签已清空。没有执行覆盖式备份导入。
- 虚拟实验室网格演示能前进一步并恢复地图；现有实验成果与完整里程碑状态分开显示。未穷举全部互动工坊组合。
- Vicuna 日报显示原公告、聚合源发布和本站收录三个日期，375px 下不溢出；订阅页文案与 RSS 范围一致。
- 本地验证标签页未捕获到 console warning/error。未把自动化工具的临时连接超时当作网站错误。

这些是本轮相关路径的回归检查，不代表全部浏览器、设备、辅助技术及所有交互组合均已验证。统计服务在本地未配置，不据此判断线上统计故障。

## 本地与线上差异

预览地址为 `http://localhost:4206/`。本轮变更尚未上线。

线上资讯 RSS 实查为 186 条，本地生成 181 条；本轮数据差异仅给 Vicuna 增加 originalPublication，没有删除资讯。上线前需要同步远端最新资讯并重新处理这一条元数据改动，不能用本地旧归档覆盖线上新增记录。

锁文件 `package-lock.json`、`pnpm-lock.yaml` 和 `yarn.lock` 是任务开始前的工作，本轮未处理。不新增运行依赖，不新增页面或路由，不改变技术主线与付费服务设置。

## 变更文件

以下清单不包含用户原有锁文件和忽略目录中的临时检查日志。新增组件复用现有主题、路由与内容处理能力，无新增依赖。

- `apps/web/app/editorial.css`
- `apps/web/app/globals.css`
- `apps/web/components/Document.tsx`
- `apps/web/components/Home.jsx`
- `apps/web/components/Journey.jsx`
- `apps/web/components/ProjectShowcase.jsx`
- `apps/web/components/ReproductionGuide.tsx`
- `apps/web/components/ResearchSpotlight.jsx`
- `apps/web/components/Search.jsx`
- `apps/web/components/Views.jsx`
- `apps/web/lib/site-types.ts`
- `apps/web/scripts/content.mjs`
- `apps/web/tests/reading-review.test.mjs`
- `data/current.json`
- `data/journey.json`
- `data/learning-paths.json`
- `data/localization.json`
- `data/news/items.json`
- `data/projects.json`
- `data/radar-digests.json`
- `data/reproduction.json`
- `docs/ai-apps/java-stream-session-ownership.md`
- `docs/ai-apps/radar-publishing-pipeline.md`
- `docs/AI-RADAR.md`
- `docs/CONTENT-MODEL.md`
- `docs/embodied-ai/mujoco-qualified-completion.md`
- `docs/llm/prefix-cache-admission.md`
- `docs/ROADMAP.md`
- `i18n/en/code.json`
- `i18n/en/docs/ai-apps/java-stream-session-ownership.md`
- `i18n/en/docs/ai-apps/radar-publishing-pipeline.md`
- `i18n/en/docs/embodied-ai/mujoco-qualified-completion.md`
- `i18n/en/docs/llm/prefix-cache-admission.md`
- `i18n/zh-CN/code.json`
- `i18n/zh-TW/code.json`
- `i18n/zh-TW/docs/ai-apps/java-stream-session-ownership.md`
- `i18n/zh-TW/docs/ai-apps/radar-publishing-pipeline.md`
- `i18n/zh-TW/docs/embodied-ai/mujoco-qualified-completion.md`
- `i18n/zh-TW/docs/llm/prefix-cache-admission.md`
- `lib/content/content-index.cjs`
- `lib/content/learning-index.cjs`
- `lib/content/learning-paths.cjs`
- `reports/READING-REVIEW-20261006.md`
- `src/components/DocReadingContext.js`
- `src/components/NewsDigest.js`
- `src/components/RadarItem.js`
- `src/components/SeriesEntry.jsx`
- `src/components/SignalDates.jsx`
- `src/components/TopicLanding.js`
- `src/pages/learning.js`
- `src/pages/now.js`
- `src/pages/subscribe.js`
- `src/utils/radar-provenance.cjs`
