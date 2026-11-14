# 3D建模、取景与原版星空修复 · 2026-11-14

分支：`codex/ai-lab-reimagined-20261112`。本轮修复保持现有八主题、主干精简后的内容与原URL，没有新增依赖。本轮改动尚未提交、合并、推送或发布。

## 实际问题与修复

此前页面容器和按钮检查通过，并不足以证明模型可见。复现发现固定相机、创建时的桌面缩放与不完整的尺寸更新导致模型本体裁切；例如B首页375px展开后横向投影范围达到[-1.307, 1.418]，C桌面与H、E手机亦有越界。

新的`theme-artwork-framing.ts`直接收集可见几何的世界坐标顶点，包括实例几何，忽略隐藏对象和投影装饰。相机距离根据真实投影、实时宽高比与0.84安全占比计算；形变、转动、窗口缩放与全屏时重新取景。移除桌面非等比缩放，不以外容器无溢出来代替模型检查。

模型补全黑曜外壳与晶核、闭合金属带厚度、纸页折面、铝梁/黑陶结构、亚麻曲面和统一基座。C使用不对称折纸山脊，H使用书页与升起的折纸。关于页主题场景使用真实双栏，窄屏按介绍、场景及控制顺序排版，不再覆盖文字。

## 固定主题装置与彩蛋

首页取消五装置选择器及`huhohoo.artwork.v1`读取/监听。已有旧值不清除，但不能覆盖主题映射。主题变化恢复对应形态和彩蛋，保留暂停状态。

| 主题 | 首页固定装置 | 主题彩蛋 |
| --- | --- | --- |
| A / space | 黑曜晶核 | 小熊星座 |
| B / clear | 液态回路 | 莫比乌斯带 |
| C / classic | 折光生长 | 折翼纸鹤 |
| D / garden | 折光生长 | 星籽蝴蝶 |
| E / photo | 液态回路 | 九叶光圈 |
| F / construct | 悬浮计算体 | 机械花 |
| G / map | 光织之幕 | 超立方体投影 |
| H / chapters | 折光生长 | 书页纸船 |

八种彩蛋有不同的实际几何签名；名称、可访问说明与实际对象一致。超立方体明确标为数学艺术示意，不作为真实知识关系或实验结果。

## 原版星空恢复

原版场景、着色器及星座数据保留。`AstraParticleHero`增加嵌入模式，避免重复H1和重复跳转入口；按实际导航尺寸适配，不使用固定72px假设。

关于页顶部增加「主题场景 / 原版星空」。A默认原版星空，其他主题默认各自新场景；用户明确选择后跨主题保留，`?experience=stars|theme`支持直接分享、浏览器前进/后退，并保留其他参数与锚点。两个体验互斥挂载，避免同时创建两套画布。原版在介绍前占据整行，保留Hohoo星群、五组星座、流星、拨散、复位、暂停、小熊及原键盘交互。

## 材质来源与资源

三张装饰性表面材质由内置图像生成工具制作，用于真实WebGL网格的颜色、细小凹凸和粗糙度；不是设计图背景，也不是实测资料。完整提示词存放于[素材记录](../static/media/artwork/prompts.json)，用途见[素材说明](../static/media/artwork/README.md)。

| 网页文件 | 大小 |
| --- | --- |
| `static/media/artwork/obsidian-albedo.webp` | 50,892 bytes |
| `static/media/artwork/paper-albedo.webp` | 206,368 bytes |
| `static/media/artwork/linen-albedo.webp` | 604,118 bytes |
| 合计 | 861,378 bytes |

三张均为1254×1254，同分辨率WebP优化采用已有Sharp；无新增图像依赖。生成PNG原稿保存在本次会话可视化目录`artwork-materials`，网页仅提供WebP。实际材质绑定核验包含map、bumpMap、roughnessMap、UV与图片尺寸。加载失败回退程序材质，暂停或减少动态效果时加载完成只补绘一帧；已销毁场景不会被迟到的图片结果重新绘制。

## 验证结果

- `npm run test:web`：256/256，通过新增7项取景与2项材质生命周期测试。
- `npm run typecheck`、`npm run format:check`、`git diff --check`：通过。
- `npm run build`：通过，616个静态页面，估算静态输出152,664,769 bytes（145.59MiB），低于250MB门禁。
- `PREVIEW_URL=http://localhost:4227 npm run test:routes --prefix apps/web`：597路由，错误列表为空。
- 实际生产页面核验八主题固定映射、无装置选择器及八次旧偏好事件无效。
- 正式页面43组模型取景样本（35组历史裁切/变形/缩放案例与8种彩蛋）：最大绝对投影坐标0.8400000000000003，最小主方向可见占比0.65960566，无模型越界、过小或介绍重叠。
- 原版与主题体验完成八主题六档宽度及1265×712矮窗口检查；原版流星、拨散/复位、暂停、键盘、小熊、URL历史与单画布行为通过。375px原版星群、星座和控制保持可见。
- 生产浏览器无pageerror或console error；三张WebP请求成功且实际绑定，公开材质目录无PNG副本。

## 实际截图与边界

截图和机器验收记录位于：

`C:/Users/Hohoo/.codex/visualizations/2026/11/12/01a1ce5f-4beb-75d1-8f61-7efba060f4f6/`

- `original-stars-production-desktop.png`、`original-stars-production-mobile.png`：恢复后的完整原版星空。
- `production-artwork-E-about-context.png`：E关于页实际亚麻材质与双栏。
- `production-artwork-B-home-context.png`：B首页固定装置与上下文。
- `production-artwork-repair-report.json`、`production-original-stars-report.json`：生产版验收。
- `artwork-old-framing-20261113/`与`artwork-visual-qa-notes.md`：旧问题复现。

自动检查证明了布局、几何边界、资源与交互行为，不等同于对美感的认可。运行时仍采用现有Three.js的轻量实时光照和材质近似，实际效果以网页及上述真实截图为准，不承诺离线渲染稿的全部光学效果。现有未知路由NoFallbackError日志与构建缓存警告不在本轮改动范围，实际404响应与正式构建通过。

本地正式预览：`http://localhost:4227/`；原版星空：`http://localhost:4227/about?experience=stars`。本地预览进程需保持运行。
