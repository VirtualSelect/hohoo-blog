# Docusaurus 解耦记录

本次仅修改 `codex/nextjs-redesign` 工作区，未提交、未部署。

## 变更

- 共享页面导入 `apps/web/runtime` 的站点链接、翻译与内容上下文，不再导入 Docusaurus / Theme API；Next 配置只保留站点路径别名。
- `lib/content` 接收普通 docs / blogPosts 数组；保留内容真实性、关联、日期和学习节点校验，移除插件生命周期。
- 译文移动到 `i18n/{locale}/docs`、`i18n/{locale}/blog`，同步 localization 清单，保留正文、校验指纹和状态。
- 共享样式迁到 `src/css/shared.css`，变量改为 `--hh-base-*`；移除旧主题专用 Navbar / Footer / DocSearch 样式。
- 移除 Docusaurus 包、旧配置、侧栏、Babel 配置、theme overrides、legacy 命令和已被新版替代的首页／关于／Radar 实现。实际路由仍由 Next 提供。
- 删除旧框架默认图片、恐龙 favicon 和旧构建产物；当前 favicon 继续使用 Hohoo 头像。
- Prism.js 1.30.0 改为新版应用直接依赖，不再通过旧框架间接获得；保留 Three.js、RSS 解析与业务工具。
- 更新 README、国际化说明、开发规则、路线图及当前分支的项目技术说明。
- 修正资讯检查的 CRLF / LF 比较，未修改采集数据或重发资讯。

## 保留

所有真实教程、随笔、项目、实验、资讯、来源链接和三语言 URL；学习与收藏的 localStorage key / schema 不变。历史开发记录可以继续提及 Docusaurus，不表示运行时依赖。Git 保存旧框架历史。

## 验证

- 原 42 项业务测试通过；新增框架边界测试防止旧框架导入、变量与命令回流。
- 新版 6 项内容测试通过；格式检查、翻译检查、资讯检查通过。
- Next.js 生产构建通过；108 页面及验证脚本覆盖的重定向、RSS、404 检查通过。
- 浏览器检查搜索打开与结果、Escape 关闭、学习收藏刷新持久化并恢复测试前状态、繁体文章、代码高亮、粒子暂停／播放、主题切换。
- 首页与 Radar 在 1440、1280、1024、768、430、375 宽度下未发生横向溢出；资讯无结果状态正常，检查页面无控制台错误。最终为 43 项根目录测试与 6 项新版内容测试通过。

## 边界

不自动切换线上 Vercel 配置或域名。任意新增 MDX React 组件仍需显式接入内容加载器。部分保留的共享 CSS 类名与内容字段出自旧站，但不再依赖旧框架包或全局样式。
