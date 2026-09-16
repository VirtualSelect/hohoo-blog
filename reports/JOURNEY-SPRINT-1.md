# Hohoo AI Journey · Sprint 1 验收

## 页面与路由

- `/journey`、`/zh-TW/journey`、`/en/journey`：复用现有捕获路由、Shell、主题、搜索、canonical、hreflang 与 sitemap。
- 导航将原学习入口替换为 AI Journey，一级入口仍为五项。原 `/learning` 及本地阅读状态保留，通过 Journey 顶部进入。
- 首页内容包含当前关注、三轨路线与汇合、十个里程碑、八周建议节奏、已有 Java 文章参考和以后探索列表。
- 不创建 Sprint 2–5 页面，不发布项目成果，不创建机器人仓库。

## 新增文件

- `data/journey.json`：三轨、投入计划、currentMilestone、里程碑和建议周计划。
- `apps/web/components/Journey.jsx`：服务端页面；路线、详情、状态和参考文章。
- `apps/web/components/Journey.module.css`：三列 / 纵向响应式路线、紧凑里程碑列表。
- `apps/web/lib/journey.mjs`：构建前模型校验。
- `apps/web/tests/journey.test.mjs`：状态、完成证据、依赖环与三语言内容关系测试。
- `docs/JOURNEY.md`：数据维护与后续阶段边界。
- 本报告。

## 修改文件

- `apps/web/app/[[...segments]]/page.jsx`：Journey 服务端分发及 metadata。
- `apps/web/components/Shell.jsx`：主导航与搜索起始入口。
- `apps/web/scripts/content.mjs`：校验、三语言路由与搜索索引。
- `i18n/zh-CN/code.json`、`i18n/zh-TW/code.json`、`i18n/en/code.json`：journey.* 文案。
- `docs/ROADMAP.md`、`docs/CONTENT-MODEL.md`、`docs/I18N.md`：同步范围及职责。

## 模型与真实性

schema version 1；详情字段见 docs/JOURNEY.md。currentMilestone 指定首页关注的节点，详情展开和状态由数据读取；改变关注方向时同步三语言 focus / focusBody 文案。

状态为 not-started / learning / building / completed；十个机器人里程碑均未开始。完成状态要求日期、结果和证据。已有 Java API 文章只是基础参考。25% / 15% / 60% 是计划投入比例，八周安排没有实际开始日期。作者进展不从访客 localStorage 计算。

## 验证

- `npm run test:web`：14 项通过。
- `node --test tests/*.test.mjs tests/*.test.cjs`：48 项通过。
- `npm run build`：通过，145 个生成参数页面；捕获路由仍为按请求服务端渲染，未宣称整站静态化。
- `npm run i18n:check`：完成。
- `npm run test:routes --prefix apps/web`：126 页面，errors=[]。
- 本轮修改的 JS / JSX / CSS 格式检查通过，git diff --check 通过（Git 提示 Windows 换行转换）。
- 项目没有独立 lint / typecheck 脚本，不虚报执行；没有新增 TypeScript 工程。
- 浏览器检查 1440 / 1280 / 1024 / 768 / 430 / 375 无横向溢出。桌面三列、手机纵向；深浅主题、手机菜单、三语言选择、搜索 Journey、原学习页跳转、summary 键盘 Enter 展开可用。
- 页面锚点目标全部存在，main 跳转入口存在，检查期间未发现控制台 error / warn。

## 性能与限制

新增依赖：None。无图形库、客户端进度管理或动画依赖；Journey 正文和 details 服务端输出，基础阅读不需要 JavaScript。继续使用站点已有客户端导航和搜索。

未进行新的 Lighthouse 性能基准或完整读屏审计。进展由仓库数据维护，未提供编辑后台；code / demos 字段为后续阶段预留，目前无实际机器人代码或实验数据。

## 下一阶段

Sprint 2：Projects / Skills / Progress。
Sprint 3：Career Matrix。
Sprint 4：文章系列关联。
Sprint 5：真实 GitHub 与 Demo 展示。

本次未提交、推送或部署，等待用户审阅。用户原有 package-lock.json 改动、pnpm-lock.yaml、yarn.lock 保留。
