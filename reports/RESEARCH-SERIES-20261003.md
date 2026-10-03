# 三方向研究系列交付 · 2026-10-03

## 内容与工程

三个方向各三篇，共九篇原创实验分享，提供简体中文、英文和繁体中文版本。英译和繁中仍标为 `AI_TRANSLATED`，不标成人工审校。正文按问题、方法、结果、限制和复现组织。

| 方向 | 文章路由 | 配套实现 |
|---|---|---|
| AI 应用 | `/docs/ai-apps/java-concurrent-history` | 版本票据、真实双线程乱序、完整问答提交 |
| AI 应用 | `/docs/ai-apps/java-tool-boundary` | 白名单、严格 JSON、零队列、超时与取消 |
| AI 应用 | `/docs/ai-apps/java-retrieval-evidence` | 本地 BM25、证据装包、引用校验 |
| LLM | `/docs/llm/causal-mask-lab` | 手算注意力、未来扰动与因果掩码 |
| LLM | `/docs/llm/kv-cache-equivalence` | 前缀重算、Token 缓存、分块缓存等价 |
| LLM | `/docs/llm/sliding-cache-positions` | 滑动窗口、绝对位置、裁剪重算反例 |
| 具身智能 | `/docs/embodied-ai/mujoco-exit-actions` | E8：保持、松爪、松爪后退 |
| 具身智能 | `/docs/embodied-ai/mujoco-release-verification` | E9：单帧与持续窗口的完成验收 |
| 具身智能 | `/docs/embodied-ai/mujoco-recovery-budget` | E10：恢复预算、冷却和等待期限 |

代码保留在原有两个仓库：

- [hohoo-ai-lab 固定版本](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa)：`demos/06-reliable-workflows` 和 `experiments/05-attention-lab`。最终版本含代码、原始记录、独立审计和复现入口；实验清单另保留实际运行时源码版本。
- [hohoo-embodied-agent 固定版本](https://github.com/VirtualSelect/hohoo-embodied-agent/tree/497d0df30c1f66de50fb38b930f0c6ea069d9634)：`experiments/vl01_exit_release_budget` 与 `evidence/exit-release-budget-20261003`。协议和源代码先冻结，结果后归档。

复用既有文章渲染、目录、图表放大、搜索、实验与项目详情；新增五个 Lab，补充两个既有 Lab 的部分结果。首页精选、项目资源、VL01、三语言内容清单同步更新。六张图由原始记录生成，声明尺寸并延迟加载。未增加前端依赖、API、数据库或新的学习方向。

## 实测记录

- Java：33 项边界检查，14 个查询由独立 Python 审计重算。12 道有答案题中 11 道命中前 1/前 3；2 道无答案题中 1 道仍返回命中。只验证检索和引用边界，不报告生成答案正确率。
- LLM：9 个测试方法，包含 36 种种子/长度/窗口组合。保存 48 个具名数组，独立重算 27 项差异指标，并核验掩码与运算计数。采用未训练的双层注意力教学网络，不是模型能力或 GPU 性能测评。
- 具身：15 + 5 + 12 = 32 个确定性 MuJoCo 回合。16 项测试；96 份逐回合原始文件、11 份源码指纹、15 组 E8 决策分歧前状态前缀通过审计。E9 的两种观察规则处理同一条轨迹，不加倍计算回合数。
- 没有读取 API Key，没有新增在线模型请求，也没有使用此前已耗尽的调用授权。

## 关键发现及边界

并发回复提交必须检查生成时的历史版本；工具超时不保证工作线程已停止；检索命中与引用存在不等于语义支持。KV Cache 等价依赖相同输入、位置和掩码；上层缓存与裁剪原始输入后重算不是相同操作。

E8 在已知托盘下方的固定场景中，退出动作改变最终放置，但没有一种动作在搬运掉落中完成任务。E9 的持续窗口拒绝了本次孤立伪造观测，不能保证以后不被外力破坏。E10 的预算限制了恢复次数，却使本可在无次数上限策略下完成的固定故障任务停止；不把“受控”写成“成功”。

不宣称真实机器人安全、泛化成功率、语言理解能力、生产吞吐或线上成本。原始失败结果全部保留。

## 博客验收

- `npm run typecheck`、`npm run format:check`、`npm run i18n:check`、`npm run news:check`、`npm run build`。
- `npm run test:web`：81 项通过；根目录实际测试 `node --test tests/*.test.cjs tests/*.test.mjs`：64 项通过。
- 生产预览路由检查：306 个页面无错误；旧地址 308、三语言 RSS、404 均通过。
- Chrome：27 个语言版本在 1440/375 宽度、浅色/深色检查；三方向代表文章补查 1280/1024/768/430，共 132 次布局检查。没有整页横向溢出、损坏图片或控制台错误。
- 33 个关联入口页面可找到新文章。图表放大/Escape、Ctrl+K 搜索、语言切换回顶部通过；九篇正文关闭 JavaScript 后仍可阅读。
- 修复两处测试的数量写死假设，保留筛选语义与真实文章关系验证。

## 保留待办

L1v3 的 128 次 Agnes 在线对照仍等待本轮密钥使用与费用范围确认；本地机制实验不代替它。工具策略与完整 RAG 生成对照仍未完成，既有 Lab 保持 `running`。VL01 与作者个人学习勾选状态不自动完成。

下一轮沿用 `docs/RESEARCH-COCREATION.md`：退出动作与恢复预算组合、完成状态失效、检索引用的语义支持；不重复建立待办。
