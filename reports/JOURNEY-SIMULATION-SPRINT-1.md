# 学习之旅：仿真优先 Sprint 1 验收

## 1. 当前项目分析

已有 Next.js App Router 捕获路由、Shell、搜索、三语言 code.json、主题变量和服务端 Journey 页面。Journey 已有三轨、10 个里程碑、8 周建议计划、校验与真实 Java 教程引用，但没有实验室模型和仿真关联。原 `/labs` 负责正式实验内容，不能把计划当作已完成实验混入。

本轮选择 `/journey/virtual-lab` 作为学习之旅子页面，不增加一级菜单，不替换 `/labs`，也不删除旧学习路线、文章、项目或访客阅读进度。主项目目前只有规划身份，因此目标架构放在 Journey 内，独立 Projects 模块留待 Sprint 2。

## 2. 新增文件（相对上一轮 Journey）

- `data/journey-labs.json`：仿真引擎注册表、四个实验计划。
- `apps/web/components/JourneyShared.jsx`：服务端共用流程、状态、实验链接与本地化读取。
- `apps/web/components/JourneySimulation.jsx`：仿真路线、目标架构、闭环与 Sim2Real。
- `apps/web/components/VirtualLab.jsx`：虚拟实验室基础页面。
- 本验收报告。

## 3. 修改文件

- `data/journey.json`：十个里程碑、新版周计划、当前周/实验、目标架构、仿真与未来阶段。
- `apps/web/components/Journey.jsx`、`Journey.module.css`：整合入口、关联和响应式。
- `apps/web/components/Shell.jsx`：搜索中的 learning 类型显示“路线图”，避免误显示“学习中”。
- `apps/web/app/[[...segments]]/page.jsx`：新增页面分发和多语言 metadata。
- `apps/web/scripts/content.mjs`：关联校验、路由和搜索索引。
- `apps/web/lib/journey.mjs`、`apps/web/tests/journey.test.mjs`：Lab 类型、证据和关系校验及测试。
- `i18n/{zh-CN,zh-TW,en}/code.json`：固定标签、实验目标、环境、流程及状态。
- `docs/JOURNEY.md`、`docs/ROADMAP.md`、`docs/CONTENT-MODEL.md`、`docs/I18N.md`：模型和范围同步。

用户原有 package-lock.json 改动、pnpm-lock.yaml、yarn.lock 保留。未新增依赖，未安装模拟器，未创建外部仓库。

## 4. Journey 数据模型

沿用 version 1 和 M1–M10 稳定 ID、日期、状态、文章引用；新增 currentWeek / currentLab / recommendedLab、targetProject.architecture、simulation 以及 weeks[].labs。

simulation 包含实验顺序、运行闭环、训练闭环、机器人数据平台架构、Sim2Real 链路与两个未来阶段。currentWeek / currentLab 为 null；页面不推算假进度。原 25% / 15% / 60% 保持为计划投入比重。

## 5. Virtual Lab 模型

SimulationEngine 为 id / name；SimulationLab 包含 id、slug、order、titleKey、descriptionKey、engine、status、robotKey、environmentKey、topics、skills、milestones、project、steps、articles、demos、github、evidence、result、startedAt、completedAt。

JSDoc 位于 journey.mjs。构建检查未知引擎、项目、里程碑、实验引用、重复 ID / slug、日期、状态与不安全链接。completed 要求日期、结果与证据；planning / future 不得填写虚构执行成果。

## 6. Roadmap 与架构

三轨汇合为 Agent + VLM + 机器人数据 → 具身智能体 → VLA。

仿真阶段：MuJoCo → Gazebo + ROS2 → ManiSkill → Isaac → Sim2Real → 真实机器人。模拟器不是一次性安装清单；Isaac 和真实硬件是后续阶段。

项目目标架构覆盖用户、聊天界面、LLM、Agent、任务规划、VLM、机器人工具、ROS2、策略、仿真引擎、虚拟机器人、观测、数据平台、数据集、LeRobot 与训练。架构明确标为待实现。

运行闭环：环境 → 观测 → 感知 → 推理/规划 → 策略 → 行动 → 环境。
训练闭环：Episode → 数据集 → 训练 → 新策略。
数据平台：虚拟机器人 → RGB/Depth/状态/动作 → 采集 → 同步 → Episode → MP4 + Parquet → 数据集 → 质量检查 → LeRobot Dataset。

