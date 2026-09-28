# 两篇实践文章交付 · 2026-09-28

## 交付与边界

作者授权由 Codex 完成代码、实际执行、证据整理和文章。文章未声明作者本人已复现、掌握或人工审校；英文与繁体版本为 AI_TRANSLATED。博客位于 `codex/practice-articles-20260927`，仅本地预览，尚未合并或部署生产。

| 交付 | 内容位置 | 固定代码提交 |
| --- | --- | --- |
| Java LLM 第二篇 | `/docs/ai-apps/java-structured-output` | `VirtualSelect/hohoo-ai-lab@0f91065aeac1cb1da22a20ec87a2ab2c14b21938` |
| 具身智能第一篇实践 | `/docs/embodied-ai/mujoco-first-pick-place` | `VirtualSelect/hohoo-embodied-agent@17144c47a2294f157420946b15f78c49d8d17dd5` |

两个独立工程分支已推送，固定提交的 README 和证据文件可从 GitHub 读取（HTTP 200）。Java 分支 `codex/structured-output-20260927`；具身分支 `codex/mujoco-first-practice-20260928`。日期差异源自开始工作时间，不改变实际执行日期。

## Java：结构化输出验收

- 保留 Java 8 / Gson / HttpURLConnection，新增 Demo04；输出 JSON 与 API envelope 分层校验。
- 四次真实 API 尝试：第一次HTTP200、stop，模型正文带JSON围栏，严格入口拒绝；其余三次读取超时（其中一次为显式json_object探测）。JSON模式支持情况未确认。
- 首次回答经过显式单一围栏适配后，离线重放通过。没有将重放伪装为新在线成功。
- 35项离线检查通过：字段、类型、枚举、重复键、标签、C0/C1控制字符、围栏适配、协议、HTTP故障。fixture不是模型评测数据。
- 正式原始记录、失败、UTC时间、版本与一次实际Token用量均保留；密钥、响应头和reasoning_content不入库。没有自动重试、自动发布或虚构超时计费。
- 编译与自检环境：Java1.8.0_171、Maven3.6.3、Gson2.10.1。用户早先的Java1.8.0_341与本轮实际执行版本不混淆。

## 具身：接触抓取与偏差对照

- 原创教学级笛卡尔夹爪，三个平移关节、两个夹指；MuJoCo接触与摩擦，无焊接约束或物体传送。
- Windows x64 / Python3.12.14 / MuJoCo3.3.7 / NumPy2.2.6。固定0 / 25 / 50 mm拾取目标偏移，各三回合、每回合9.2秒；无随机化。
- 0 mm三回合满足冻结协议，25 / 50 mm六回合未抬起方块；不是泛化成功率、真实机器人精度或Benchmark。
- 全部九回合CSV、states.jsonl、events、summary；三个原始视频、27张阶段截图；汇总、环境manifest、冻结协议、CSV生成的轨迹PNG/SVG与复核记录。
- 正式证据目录 `evidence/vl01-20260928-v2`。实际执行提交 `4128ea683e8705db40487dc9cc520069c3393e0f`，原始manifest同时记录dirty与源文件哈希。后续交付提交增加分析/文档/重放检查，未修改这批原始轨迹。
- 五项契约测试通过，九条保存的CSV复核通过，保存状态的视频重放通过。分析前核对源文件与冻结协议，允许Git文本换行差异，拒绝其他版本差异。
- 高层控制固定时间推进，抓取失败后仍会继续搬运；下一步应验证抬起失败时停止。完整VL01、M4/M5、ROS2和训练路线不标为完成。

## 博客整合与展示

- 两篇三语正文，共六份文稿；定义、最小代码、原始结果、失败边界、复现命令、自检与来源齐备。
- 新增真实具身项目003；Java项目由三个Demo更新为四个；所有代码入口固定提交。
- 复用学习步骤structured-output / first-simulation以及既有VL01；新增文章进入首页近作、文章、搜索、专题与时间轴。A1历史策略、L1上下文实验继续保留待办。
- 项目正文及配套资源在有manifest译文时显示对应语言，不将中文正文伪装成译文。
- 两段视频使用原生控件，本地受限路径，preload=none，不自动播放；相邻文字解释过程。博客只复制需要展示的产物（约331KB），完整证据保留在工程仓库。
- 无新增博客依赖。仿真工程使用固定版本MuJoCo、NumPy、Pillow、imageio、imageio-ffmpeg、Matplotlib，完整依赖快照位于requirements-lock.txt。

## 验收

- `npm run test:web`：67/67。
- 内容索引、学习索引、本地化测试：10/10。
- `npm run i18n:check`：无翻译过期提示。
- `npm run build`：202个静态生成页面/框架路径构建成功。
- `test:routes`：183个内容路由、兼容重定向、RSS与404检查通过。
- Chrome/Playwright：两篇文章×三语言×六档屏宽（1440/1280/1024/768/430/375）×两主题，72组无横向溢出；无pageerror或console error。
- 六次视频播放验证通过，播放前无MP4请求；复制代码、键盘展开自检、Ctrl+K搜索、Escape、切换语言保持主题和返回顶部通过。
- 三语项目、VL01与Learning入口可用；禁用JavaScript时，两篇核心正文仍可读。
- 浏览器工具：当前未安装agent-browser CLI，使用已提供的Playwright与本机Chrome完成同等验收。
- 本次改动文件格式检查通过。全站format:check仍报告55个既有未修改文件，不为本任务批量重排这些文件。仓库没有独立lint/typecheck命令；Next构建自带检查已通过。

完整浏览器结果见 `practice-browser-results.json`；桌面、移动端、视频和表格截图同目录。既有未提交的package-lock.json、pnpm-lock.yaml、yarn.lock未纳入本次提交。

## 本地预览

- http://localhost:4202/docs/ai-apps/java-structured-output
- http://localhost:4202/docs/embodied-ai/mujoco-first-pick-place
- http://localhost:4202/projects/hohoo-embodied-agent

下一步：作者从Java离线自检和响应重放开始复现，然后运行MuJoCo无渲染版本，亲自解释成功判定；作者确认内容后再决定博客主干发布。没有擅自执行额外真实模型请求或开始下一课。
