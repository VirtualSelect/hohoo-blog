# Hohoo GPU Hero 验收记录

日期：2026-09-12。分支：`codex/sci-fi-particle-lab`。范围：`apps/astra-hero` 独立 Next.js 应用，预览 `http://localhost:4180/`；原博客保留。

## 已完成

Hohoo SVG 笔画按弧长采样为 Float DataTexture，THREE.Points + BufferGeometry 的主体位置在 Vertex Shader 计算。五条深度/相位不同的星臂沿路径流动，确定性法线扩散和非均匀星光形成三维星云。第二阶段 FBO ping-pong 已启用，RG/BA 分别保存位移/速度。

Bloom、悬停径向排斥与弹簧回归、拖拽惯性、三个滚动 uniform 的形态混合、移动端降级、DPR 限制、reduced-motion、离屏暂停及资源释放均已实现。正文和静态品牌支持无 JavaScript 阅读。

## 验证结果

- Next.js 生产构建与 TypeScript 检查通过。
- 浏览器验证：GPU 初始状态有限、位移缓冲不由 CPU 更新；划散后 4.5 秒的位移能量低于初始的 3%。
- 拖拽、惯性衰减、方向键、空格、复位和暂停持久化通过。
- 滚动仅改变三个形态 uniform；离开 viewport 后渲染计数停止。
- reduced-motion 停止持续渲染并禁用滚动/划散动效。
- 1440、1280、1024、768、430、375px 无横向溢出；模拟手机触控旋转通过。
- WebGL 上下文丢失的静态降级及重建通过；无 JavaScript 时正文可读。
- 测试未发现 JavaScript 异常、资源错误或 shader 编译错误。

## 实测性能

生产模式，Windows Headless Edge，ANGLE / NVIDIA GeForce GTX 1660 Ti / Direct3D11。以下为短时稳定帧采样，不代表所有硬件的持续性能保证。

| 场景 | 粒子数 | 实际 DPR | 平均帧率 | P95 帧间隔 |
| --- | --- | --- | --- | --- |
| 桌面 1440×1000，240 帧 | 32,768 | 1 | 60.00 FPS | 16.8 ms |
| 桌面 1440×1000，180 帧 | 32,768 | 2 | 约 60 FPS | 16.8 ms |

手机模拟 390×844、请求 DPR 3，自动降至 8,192 粒子、DPR 1.5、Bloom 比例 0.35。此测试仍使用桌面 GPU，不能作为实体手机性能结论。

应用渲染循环经过代码检查：没有逐粒子 JS 更新、临时 Vector/Object 创建或每帧数组构造；诊断快照及 FBO 读回只在显式测试时运行。未宣称浏览器/Three.js 全进程零分配或零 GC。

## 限制

- 尚未测试实体手机的温控、功耗和长时间帧率。
- Headless 后端未暴露真实标签页可见性转换，`visibilitychange` 路径已实现但该项未做真实后台切换验收；viewport 暂停已验证。
- 视觉按要求固定为黑色；独立页面没有主题切换，原博客主题逻辑保持独立。
- 未部署或替换正式博客首页。机器可用时，本地 4180 预览是本次 GPU 版本，4173 为原博客预览。

复现命令及模块说明见 `apps/astra-hero/README.md`；浏览器脚本为 `apps/astra-hero/tests/browser.cjs`，本地产物为该应用 `test-results/`（不纳入版本控制）。
