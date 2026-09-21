# 旗舰内容体验升级 · 2026-09-22

分支：codex/creative-workbench-20260921。仅本地预览，没有合并、推送或发布。

## 变化

- 首页由重复的教程推荐改为实践手册封面，直接连接真实教程。
- 教程新增请求 → 解析 → 历史三阶段手册，代码、观察、自检解释联动。
- 项目页复用阶段手册并链接固定提交的 Demo，保留项目过程与局限说明。
- 删除页面中的重复导读/证据展示，进阶练习收纳到原生展开区域。
- 新增文案覆盖简体、繁体、英文；原始对话证据保留原文。

## 文件

新增 apps/web/components/FlagshipExperience.jsx 与同名 CSS Module。
修改 Home.jsx、Document.jsx、src/components/ContentDetail.js、apps/web/app/editorial.css，以及设计和路线文档。

## 验证

- npm run test:web：45/45。
- npm run build：通过，160 个静态页面。
- test:routes：141 个页面，无错误。
- 修改文件 Prettier 检查通过，git diff --check 无空白错误。
- 浏览器验证首页入口、阶段切换、自检、字段说明、超时复盘、三语言与两主题；教程检查 1440/1280/1024/768/430/375 宽度，另检查首页与项目桌面/移动布局。
- 检查页面未捕获浏览器控制台警告或错误。

## 边界

没有新增依赖、路由或正式文章。证据来自既有文章，不是新执行的 API 实验。未加入真实在线 AI 服务。路由检查中的未知地址虽返回预期 404，Next.js 服务端仍有既有 NoFallbackError 日志，未在本轮扩大修改范围。

预览：http://localhost:4198/ 。等待用户预览决定后续工作。
