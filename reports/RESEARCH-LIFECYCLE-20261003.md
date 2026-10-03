# 三方向后续研究：证据的有效范围与生命周期

## 交付

| 方向 | 文章 | 真实执行 | 固定代码与证据 |
| --- | --- | --- | --- |
| AI 应用 | `/docs/ai-apps/java-grounded-claims` | 22 个冻结配置声明；引用存在接受 13 个，其中 10 个违规；完整契约输出均符合标签 | hohoo-ai-lab `ba75c55c53f6f5e30ac027bbf59f28a8202708d7`，`demos/07-grounded-claims` |
| LLM | `/docs/llm/prefix-cache-invalidation` | 三种子 × 六条件，54 数组、36 项误差重算；8 项单元测试 | 同一 Java/LLM 工程提交，`experiments/06-prefix-cache` |
| 具身 | `/docs/embodied-ai/mujoco-completion-lifecycle` | 7 条真实 MuJoCo 轨迹、21 份回合记录、5 组物理轨迹一致性，12 项测试 | hohoo-embodied-agent `cd26180e8560155d18c45d34a33dc9ef25bbcdf6`，`experiments/vl01_completion_lifecycle` |

三个方向各推进一篇，共 9 个三语言文章页面，复用首页精选、文章索引、Lab、项目与 VL01。新增 Lab 019/020，检索 Lab 001 保持 running，VL01 保持 learning，作者里程碑不自动完成。旧实验与路由保留。

三张图由原始结果生成；E11 双画面视频使用原始 qpos/qvel 通过 mj_forward 回放，300 帧、25fps，不增加实验回合。海报取回放第 210 帧。视频为 259,289 bytes，`preload=none`、原生播放控制，无自动播放。阅读正文不依赖 JavaScript。

## 检查

- `npm run format:check`、`npm run typecheck` 通过。
- `npm run test:web`：82 项通过；根目录 Node 测试：64 项通过。
- `npm run i18n:check` 完成；新增译文保持 AI_TRANSLATED，源文/译文摘要已同步。
- `npm run news:check`：174 条既有资讯通过；本轮不改采集配置。
- `npm run build`：生产构建成功，340 个生成步骤页面。
- 本地生产预览路由验收：321 页、0 错误。
- 新文章：1440/1280/1024/768/430/375 六档，亮/暗主题合计 60 组；9 个语言页面全覆盖桌面和手机。
- 21 个关联页面；主题、图片放大/Escape、Ctrl+K 搜索、语言切换回顶部、无 JavaScript 正文、视频真实播放均通过，无控制台错误。
- 原有 3:2 视频回归通过；新双画面 1280×448 使用真实比例，播放前即保留正确空间。

## 实现与依赖

新增 Markdown、已有 JSON 模型中的内容关系、静态结果图和回放。视频适配器接受 1–4096 的正整数宽高，否则成对回退到既有 960×640；继续拒绝外部媒体、自动播放与不可信属性。CSS 不再强制所有视频为 3:2。

博客新增依赖：None。工程沿用 Java 8/Gson、Python/NumPy/MuJoCo，以及既有绘图/回放依赖；不增加第三个工程仓库。

## 解释边界

- 没有读取 API Key、没有新增在线模型请求；待授权的 128 次 L1v3 不在本批执行范围内。
- A5 是合成配置的精确字段契约，不是通用语义蕴含、端到端 RAG 准确率或完整提示注入防御。
- L5 是未训练 float64 教学网络；投影计数不是实际速度，作用域字符串不是身份授权。
- E11 对单帧坏报告会误撤销；UNKNOWN 不等于物理失败。没有真机、重新抓取、退出动作与恢复预算组合验证。
- 未覆盖用户已有 package-lock.json 改动及 pnpm-lock.yaml/yarn.lock；这三项不纳入本批提交。

## 发布方式

两个配套工程已合并并推送 main，博客通过本地验收后沿既有 main → GitHub Actions → Vercel 流程发布。最终生产状态以对应提交的 CI 和部署检查为准，不用本地 published 字段替代部署成功证据。

下一步沿用 `docs/RESEARCH-COCREATION.md` 中的既有待办，本报告不启动另一轮研究。
