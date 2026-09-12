# Hohoo GPU Particle Hero

独立 Next.js + TypeScript + Three.js 视觉应用，预览端口 **4180**。现有 Docusaurus 博客继续使用根目录的配置、依赖与路由；本应用不复制博客内容。

## 运行

在本目录执行 `npm ci`，随后运行：

```sh
npm run dev
npm run typecheck
npm run build
npm start
```

`dev` 与 `start` 使用同一端口，不能同时运行。开发和构建明确使用 Webpack，通过 `asset/source` 导入原始 GLSL，不需要 shader loader。

## 实现结构

React 页面组件位于 `components/AstraParticleHero/`；场景、粒子、路径、模拟与 shaders 的唯一实现已提取到仓库 `src/components/AstraParticleHero/`，本应用通过转导出复用，博客 `/about` 也使用这套实现。独立启动前还需在仓库根目录执行 `npm ci`，提供共享模块的 Three.js 与类型依赖。

- `index.tsx`：SSR 静态品牌、客户端按需加载、键盘/按钮控制、暂停偏好和失败重试。
- `pathTexture.ts`：读取 `public/hohoo.svg`，对每条笔画分别按弧长采样为 Float DataTexture；RG 保存坐标，BA 保存切线。笔画分行储存，避免跨笔画产生连接线。
- `particles.ts`：一次性生成 BufferGeometry 属性（size、brightness、phase、progress、branch、path、simUV）；五条星臂具有不同相位与深度，粒子位置缓冲保持不变。
- `shaders/shape.glsl`：Vertex Shader 和 FBO 共用路径采样、法线扩散、确定性 hash、三维形态计算。路径流动由时间与 progress 驱动。
- `shaders/particle.vert` / `.frag`：GPU 位置与透视尺寸、柔和光晕、亮星核心、少量十字星芒、导数抗锯齿；白、淡蓝、淡金采用不均匀亮度分布。
- `simulation.ts` 与 `shaders/simulation.vert` / `.frag`：第二阶段已实现。两个 HalfFloat FBO 交替读写，RG 存局部 offset，BA 存 velocity；固定 1/60 秒弹簧积分，每帧至多两步。
- `scene.ts`：渲染器、相机、Bloom、统一 uniform、拖拽惯性、暂停/可见性与质量降级、资源释放。

悬停排斥在投影空间检测，在局部坐标中积分并缓慢恢复。滚动仅驱动 `uScatterProgress`、`uShapeProgress`、`uRotationProgress`，形态通过 shader 中的 `mix()` 混合。拖拽旋转独立于滚动。

## 性能与降级

| 初始配置 | 桌面 | 手机/粗指针 |
| --- | --- | --- |
| 主体粒子 | 32,768 | 8,192 |
| DPR 上限 | 2 | 1.5 |
| Bloom 输入尺寸比例 | 0.7 | 0.35 |
| FBO 边长 | 256 | 128 |

持续慢帧会进一步减少绘制数量、DPR 和 Bloom 分辨率。主循环不遍历粒子，不创建临时 Vector/Object；向量、矩阵和计时环形数组预分配。Three.js 内部和浏览器自身仍可能分配内存，不能将此等同于全进程零 GC。

离开 viewport、页面隐藏、用户暂停时停止连续渲染。`prefers-reduced-motion` 禁用连续流动、滚动变形及划散，保留静态字形和直接旋转控制。暂停偏好存储于 `huhohoo.astra-motion.v1`。

无可渲染浮点附件时，回退到 Vertex Shader 悬停排斥并关闭 Bloom；WebGL 不可用时展示静态 Hohoo。上下文丢失后允许显式重试重建资源。卸载会移除事件、观察器并释放 GPU 资源。

## 交互与验证

移动鼠标划散，按住拖动旋转，松手后惯性衰减；方向键旋转，空格划散，R / Escape 复位。页面提供可聚焦按钮和暂停控制。

`/?debug=1` 提供 `window.__astra.snapshot()` 性能快照和 `sampleSimulation()` FBO 检查。后者会同步读回 GPU 数据，**仅用于测试，不应逐帧调用**。普通 URL 不暴露调试入口。

`npm run test:browser` 使用外部 Playwright 运行时（默认解析 `playwright`，或通过 `PLAYWRIGHT_MODULE` 指向其模块目录）。Windows 使用已安装的 Edge；其他平台需要 Playwright Chromium。先启动生产服务器，可通过 `ASTRA_URL` 覆盖地址。报告和截图写入被 Git 忽略的 `test-results/`。

新增生产依赖仅 Next.js、React、React DOM、Three.js；Three.js 是用户要求的 GPU/FBO 渲染实现，Bloom 复用其 addons。图形代码在客户端按需加载，服务端不访问 WebGL/DOM。独立 lockfile 避免影响博客依赖。详细实测与限制见 `../../reports/ASTRA-GPU-ACCEPTANCE.md`。
