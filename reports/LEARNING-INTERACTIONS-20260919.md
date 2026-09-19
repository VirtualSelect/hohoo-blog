# 第二轮互动学习扩展

## 实现内容

1. `/docs/ai-apps/java-first-llm`：对话记忆侦探复用 ConversationWorkbench。保留/移除用户和助手历史，切换固定规则摘要，检查请求 JSON 与事实缺失；不预测模型回答。
2. `/journey/virtual-lab`：RobotProgram 复用网格常量与视觉样式。前进、左转、右转、1–5 次重复展开；最多 40 条。逐条执行，碰撞时保留出错指令和位置；可删除指令、重新执行、清空。地图固定，修改程序从起点重新验证。
3. `/docs/ai-apps`：PromptRepair 从目标、约束、输入、验收条件四个方面补全固定示例请求，显示前后对比及遗漏项；不打效果分。
4. `/docs/ai-apps`：RetrievalDrawer 内折叠的 RetrievalRanking 沿用同一组 A–D 资料，改变关键词/语义权重与保留数量，展示全部排序及遗漏。分数是明确标注的手工教学值，不运行 Embedding。
5. Docs / Blog 文章末尾：ReadingFork 提供概念、动手、深入三种意图；概念与实践采用 metadata 关联，深入采用同领域已发布内容。过滤当前文章、草稿、缺失翻译和规划成果；没有适配内容时显示学习路线入口。

## 边界与复用

- 无新增路由、依赖、网络 API、持久化或作者成果内容。
- 复用 useText、SiteContext、语言感知 Link、内容索引、网格常量、现有主题变量与互动样式。
- 简体中文、繁体中文、英文独立文案；原生按钮、复选框、选择框、滑杆、details，键盘焦点样式及状态提示。
- 网格提供读屏地图说明和位置/方向状态。移动端单列规则，滑杆避免横向挤压；没有自动播放或持续动画。
- 新增组件：RobotProgram、PromptRepair、RetrievalRanking、ReadingFork。
- 新增纯逻辑：robot-program.mjs、retrieval-ranking.mjs、reading-forks.mjs；逻辑边界由 learning-experiments.test.mjs 验证。
- 已有无关 package-lock.json、pnpm-lock.yaml、yarn.lock 改动未处理。

## 已验证

- `npm run test:web`：28 项全部通过，包含碰撞停机、到达目标、排序权重变化、阅读入口真实性过滤。
- `npm run build`：成功，157 个静态页面生成完成。
- 修改的 JS/JSX/CSS 文件 Prettier 检查通过；`git diff --check` 通过。
- 本地生产预览在 4192 端口；上述三个功能入口各三语言，共 9 个 HTTP 200，并检查对应语言的新增标题。
- 启动预览时曾因错误工作目录缺少 generated 文件而失败；已停止该预览并从 apps/web 正确启动，9 页复验通过。这不是应用代码修复。

## 待验证

浏览器控制连接两次报告 `nodeRepl.fetch request failed`，未能连接浏览器。以下项目未声称通过：1440/1280/1024/768/430/375 实际布局、明暗主题截图、真实键盘/鼠标交互、hydration 与浏览器控制台。HTTP 和单元测试不能替代这些检查。

建议恢复浏览器连接后完成：机器人空程序/碰撞/删除/重放/40 条上限、摘要移除事实、提示词重置、排序遗漏 A 的反馈、文章实践入口及空结果、语言切换与主题切换。

本轮未提交、推送或部署。浏览器验收完成后再发布。
