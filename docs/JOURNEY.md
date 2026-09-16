# Hohoo AI Journey · 仿真优先 Sprint 1

## 本轮升级

新增 `/journey/virtual-lab`，与已有 `/labs` 的正式实验内容分离：这里维护虚拟实验计划，不能据此推断实验已完成。保持 `/journey` 为唯一一级入口，中文导航为「AI 学习之旅」，繁体为「AI 學習之旅」。

仿真路线是 MuJoCo → Gazebo + ROS2 → ManiSkill → Isaac Sim / Isaac Lab → Sim2Real → 真实机器人。后三者属于后续阶段，不要求当前购买硬件；模拟器按实际阶段接入，本轮不安装模拟器、不统一其接口。

## 数据与组件关系

- `data/journey.json` 沿用 version 1，增量添加 `currentWeek`、`currentLab`、`recommendedLab`、主项目 `architecture`、`simulation` 和每周 `labs`。未知当前周与当前实验为 null，不用日期推算假进度。
- `data/journey-labs.json` version 1：`engines` 注册引擎 ID / 名称，`labs` 管理实验计划。引擎、里程碑、主项目与周计划通过 ID 关联。
- `SimulationLab` 字段：id、slug、order、titleKey、descriptionKey、engine、status、robotKey、environmentKey、topics、skills、milestones、project、steps、articles、demos、github、evidence、result、startedAt、completedAt。JSDoc 类型和构建前校验在 `apps/web/lib/journey.mjs`。
- Lab 状态为 planning / learning / completed / future；前三个实验室为 planning，Isaac 为 future。completed 必须有实际开始/完成日期、结果与证据。未执行实验不得填入成果字段。
- Lab 的资源项采用 `{titleKey, href}`；result 是翻译键。日期与链接不是翻译内容，文字共用现有 code.json。未完成的内容不制造按钮或死链接。
- `JourneySimulation`：仿真阶段、主项目目标架构、运行与训练闭环、数据平台架构及未来 Sim2Real。
- `VirtualLab`：实验室页面，展示引擎、机器人、环境、验证目标、步骤、技能与里程碑。
- `JourneyShared`：服务端翻译读取、流程列表、实验室链接与状态；复用 `Journey.module.css`，不创建新主题或布局外壳。

单条实验计划不加入已发布文章、正式项目、RSS 或 Timeline。以后确有实验结果时，再关联真实 Lab / Project / 文章，避免重复维护正文。

## 四个虚拟实验室

| 实验室 | 里程碑 | 建议阶段 | 当前状态 |
| --- | --- | --- | --- |
| VL01 MuJoCo 抓取与放置 | M4、M5 | 第 3 周 | 计划中 |
| VL02 ROS2 + Gazebo | M3、M4、M8 | 第 6 周启动 | 计划中 |
| VL03 ManiSkill 机器人学习 | M6、M9、M10 | 第 7 周启动 | 计划中 |
| VL04 Isaac 物理 AI | M10 后续探索 | 第二阶段 | 未来 |

八周计划是建议节奏：第 1 周 M1/M2，第 2 周 M3，第 3 周 M4/M5，第 4 周 M6，第 5 周 M7，第 6 周 M8，第 7 周 M9，第 8 周 M10。已有 M1–M10 ID 和作者状态保留，只升级目标、知识与仿真关联。后续实际学习进度可调整安排，不视为完成承诺。

入口为 `/journey`，三语言共用路由结构。顶部导航的学习入口改为 AI Journey；原 `/learning`、阅读进度与收藏不迁移、不删除，通过 Journey 和现有上下文继续访问。

## 维护入口

- `data/journey.json`：版本 1，三条主线、计划比重、十个里程碑、依赖、八周建议节奏与以后探索列表。比重是投入计划，不是完成率。
- `i18n/{zh-CN,zh-TW,en}/code.json`：`journey.*` 文案；模型保存文案键和专有名词，不维护另一套翻译系统。
- `apps/web/components/Journey.jsx`：服务端页面，原生 details 展开详情、锚点导航；桌面三列，手机纵向路线。
- `apps/web/lib/journey.mjs`：构建前验证状态、依赖环、日期及完成证据。

## 里程碑

每条包含 `id`、`titleKey`、`goalKey`、`tracks`、`prerequisites`、`knowledge`、`status`、`startedAt`、`completedAt`、`articles`、`code`、`demos`、`evidence`、`issues`、`result` 和 `next`。

状态只有 `not-started / learning / building / completed`。这是作者项目状态，不是访客的本地阅读进度。开始和结束日期未知时保持 null；没有执行记录时保留空数组和 null。已完成必须有实际日期、结果与证据。证据项使用 `{title, href}`，应指向真实实验或代码记录。code / demos 为后续项目展示预留，本阶段不创建展示页。

开始一个节点时，将 status 改为 learning 或 building 并填写真实开始日期。实践后维护 issues、result、evidence；完成验证后才改为 completed。修改中文 UI 时同步三语言文案。运行 `npm run test:web` 和 `npm run build`，再检查三语言页面。

已有 Java 教程仅作为 M1 基础参考，不能据此宣称完成机器人任务。[hohoo-embodied-agent](https://github.com/VirtualSelect/hohoo-embodied-agent) 已创建为公开仓库，当前只维护项目规划，不代表里程碑或实验已完成。仓库地址统一维护在 `data/journey.json` 的 `targetProject.repository`，由学习之旅、目标架构和虚拟实验室复用；三语言入口文案分别翻译。八周没有起始日期，不自动计算当前周或逾期。

## 后续阶段（未实现）

2. Projects / Skills / Progress：真实项目关联、技能依赖与证据驱动进度。
3. Career Matrix：学习证据与岗位能力对应。
4. Knowledge Nodes / 文章系列关联：按实际写作接入，不批量伪造正式文章。
5. GitHub / Demo / 实验结果 / 数据集：接入真实仓库、结果和复现入口。
6. Robot Data Dashboard：真实数据管线运行后再开发。

本轮只完成 Sprint 1；后续阶段等待用户指令。
