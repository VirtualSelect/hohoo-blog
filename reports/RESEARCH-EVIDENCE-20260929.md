# 研究证据与阅读体验升级 · 2026-09-29

## 交付

- 首页精选改为显式内容 ID，突出 Java 结构化输出与 MuJoCo 真实抓取；项目区展示两个实践工程，具身项目可展开已录制录像。
- Java 第二篇增加可编辑输出验收台，区分协议完成、JSON 唯一性、业务契约；默认使用已保存的真实围栏响应。其余预设明确标为教学示例，浏览器不调用模型或保存输入。
- MuJoCo 文章与 VL01 首轮 Lab 增加 0 / 25 / 50 mm 切换、阶段定位、原始 CSV 派生高度曲线与样本表。录像按需加载，不自动播放。固定证据版本 17144c47。
- 学习路径将已发布结构化输出接在首次调用后；文章底部跳到下一篇已发布文章，不被规划节点阻断；完成按钮展示当前状态。
- 近况共用数据更新；已执行 VL01 首轮进入 Labs，Journey 完整计划状态保持不变。
- 新增三语言研究复盘 /docs/llm/context-position-experiment、/labs/context-position，关联 Java 项目和 KV Cache 文章。
- 主干 push 触发已有验证工作流；不修改资讯抓取策略。

## 真实研究结果

Java 工程：VirtualSelect/hohoo-ai-lab，证据提交 e072718c3cd66d44978612208d393ff0d3eff9e4，主干合并 36fcc33。
6 个虚构案例 × 4 条件 × 2 次重复，共计划 48 项。用户明确允许本轮最多 48 次请求，并允许从既有 IDE 环境配置读取指定密钥；密钥不输出、不写入证据或仓库。

实际尝试 29 次，26 次正常返回（20 个正确编号、6 个正确拒答），随后连续 3 次 HTTP 429 触发冻结的停止规则。19 项未执行，不重试、不补造。L1 状态为 inconclusive，不能从正常响应 26/26 推出位置无影响。记录时间为 2026-09-28 UTC，文章发表于 2026-09-29。

正常响应返回的 usage 合计 prompt 74476、completion 2567、total 77043；不是账单或失败请求消耗估计。源码提供 92 项离线断言，独立 audit.mjs 重算材料、请求字节 hash、评分和停止条件。实验执行源码 commit 为 3b885de，结果单独提交。

## 验证

- Java compile、自测 92 项与独立证据审计通过；无追加模型请求。
- 网页测试 73 / 73；内容、学习状态、资讯及论文关系测试 44 / 44。
- 翻译 manifest 检查通过；资讯完整性检查 136 条通过。
- 本轮 JS / JSX / CSS 格式检查、git diff --check 通过。仓库未提供独立 lint/typecheck，未虚构运行。
- Next.js 生产构建通过，已有路由保持，新增内容保留服务端静态正文。
- Chrome 检查 6 个关键路由 × 6 种宽度（1440/1280/1024/768/430/375）× 两种主题，共 72 组无页面横向溢出。
- 三语言编辑校验、围栏开关、finish_reason 中断、重复字段拒绝、三偏移组录像定位到搬运阶段均通过；下一篇导航、主题切换、Ctrl+K/Escape 通过；无 pageerror。
- 最后补测 1440/375 两主题的具身录像弹窗、Esc 关闭及焦点返回、复选框反馈；正文在关闭 JavaScript 时仍可阅读。实际查看截图确认布局。

## 性能与边界

保留 Journey / VirtualLab 服务端模块；Document / Views 通过客户端动态边界拆包，不将 fs/path 引入浏览器。文章中的新工具仅在 TryIt 展开时挂载。无新增依赖、后端服务、账号或存储。

现有 performance-check.mjs 对首页、首篇 Java、Radar、About 测得初始 HTML 引用的未压缩 JS 为每页 603050 bytes / 8 scripts；改动前记录约 718 KB / 9 scripts。这个口径不包含所有后续动态加载，不能当作实际网络节省或 LCP/INP/CLS 改善。完整样本见 performance-20260929.json。内容增长使 HTML 也增加，下一步应继续分析共享元数据序列化，而非无限添加首页模块。

图表仅展示每组第一个回合，真实证据每组三次；固定初始化无随机化，不报告泛化成功率。L1 短规则材料、重复相关、样本少且提前停止，位置效应未确认。Next.js/npm 版本保持原状。

## 主要文件

- apps/web/components：ResearchSpotlight、MujocoEvidence、OutputValidation、RouteContent、ResearchEvidence.module.css；复用 TryIt、ExpandableFigure、Home、Document、ProjectShowcase。
- apps/web/lib/output-contract.mjs；apps/web/tests/output-contract.test.mjs、research-evidence.test.mjs。
- data/editorial.json、practice/mujoco.json、current.json、experiments.json、projects.json、localization.json、learning-paths.json。
- scripts/build-practice-evidence.mjs；新增 50 mm 回合录像和截图。
- docs / i18n 三语言文章与阅读入口、内容模型、路线图、共创清单。
- src/components/ContentDetail.js、ContentUI.js、DocReadingContext.js；lib/content/content-index.cjs；两项旧测试夹具；.github/workflows/validate.yml。

发布按用户本轮授权执行：先提交真实代码，再合并博客主干，经 Git 集成触发 Vercel，最后核验线上文章和交互。原有 package-lock.json 工作区状态及未跟踪 pnpm-lock.yaml/yarn.lock 不属于本轮，不提交或删除。
