# 阅读清单的筛选恢复（本地，未提交）

当前分支`codex/content-search-20261111`，HEAD保持`655089e5f85c012be9cd0d33cb1527c1b8550990`。保留之前所有未提交改动，本轮未提交、合并、推送或部署。没有新增依赖、服务、模型调用、文章或实验数据。

## 问题与实现

从当前本地生产预览实际复现：选择“全部／学习文章／LLM／最早收藏”后，地址仍是`/reading`；刷新后四项变回inbox/all/all/newest。这是视图条件丢失，和上一轮修复的收藏时间持久化是不同问题。

本轮将现有四项控件接入网址：`status/type/topic/sort`。状态、类型和排序使用明确选项，主题读取现有路线的domain；未知值按字段回到原默认值。默认值不写入新网址，首次打开无效参数不强制跳转；后续操作规范化这四项，保留其他参数与hash。只保存筛选值，不把收藏ID、便签或阅读状态写入网址。

沿用已存在的`UrlStateSync`，恢复原生历史前进/返回以及Next.js同页导航；没有再创建第二套事件监听器或更改共享观察组件。控件每次选择形成历史记录，相同网址不重复写入；保留Next.js已有history state。语言切换继续使用原Shell语言规则，无需修改外壳。

新增“重置筛选”，默认视图不显示；重置后将键盘焦点移回状态控件。新增一行说明网址只保存筛选、收藏仍在本机；缺失阅读时长的提示改为仅在相应排序下出现。复用原样式，不扩大页面信息量。

本轮修改文件：

- `apps/web/lib/reading-list.mjs`：视图默认值、选项、参数解析和更新网址。前轮日期排序与本地文章标题适配保留。
- `src/pages/reading.js`：四项控件、网址同步、重置、焦点和三语说明。
- `apps/web/tests/reading-filters.test.mjs`：默认/异常参数、支持组合往返、重置边界与现有语言网址规则的回归。
- `docs/ROADMAP.md`、`docs/CONTENT-MODEL.md`与本报告。

未改学习记录、资讯收藏、背包、便签和原始文章；未修改`UrlStateSync.tsx`或Shell。

## 验证结果

定向27项检查通过（新增筛选4项、收藏9项及阅读整合14项）；完整网页测试204项通过、0失败。新筛选回归覆盖当前选项的组合往返，不依赖人工制造收藏；语言验证复用真实`languageUrl`，不是另写一套译址规则。现有格式检查及额外`src/pages/reading.js`格式检查通过，`git diff --check`无空白错误；三语言审计完成无警告（advisory，不代表人工审校）。

最后的提示文案展示条件调整后，生产构建及其中TypeScript验证通过，619个静态路由生成完成。现有600页路由、RSS、兼容地址及404响应检查无错误。

浏览器实际验收：

- 四项组合写入`/reading?status=all&type=learning&topic=llm&sort=oldest`，刷新后仍是相同网址与控件值。
- 返回恢复上一项的newest，前进恢复oldest；改为shortest后出现对应提示。去`/now`再返回，四项条件仍在。
- 切英文和繁体后保持all/learning/llm/shortest，实际页面显示相应语言的选中项。
- 繁体页用Enter重置后回到无参数的`/zh-TW/reading`，状态控件获得焦点并有1.6px轮廓；普通页脚清单链接也会将同页视图回默认值。
- 无效四项参数显示默认值。随后选择“全部”，网址只留下`status=all`与原`ref=qa#main-content`；再重置只留下`ref=qa#main-content`。
- 中文护眼、英文夜间分别核验1440/1280/1024/768/430/375宽度，文档scrollWidth与clientWidth一致；重置按钮高度46.4px、最窄宽度89.6px。已保存并查看桌面、手机护眼及手机夜间截图。
- 本轮时段所查页面未捕获console error。未点击收藏、阅读标记或便签操作；测试的是现有真实空清单，没有注入假的访客记录。

三语带query的本地HTTP响应均为200，静态主区域有相应语言说明，未输出个人收藏时间。静态SSR继续输出默认视图，浏览器挂载后才读取query和本地记录；不声称服务端已经为每个query个性化渲染。减少这段初始默认显示若成为实际问题，应在不破坏静态生成的前提下另行评估。

仓库外制品目录`C:/Users/Hohoo/.codex/visualizations/2026/09/10/01a08c03-1b3d-7361-99cb-5cd3875313b2`保留：

- `reading-filters-browser-20261112.json`：修复前后、历史/语言/异常参数与宽度观察。
- `reading-filters-ssr-20261112.json`：三语响应核对与本轮实现/测试、既有共享观察组件的指纹。
- `reading-filters-tests-20261112.log`、`reading-filters-build-20261112.log`和`reading-filters-routes-20261112.log`。
- `reading-filters-desktop-light-20261112.png`、`reading-filters-mobile-light-20261112.png`和`reading-filters-mobile-dark-20261112.png`。

## 边界与交付

本地静态产物估算143,596,621 bytes，public为8,339,594 bytes，客户端资产合计2,546,365 bytes。相较上轮静态增加2,303 bytes、客户端增加2,095 bytes，仍低于250MB本地预算。云端历史部署累计占用没有新读数，未删除部署或声称释放线上空间。

本轮未进行所有页面和设备的逐页人工回归，没有改动已记录的框架404 NoFallbackError日志问题；600页响应检查通过不等于该上游日志已消失。也未重新测量浏览器性能指标或重跑研究实验。

用户可以打开[带筛选的阅读清单](http://localhost:4216/reading?status=all&type=learning&topic=llm&sort=oldest)，改变条件后刷新、切换语言或使用浏览器返回。预览保持护眼主题，已清除临时尺寸覆盖。当前线上维持原部署，所有新增改动仅在本地分支。

后续按原队列审阅已完成整合与文章教学表达；这轮没有为了增加功能数量创建新的收藏系统、内容栏目或后台。
