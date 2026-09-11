# Docusaurus 3.10.2 升级记录

日期：2026-09-11。

## 范围

- 所有 Docusaurus 包从 3.4.0 统一升级到 3.10.2，更新 npm 锁文件。
- 保留 React 18.3.1、Webpack 构建器和现有页面、路由、内容模型。
- Node 最低要求改为 20；现有 GitHub Actions 使用 Node 22，无需修改。
- README 同步版本和安装要求。
- 未启用 Faster、future.v4 或自动翻译。

## 兼容性调整

- `useDoc` 从旧的 `@docusaurus/theme-common/internal` 改为新版公开接口 `@docusaurus/plugin-content-docs/client`。旧接口会导致文档 SSR 失败，涉及文档内容封装和阅读上下文组件。
- `onBrokenMarkdownLinks` 移到 `markdown.hooks`，保留原有告警级别。
- 保留原 Webpack 5.105.4 override，实际构建通过且没有重复版本冲突。
- 将 `@docsearch/react` override 固定为 3.9.0。这是当前 Docusaurus 搜索主题支持的版本；默认解析的 4.7.0 在本地 Node 22.4.0 下触发 ESM 加载警告。此轮保留搜索 3.x 交互，搜索 4.x 后续作为独立升级评估，届时重新评估此约束。
- 没有新增直接运行时依赖；锁文件包含框架升级所需的传递依赖变化。

## 验证

- `node --test tests/*.test.mjs tests/*.test.cjs`：31/31 通过。
- `npm run news:check`：4 条现有资讯校验通过。
- `npm run build`：中文和英文生产构建成功，无编译、SSR、断链或弃用配置警告。
- 本地受限环境仍提示 Docusaurus 更新检查无法写入用户缓存；不影响构建产物。
- 最终稳定产物：22 个路由 × 6 种宽度（1440、1280、1024、768、430、375）× 深浅主题，共 264 组布局检查通过，未发现溢出和运行时异常。
- 11 项交互检查通过：移动菜单、Escape、旧进度迁移、收藏持久化、无结果筛选、恢复筛选、Radar 收藏、键盘焦点、减弱动效及英文界面。
- 搜索弹窗：1440/375 × 深浅主题，4 组打开、自动聚焦、单一焦点边框、视口边界及 Escape 关闭检查通过；已检查截图。
- 6 个中英文旧地址跳转正确；英文 redirect canonical 和 RSS self URL 无重复语言前缀。
- 仓库没有 lint/typecheck 脚本，未将其报告为已运行。

## 发布与限制

- 当前仅完成本地升级和验证，未推送或部署。
- Algolia 线上检索索引覆盖范围未重新验收；本次验证了搜索组件加载与交互。
- 发布前应确认 Vercel 项目使用满足要求的 Node 版本；GitHub Actions 已固定为 22。
- 用户已有的未跟踪 `pnpm-lock.yaml` 和 `yarn.lock` 保留不动，项目继续使用 npm。

## 回退

如需回退，应同时还原本次 package.json/package-lock.json、配置迁移和两处 useDoc 引用，再运行 `npm ci` 与双语构建，不能只回退核心包版本。

## 本地开发服务排障

升级后曾复现：4173 生产预览正常，3000 开发页面报 `useNavbarMobileSidebar is called outside the <NavbarMobileSidebarProvider>`。检查发现依赖目录已变成 pnpm 链接布局，开发调用栈同时包含普通 node_modules 与 .pnpm 路径。恢复方法是停止开发和预览进程、清理生成缓存、按 npm 锁文件重新执行 `npm ci`，然后重新构建和启动服务。

package.json 增加 `packageManager: npm@10.8.1` 与 `preview` 脚本，README 明确两个端口和升级后的重启流程。生产构建验收不能代替开发服务浏览器验收。

恢复验证：双语构建成功；3000/4173 首页均完成 hydration，浏览器无运行时异常。3000 中文开发服务的 9 项适用交互检查通过；开发服务单次仅提供一个语言，不用于验收 `/en`。4173 双语生产预览完整 11 项交互检查通过。
