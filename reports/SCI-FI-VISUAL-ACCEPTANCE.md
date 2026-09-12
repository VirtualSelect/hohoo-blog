# Hohoo 交互粒子字形验收

开发分支：`codex/sci-fi-particle-lab`。本报告记录原博客的 Canvas 版本：以用户提供的 GPT-6 Astra 截图和交互描述为视觉参考，该版本无新增生产依赖。后续独立 Next.js GPU 版本见 `ASTRA-GPU-ACCEPTANCE.md`。原有未跟踪锁文件保留；本地合并不代表部署上线。

## 最终实现

- 宽幅近黑星空首屏，蓝白星点、少量暖色亮星、有纵深的完整 Hohoo 字形。
- 字形由 Canvas 字体像素采样生成的粒子组成，无普通文字叠加；SSR 和 Canvas 不可用时显示静态 Hohoo。
- 鼠标悬停拨散、按住拖动旋转、弹簧回归、复位按钮。
- 键盘方向键旋转、空格拨散、R/Escape 复位；按钮可操作。
- 触屏使用 Pointer Events；`touch-action: pan-y` 保留纵向阅读滚动。
- 全站暂停和系统减少动态效果暂停连续渲染；此时仍可手动旋转、复位，拨散按钮禁用。
- 首页原有介绍、项目、原创与外部 Radar 内容位于交互首屏之后。

## 验证

- `npm run build`：中英文生产构建通过。更新检查因本机配置目录权限出现提示，不影响构建。
- 独立无头 Edge / Playwright：无页面 JS 错误。
- 实测字形采样；悬停后点坐标变化；移开 3.2 秒后恢复（均方根位移小于 0.3px）。
- 实测拖动三维旋转、复位、方向键和空格操作。
- 实测暂停后 Canvas 停止连续重绘；模拟 prefers-reduced-motion 后同样停止，拨散禁用。
- 实测 1440 / 1280 / 1024 / 768 / 430 / 375，无横向溢出。
- 桌面、旋转后、手机与浅色主题截图检查完成；英文首页交互控件可用。
- 禁用 JavaScript 后仍显示静态 Hohoo 和主体内容。
- 本任务之前的内容索引与 phase2 测试 10/10 通过；本轮没有改动数据逻辑。

## 复跑浏览器检查

脚本：`scripts/verify-particle-wordmark.cjs`。
先启动 `npm run preview`，再使用已有 Playwright 环境运行脚本。可通过 `PLAYWRIGHT_MODULE` 指向本地/捆绑的 Playwright 模块，不需要给生产项目安装新依赖。

```powershell
node scripts/verify-particle-wordmark.cjs
```

可选环境变量：`WORDMARK_BASE_URL`（默认 localhost:4173）、`WORDMARK_SCREENSHOT_DIR`（默认系统临时目录）。Windows 使用已安装 Edge；其他平台使用 Playwright Chromium。

## 限制

内置浏览器工具连接不可用，因此本轮使用独立无头浏览器验收。未在实体手机上测试触摸手感，也未进行低端设备性能剖析；未声称与参考站点的 WebGL/Shader 实现完全相同。