## 7. 十个里程碑与八周安排

| 周次（建议） | 里程碑 | 目标 |
| --- | --- | --- |
| 1 | M1、M2 | 自然语言到机器人任务；Agent 与模拟工具 |
| 2 | M3 | Agent 接入 ROS2 |
| 3 | M4、M5 | ROS2 到虚拟机器人；MuJoCo 抓取与放置 |
| 4 | M6 | 机器人数据平台与 Episode |
| 5 | M7 | 机器人知识助手 / RAG |
| 6 | M8 | 虚拟相机、视觉与 VLM |
| 7 | M9 | 机器人策略学习 / LeRobot / ACT |
| 8 | M10 | VLA 虚拟机器人 |

所有节点仍为未开始。八周无实际起始日期，不承诺在固定日期完成。

## 8. 四个 Virtual Lab

| ID | 实验计划 | 关联里程碑 | 状态 |
| --- | --- | --- | --- |
| VL01 | MuJoCo 抓取与放置 | M4 / M5 | 计划中 |
| VL02 | ROS2 + Gazebo 系统与虚拟传感器 | M3 / M4 / M8 | 计划中 |
| VL03 | ManiSkill 机器人学习 | M6 / M9 / M10 | 计划中 |
| VL04 | Isaac 物理 AI、合成数据与迁移 | M10 后续 | 未来阶段 |

每个实验展示引擎、机器人与环境选择范围、验证问题、计划步骤、技能、主项目和里程碑。暂无成果时不渲染视频、代码、数据集或指标按钮。

## 9. 页面路由

- 保留 `/journey`、`/zh-TW/journey`、`/en/journey`。
- 新增 `/journey/virtual-lab`、`/zh-TW/journey/virtual-lab`、`/en/journey/virtual-lab`。
- 实验室使用稳定 slug 锚点；里程碑保持 #M1–#M10。
- 新路由进入原有搜索与 sitemap，canonical / hreflang 继续由现有 metadata 生成。实验计划不进入已发布内容、RSS 或 Timeline。

## 10. 响应式与可访问性

两个页面都检查 1440 / 1280 / 1024 / 768 / 430 / 375，没有横向溢出。桌面实验元数据与正文两列、仿真阶段四列；窄屏转为单列和纵向流程，不缩放桌面图。

复用主题 tokens，深浅主题可读；details 可用 Enter 展开，锚点和关联链接可用，main / heading / article / dl 提供语义结构。核心正文由服务端渲染，无新增动画和图形依赖。

## 11. 国际化与验证

简体、繁体、英文沿用 code.json。普通 UI 和流程节点翻译，MuJoCo、ROS2、LeRobot、ACT 等技术专名保留。浏览器已核对三语言标题、状态、关联路径和中文搜索。

- Web 测试 17 项通过；原根目录测试 48 项通过，共 65 项。
- 生产 build 通过，148 个生成参数页面。捕获路由仍为按请求服务端渲染，不宣称整站纯静态。
- i18n:check 完成；修改的代码格式检查通过。
- 路由验证 129 页面，errors=[]。
- 浏览器检查主题、键盘展开、实验室往返里程碑、架构展开、搜索、三语言和六种宽度。检查期间没有 console error / warn。
- 项目没有独立 lint / typecheck script，未虚报运行；沿用 JavaScript / JSX，不增加 TypeScript 工程。

## 12. 未完成内容与限制

这是学习规划与展示基础，不是机器人仿真系统。未安装模拟器、执行机器人、采集数据、训练 ACT/VLA、集成 Isaac，也没有 Dataset Dashboard、Career Matrix、完整 Skills/Progress 或 22 篇文章正文。无虚构成果、指标、日期、GitHub 链接。

状态仍由仓库维护，没有编辑后台或账户同步。未做新的 Lighthouse 性能基准或完整辅助技术审计。开发预览首次导航可能等待编译；加载完成后测试交互可用。

## 13. Sprint 2 建议

围绕主项目实现 Projects / Skills / Progress，用实际代码、文章与实验记录作为进度依据；不根据计划勾选自动宣称掌握技能。Sprint 3 为 Career Matrix，4 为知识节点与文章关联，5 为真实 GitHub / Demo / 结果 / 数据集，6 为真实数据管线后的 Dashboard。

本轮停在 Sprint 1，未提交、推送或发布，等待用户下一步指令。
