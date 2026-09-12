# 关于 Hohoo：GPU 首屏接入验收

日期：2026-09-12。预览 `/about`、`/en/about`，原 `/aboutMe` 兼容入口保留。

## 实现

- 框架无关的 scene / particles / pathTexture / simulation / shaders 统一位于 `src/components/AstraParticleHero`；独立 Next.js 应用通过转导出复用，保留原预览。
- 博客新增 `three@0.186.0` 与开发类型 `@types/three@0.186.0`。无新增动画库、React 框架或 CSS 框架；新增 Webpack `asset/source` shader 规则。
- 关于页在客户端动态加载场景，SVG 使用 `useBaseUrl` 定位本地静态资源。没有 iframe，没有 localhost 生产链接。
- 完整 Hohoo SVG 星群、五条星臂、Bloom、FBO 模拟与拖拽惯性；按钮仅拨散、复位、暂停，键盘说明视觉隐藏。
- 滚动通过原有三个形态 uniform 展开粒子，首屏画布与控件同时淡出，底部渐变接续当前主题；“了解我”可直接跳到正文。
- 原有简介、当前关注、精选作品、做事方式、工具、生活与社交、评论保留。一个语义 H1，正文静态输出，SSR 不访问 WebGL。
- 监听器、观察器、RAF 和 GPU 资源在卸载时释放。移动端降级、暂停偏好、reduced-motion、无 WebGL 静态回退及失败重试继承场景能力。

## 验证

- 根目录 `npm run build`：中文、英文通过。
- 独立应用 `npm run build`：构建与 TypeScript 检查通过。
- `scripts/verify-about-astra.cjs`：GPU FBO 状态、拨散、拖拽、键盘、复位、暂停、滚动变形与淡出、正文锚点通过。
- 1440/1280/1024/768/430/375、深浅主题无横向溢出。
- 离屏渲染计数停止；通过站内导航返回首页后调试场景被清理。
- 英文控件、reduced-motion 停止连续渲染、无 JS 正文可见通过。
- 桌面 Edge、1440×1000、DPR 1、32,768 粒子，240 帧短时采样约 60 FPS，P95 帧间隔 16.8ms。该结果不是所有设备保证。
- 手机模拟确认 8,192 粒子、DPR 1.5、Bloom 比例 0.35；不作为实体手机帧率结论。
- 未发现页面 JS 异常或 shader 错误。已查看首屏、正文过渡与手机截图，存于临时目录 `hohoo-about-astra`。

当前为本地实现，未提交／部署。实体手机温控、功耗及持续帧率尚未验证。
