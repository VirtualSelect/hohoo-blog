# Vercel Deployment Storage 排查报告

核查日期：2026-10-06（Asia/Shanghai）。本轮完成仓库与远端只读检查、局部构建优化及本地验证。没有提交、推送、部署、删除线上资源或变更付费方案。

## 1. 当前状态

- 用户收到的历史告警：团队 `huhohoos-projects` Deployment Storage 已用 100%，包含额度 10 GB。用户随后补充的 Usage 截图显示最新值已回落至 **4.18 GB**，不能再把历史告警当作当前仍占满额度的证据。
- 风险等级：中。当前显示值已回落，但减少单次部署体积的代码尚未发布，后续正常部署仍可能累积占用。目前两个最新生产部署均为 READY，没有核实到线上因存储停止服务。
- API 读到两个项目、14 个部署（列表无下一页游标），全部为 Production / READY，未返回 Preview。这个范围不能代替历史账单的峰值或已经清理的历史记录。
- 分项目 Deployment Storage 已由 2026-10-06 用户截图补齐；Functions Storage 总量为 **31.8 MB**，没有分项目明细。此前 API 用量接口返回 `costs_not_found`，部署文件列表返回 File tree not found，Dashboard 连接多次超时，这些限制不再妨碍按截图判断主要项目。
- 仍未核实：单个线上部署 Resources 体积、保留策略实际设置、占用骤降的执行记录及账期累计 GB-month。Root Directory 后台实际值未取得，但构建日志能确认两个项目分别使用 web 与 astra 的安装命令和应用构建。
- 工作分支 `codex/reading-path-and-evidence-review`，本地 HEAD `cecd32caef36055f872fb51f81daf05ed514b956`；线上最新提交 `48204ad2b6c14a70a3287b62f69e7f5d1343f26f`。保留上一轮阅读路径等未提交工作和原有锁文件改动，不在本轮混入远端合并。

截图范围为 Last 30 Days，显示 Sep 6, 9:00 – Oct 6, 9:00；页面未显示时区，不自行换算。Projects 日视图读数如下，均保留界面原单位：

| 项目或指标 | 2026-10-04 悬停值 | 截图最新显示值 |
| --- | ---: | ---: |
| hohoo-blog Deployment Storage | 9.94 GB | 4.17 GB |
| astra-hero Deployment Storage | 156.07 MB | 11.62 MB |
| 其余五个历史项目 | 均为 0 B | 均为 0 B |
| 团队 Deployment Storage | 约 10.10 GB（按分项近似相加） | 4.18 GB（Overview） |
| 团队 Functions Storage | 未提供 | 31.8 MB（Overview） |

**占用主体已确认是 hohoo-blog：最新显示值超过团队 Deployment Storage 的 99%。** 其余历史项目显示 0 B 不代表本轮需要删除这些项目，也不与 API 当前仅返回两个项目矛盾。

计量口径：本报告的本地测量 MB 均为十进制、未压缩文件大小；截图 GB/MB 按界面原值记录，存在舍入。Vercel Deployment Storage 与 Functions Storage 分开计量，账期按项目每日最大占用累计 GB-month；上述日视图的 GB 数值不等于过去 30 天累计 GB-month，不能直接把 4.18 GB 除以额度当作账期消耗比例。构建缓存、Blob 与仓库目录大小不能直接加到 Deployment Storage。[官方计量说明](https://vercel.com/docs/deployment-storage)

## 2. 根因

### P0 每个路由重复序列化全站内容详情

`page.tsx` 将完整 `globalData` 传给客户端 Shell。索引不仅含标题与链接，还含全站项目章节、实验方法、证据资源、所有语言详情、翻译元数据；activity 又是一份经 JSON 还原的相同内容。数百个静态路由及 Next.js 导航分段重复保存这批数据。

优化前 HTML 合计 198.71 MB，RSC 导航数据 536.23 MB；文章和媒体原文件远小于这些生成结果。对本项目的规模而言，单次静态输出估算 753.26 MB 明显偏大。对 404 份生成 HTML 做正文片段哈希比对，优化后完全一致，证明减少的是附带数据而非删除文章。

### P1 大产物随正常发布反复保留，粒子项目也跟随无关提交部署

2026-10-03 至 10-06 返回的 7 个主干提交，每个都触发两个项目，总计 14 个生产部署；其中 4 个提交为自动资讯发布。没有证据支持“主要由大量 Preview 导致”。

博客新内容需要部署，因此不关闭正常更新。独立粒子项目只有自身代码、共享粒子源码、根依赖和构建配置变化时需要构建，已增加范围判断。Astra 的静态输出本身只有约 1.66 MB，其重复构建是频率问题，不能把它称为 10 GB 的主要占用来源。

Dashboard 截图进一步确认博客是主要占用来源：10 月 4 日为 9.94 GB，最新为 4.17 GB；Astra 最新仅 11.62 MB，清理它不能解决主要增长问题。不能将 14 × 本地目录大小冒充计费总量，也不能预先承诺清理能释放多少 GB。

10 月 4 日两个项目近似合计 10.10 GB，与此前 10 GB 告警在数量上相符。随后曲线明显回落，但截图不能证明是手动删除、平台保留策略清理还是其他存储生命周期处理。**本轮优化仍在本地，未执行删除或发布，因此此次回落不能归功于本轮代码优化。** 需有部署删除或保留策略执行记录，才能进一步确认下降原因。

### P2 访客接口加载了整个内容生成器输出

访客统计只需要公开页面路径集合，却通过通用 `getContent` 读取内容；动态文件追踪带入三种语言的大 JSON 和消息资源。改为构建期输出 3,502 字节的路径白名单后，该接口去重后的 NFT 文件集从 5.79 MB 降至 1.78 MB。这是 Functions Storage 的改善，与 P0 的静态输出分开报告。

另外，本地 public 存有旧版带哈希的 search / radar-data 文件。Git 部署从未跟踪这些生成目录；干净工作区重建时不会携带这批本地历史文件，因此未把它断言为当前 Vercel 根因，也未为小幅收益删除旧 URL。

## 3. 最大空间占用来源

优化前本地共 44,271 个文件，3,178.78 MB；其中被 Git 跟踪的 584 个文件共 9.26 MB。下表目录互有包含，不能相加。

| 文件或目录 | 优化前大小 | 是否进入部署 | 判断和处理 |
| --- | ---: | --- | --- |
| apps/web/.next/server/app | 735.40 MB | 静态 HTML/RSC 部分为主要部署输出 | 明显偏大，已精简重复页面数据 |
| apps/web/.next | 1,059.48 MB | 只有适配后的静态输出和运行文件进入 | 不能拿整个目录当计费体积 |
| apps/web/.next/cache | 203.98 MB | 构建缓存，不是相同计费项目 | 不靠删除它声称释放 Deployment Storage |
| apps/web/.next/static | 2.38 MB | 是，浏览器 JS/CSS | 大小合理，未改动 |
| apps/web/public | 15.70 MB | public 内容可被发布；本地含旧生成版本 | 保留现有资源；真实当前哈希资源只占 0.86 MB |
| static | 4.45 MB | 构建复制到 public | 合理，包含文章实验图片与录像 |
| apps/web/generated | 3.88 MB | 构建数据；仅被引用的运行文件跟随函数 | 不把它整体传到每个客户端页面 |
| apps/web/node_modules | 372.41 MB | 仅被追踪的运行依赖，不是整个目录 | 不删除运行依赖 |
| 根 node_modules | 33.95 MB | 同上 | 正常安装依赖 |
| .cache-loader | 1,135.23 MB | Git 忽略，未进入所查运行追踪 | 本地审计、下载、验证缓存，不是线上部署证据 |
| apps/astra-hero/.next | 130.71 MB | 包含本地缓存，不能整体计费 | 新构建静态输出约 1.66 MB |
| reports | 1.78 MB | 仓库审计材料，未见被输出或运行追踪引用 | 保留真实审计证据 |
| data / docs / i18n | 0.49 / 0.54 / 0.85 MB | 必要内容在构建中使用 | 不删文章，不做无关忽略 |

文件阈值（优化前完整本地目录）：>1 MB 共 246 个，>5 MB 共 95 个，>10 MB 共 36 个；Git 跟踪文件以及 public 三个阈值均为 0。优化后估算静态输出也没有单个 >1 MB 文件。问题是重复小文件累计，不是超大录像。

已检查且无需处理：

- 根与应用 .gitignore 已排除 node_modules、.next、generated、public、.cache-loader 等实际生成目录。未机械新增 .vercelignore；Git 源码排除与最终生成输出是两件事。[忽略文件说明](https://vercel.com/docs/deployments/vercel-ignore)
- 未在跟踪内容或实际产物中发现模型权重、SQLite、dump、压缩备份、Chromium / Puppeteer / Playwright 可执行文件、超大 PDF 或字体。最大的 tracked 文件约 0.31 MB。
- 页面函数 NFT 最大的公共 Next server 文件集约 29.55 MB，其中含 Windows 本地 Sharp 原生文件；它不是某个 Vercel Linux Function 的精确上传体积，且与其他 NFT 有重叠，不能累加。访客函数没有再带入完整内容 JSON。
- 浏览器 JS/CSS 合计不变；未增加依赖、升级版本、修改主题或业务内容。
- 自动资讯每两小时采集；无内容变化时不提交；已有的去重与每日限额保持原样。

静态资源存储选择：现有图片和视频继续随部署保留。11 个视频合计只有 1.91 MB，全 static 4.45 MB，当前迁移到 Blob/R2/S3 的收益有限，却增加 URL、缓存、权限和成本维护。未来出现大体积数据集或高清原片时再考虑对象存储，本轮不迁移、不付费。

## 4. Deployment 问题

| 项目 | 返回部署数 | Production | Preview | 最新提交 | 单次本地静态输出估算 | 线上项目存储 |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| hohoo-blog | 7 | 7 | 0 | 48204ad | 753.26 MB → 276.95 MB | 4.17 GB（截图最新值） |
| astra-hero | 7 | 7 | 0 | 48204ad | 1.66 MB | 11.62 MB（截图最新值） |

最新部署：2026-10-06 14:49（北京时间）。博客生产别名含 huhohoo.com、www.huhohoo.com、hohoo-blog.vercel.app；Astra 保留 astra-hero.vercel.app 等现有别名。独立粒子应用确实构建自身首页，不是误构建完整博客。

资讯 cron 为 `35 */2 * * *`，理论每日 12 次采集检查，但仅产生内容提交才触发 Git 部署。本次返回窗口内只有 4 次资讯提交，不能把采集次数当部署次数。

保留策略的后台实际设置未取得。官方当前 Hobby 默认 30 天，并保护最近 3 次部署、最近 3 个 READY 生产部署、当前生产域名指向及仍活跃的特定预览。需检查团队与项目覆盖值，不能仅依赖默认值推定当前配置。[保留策略](https://vercel.com/docs/deployment-retention)

## 5. 已完成优化

| 修改文件 | 原因与影响 |
| --- | --- |
| apps/web/lib/client-content.ts | 客户端索引保留查找、筛选、关系与时间元数据；详情正文只传当前路由；activity 复用相同对象引用 |
| apps/web/app/[[...segments]]/page.tsx | 在服务端到客户端的边界使用精简投影，服务器正文与 SEO 逻辑保持 |
| apps/web/scripts/content.mjs | 由现有真实路由和内容索引生成 visitor-paths.json；不新建第二套手写路径列表 |
| apps/web/app/api/visitors/route.js | 直接引用小型路径白名单，保持统计查询、缓存、脱敏和错误返回语义 |
| apps/web/next.config.mjs | 移除已不需要的完整中文 JSON 强制追踪规则 |
| apps/astra-hero/scripts/ignore-build.mjs | 对上次与本次 Git SHA 做范围检查；无历史、首次、相同提交重新构建、Git 失败均继续构建；ASTRA_FORCE_BUILD=1 可显式放行 |
| apps/astra-hero/vercel.json | 新增 ignoreCommand；只跳过不相关的粒子项目构建，不关闭博客发布或正常 Preview |
| apps/web/scripts/storage-report.mjs | 记录静态输出、最大文件、阈值与去重 NFT；明确缓存和计费口径 |
| apps/web/package.json | 增加 storage:check，无新增依赖 |
| .github/workflows/validate.yml | 构建后检查 350 MB 本地静态输出审查预算；用于发现重新全量序列化等回归，并非 Vercel 官方额度 |
| apps/web/tests/deployment-storage.test.mjs | 验证三语言详情保留、列表语义与顺序、白名单等价、Git 跳过与失败放行 |

共享粒子源码、根依赖和应用自身改动仍触发构建。历史 Git 对照已验证：资讯改动返回 0（跳过），没有 Git 环境返回 1（继续）。[ignoreCommand 的返回码约定](https://vercel.com/docs/project-configuration/vercel-json#ignorecommand)

CI 预算是审查信号；现有 Vercel Git 部署与 GitHub Actions 并行，**不宣称 CI 失败会自动阻止 Vercel 已触发的部署**。内容持续增长后应按实际体积重新审查预算，不直接无限提高阈值。

验证结果：

- 根目录与 apps/web 按锁文件重新安装依赖成功；最初离线缓存缺失，随后联网安装完成，没有升级依赖或改写原有锁文件内容。
- typecheck、format:check、两个应用的 production build 均通过；仓库没有 lint script，未虚构 lint 通过。
- Web 测试 95/95，根测试 64/64；随后针对构建规则补充强制构建分支后，该测试组 5/5。
- 387 个路由、12 个兼容重定向、9 个 RSS 入口与 404 检查通过。
- 404 份生成 HTML 的 main 正文片段哈希一致；它验证内容保持，不等于全部视觉交互验收。
- 329 个 public 文件 HEAD 返回 200。
- 本地 /api/visitors 返回 HTTP 200 / unconfigured；未配置私有统计凭据，未验证真实统计上游 ready 分支。白名单等价与脱敏测试通过。
- news:check 通过，182 条资讯；i18n:check 完成（advisory，不代表所有翻译问题不存在）。
- 本地桌面首页重新加载正常，1440 视口的可见结构正常，捕获的 error/warn 为空；随后浏览器连接超时，移动端、多主题、深层客户端导航交互本轮未完整复验。样式、交互组件源码没有因此盲改。
- git diff --check 无空白错误；存在既有 LF/CRLF 提示，不批量改行尾。
- 本地预览：http://localhost:4206/ 。未验证 Vercel 适配器最终输出及 Linux 部署运行，需在获准发布后复核。

## 6. 未执行但建议处理

分项目用量已由截图补齐。建议优先在用户批准后发布已验证的减重改动，控制新部署增长；当前显示值已回落，不把批量删除历史部署作为必须立即执行的动作。若仍需清理，优先审查博客的旧部署，Astra 最新仅 11.62 MB，清理收益较小。以下分类只表示核查时的状态；执行前必须再次读取当前 aliases 和生产部署，避免名单过期误删。

- A：两个当前生产部署必须保留。
- B：每个项目再保留最近两个旧版本，作为回滚候选；其业务重要性仍由用户确定。
- C：以下 8 个较早部署均无当前别名，可作为待确认清理候选。没有在所查博客内容中发现对这些部署专属 URL 的引用；无法确认站外曾分享的链接是否仍被使用。
- D：astra-hero 项目是否继续作为独立演示站点、是否存在指定的重要历史回滚版本、后台 retention 覆盖值，均需人工确认。本轮不删除项目、不解绑域名、不更改 DNS/环境变量。

**清理 C 组的影响**：该批旧部署 URL 和对应平台回滚能力将失效；不触碰 A/B 组、Git 历史、文章源码、当前站点域名。不要把平台可能提供的恢复期视为可靠备份。存储节省量需由 Deployment Resources / Usage 确认，且已累计的 GB-month 不会因删除马上归零。

| 分类 | 项目 | 北京时间 | Deployment | 提交 | 依据及影响 |
| --- | --- | --- | --- | --- | --- |
| A 必须保留 | hohoo-blog | 2026-10-06 14:49:32 | [dpl_Dywbn3imo1X7pV4MNkG3wzgLSnBD](https://vercel.com/huhohoos-projects/hohoo-blog/Dywbn3imo1X7pV4MNkG3wzgLSnBD) | 48204ad | 当前生产别名 |
| B 建议保留 | hohoo-blog | 2026-10-05 16:14:33 | [dpl_GuoF5VLZhWmmrg7Th23AM5JUEDNn](https://vercel.com/huhohoos-projects/hohoo-blog/GuoF5VLZhWmmrg7Th23AM5JUEDNn) | cecd32c | 近两次回滚锚点，无别名 |
| B 建议保留 | hohoo-blog | 2026-10-05 14:10:32 | [dpl_AjEU5wp6LyyuTw9dCkPTmqtSgYuk](https://vercel.com/huhohoos-projects/hohoo-blog/AjEU5wp6LyyuTw9dCkPTmqtSgYuk) | 2224f4e | 近两次回滚锚点，无别名 |
| C 清理候选，待确认 | hohoo-blog | 2026-10-04 19:50:06 | [dpl_E8M9uiQZ7kYxLKKdFoFP5t61PGcT](https://vercel.com/huhohoos-projects/hohoo-blog/E8M9uiQZ7kYxLKKdFoFP5t61PGcT) | c4cccd6 | 无别名，删除影响该旧版本 URL 和回滚 |
| C 清理候选，待确认 | hohoo-blog | 2026-10-04 09:58:44 | [dpl_Cc1MnYUQGkorNxQpydwWwyHYr2Ax](https://vercel.com/huhohoos-projects/hohoo-blog/Cc1MnYUQGkorNxQpydwWwyHYr2Ax) | bb110b2 | 无别名，删除影响该旧版本 URL 和回滚 |
| C 清理候选，待确认 | hohoo-blog | 2026-10-04 00:41:23 | [dpl_ya7cTqJN4P7kSQ7YGZZ4rpaupHSS](https://vercel.com/huhohoos-projects/hohoo-blog/ya7cTqJN4P7kSQ7YGZZ4rpaupHSS) | d6a181e | 无别名，删除影响该旧版本 URL 和回滚 |
| C 清理候选，待确认 | hohoo-blog | 2026-10-03 19:05:03 | [dpl_25A6kqsyHpjA7NV6b8vQXiQDRpyH](https://vercel.com/huhohoos-projects/hohoo-blog/25A6kqsyHpjA7NV6b8vQXiQDRpyH) | 9e12e08 | 无别名，删除影响该旧版本 URL 和回滚 |
| A 必须保留 | astra-hero | 2026-10-06 14:49:32 | [dpl_5A5nUEDAJPhgAoQMUoqAcKXFKKRq](https://vercel.com/huhohoos-projects/astra-hero/5A5nUEDAJPhgAoQMUoqAcKXFKKRq) | 48204ad | 当前生产别名 |
| B 建议保留 | astra-hero | 2026-10-05 16:14:33 | [dpl_UfgASANbPcLFcxmu7LBjdsfV5edb](https://vercel.com/huhohoos-projects/astra-hero/UfgASANbPcLFcxmu7LBjdsfV5edb) | cecd32c | 近两次回滚锚点，无别名 |
| B 建议保留 | astra-hero | 2026-10-05 14:10:32 | [dpl_BpRrBknqMQ9j4og4yQPpMbhgYBWi](https://vercel.com/huhohoos-projects/astra-hero/BpRrBknqMQ9j4og4yQPpMbhgYBWi) | 2224f4e | 近两次回滚锚点，无别名 |
| C 清理候选，待确认 | astra-hero | 2026-10-04 19:50:06 | [dpl_7VvrAKuwG1eF2mefxzi35scnNwDr](https://vercel.com/huhohoos-projects/astra-hero/7VvrAKuwG1eF2mefxzi35scnNwDr) | c4cccd6 | 无别名，删除影响该旧版本 URL 和回滚 |
| C 清理候选，待确认 | astra-hero | 2026-10-04 09:58:44 | [dpl_92vH5n1hWCBbUwKCTtJ59EY1n51s](https://vercel.com/huhohoos-projects/astra-hero/92vH5n1hWCBbUwKCTtJ59EY1n51s) | bb110b2 | 无别名，删除影响该旧版本 URL 和回滚 |
| C 清理候选，待确认 | astra-hero | 2026-10-04 00:41:23 | [dpl_HVV8g7HoaGHYsSxtC6oViVfhbJhD](https://vercel.com/huhohoos-projects/astra-hero/HVV8g7HoaGHYsSxtC6oViVfhbJhD) | d6a181e | 无别名，删除影响该旧版本 URL 和回滚 |
| C 清理候选，待确认 | astra-hero | 2026-10-03 19:05:03 | [dpl_J9fdf6uLfrwXLhFttffx6XgVhepK](https://vercel.com/huhohoos-projects/astra-hero/J9fdf6uLfrwXLhFttffx6XgVhepK) | 9e12e08 | 无别名，删除影响该旧版本 URL 和回滚 |

**以上均未删除。需要你确认具体 C 组名单后才执行。** 当前部署体积优化也尚未推送，须另行批准发布后才作用于新生产部署。

不建议现在实施的动作：删文章、迁移 4.45 MB 静态媒体、删除锁文件或整个依赖目录、关闭所有 Preview、延长资讯抓取间隔、为节省存储关闭正常 CI/CD。它们与当前证据不匹配。

## 7. 优化效果

同一工作区、相同内容及同一版本依赖下比较；包含上一轮未提交的阅读路径改进，不能把这些数字当作线上 48204ad 的逐字节构建对比。

| 指标 | 优化前 MB | 优化后 MB | 减少 |
| --- | ---: | ---: | ---: |
| HTML | 198.71 | 74.75 | 62.38% |
| RSC 导航数据 | 536.23 | 183.88 | 65.71% |
| 预渲染文件合计 | 735.18 | 258.87 | 64.79% |
| 浏览器 JS/CSS | 2.38 | 2.38 | 0% |
| 本地 public（含旧哈希文件） | 15.70 | 15.70 | 0% |
| 静态输出估算合计 | 753.26 | 276.95 | **476.31 MB / 63.23%** |
| 访客 API 去重 NFT 文件集 | 5.79 | 1.78 | **4.01 MB / 69.27%** |

NFT 重叠文件不跨函数累加；运行包部署后可能有 Vercel 适配差异。原始媒体、页面数量和客户段 JS 体积没有减少。**当前线上释放量：未执行任何删除或发布，不能声称已经释放空间。**

复测命令（仓库根目录）：

```powershell
npm run build
npm run storage:check --prefix apps/web
$env:STORAGE_STATIC_BUDGET_MB = '350'
npm run storage:check --prefix apps/web
```

详细本地快照：`.cache-loader/deployment-storage/inventory-before.json`、`output-before.json`、`output-after.json`、`visible-comparison.json`、`http-assets.json`、构建和测试日志。该目录被 Git 忽略，核心结果与清单已记入本报告。

## 8. 是否需要升级 Vercel Pro

**暂时不需要立即升级，先在获准后发布减重改动，再按实际增长治理历史版本。** 截图最新 Deployment Storage 为 4.18 GB，Functions Storage 为 31.8 MB；工程侧单次静态输出已减少约 63%，而媒体本身很小。尚未取得账期累计 GB-month 和实际保留策略，现有证据不足以认定必须付费扩容，也不能承诺本地减重比例就是线上账单降幅。

发布后应记录当天及后续几天 Usage 分项、每个项目每次 Resources 体积和实际部署次数。若正常内容发布加合理回滚保留仍持续超过免费额度，再以真实用量评估付费方案；不为一次告警直接新增付费服务。


## 附录 最大文件清单

以下先列完整本地目录中最大的 30 个文件，避免把开发缓存与线上文件混淆；再列优化后静态输出最大的 30 个文件。表内 MB 使用十进制。

### 本地检查前最大文件

| 路径 | MB | 部署判断 |
| --- | ---: | --- |
| apps/astra-hero/node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node | 106.189 | 依赖安装文件，仅实际 NFT 引用部分可能进入函数 |
| apps/web/node_modules/@next/swc-win32-x64-msvc/next-swc.win32-x64-msvc.node | 106.189 | 依赖安装文件，仅实际 NFT 引用部分可能进入函数 |
| .cache-loader/node-upgrade/node-v26.8.2-win-x64/node.exe | 103.762 | 本地缓存，不是部署输出 |
| apps/web/.next/cache/webpack/server-production/0.pack | 60.494 | 本地缓存，不是部署输出 |
| apps/astra-hero/.next/cache/webpack/server-production/0.pack | 59.388 | 本地缓存，不是部署输出 |
| apps/web/.next/cache/webpack/client-production/0.pack | 53.657 | 本地缓存，不是部署输出 |
| apps/astra-hero/.next/cache/webpack/client-production/0.pack | 51.296 | 本地缓存，不是部署输出 |
| .cache-loader/npm-upgrade-cache/_cacache/content-v2/sha512/31/db/6c4e0cf27c23d12c2eae27598df1aa3b972278041d14e889e19f1de0b5ad5470221d1cadf2c4b1b413c39642d7960fcfd0d2a6fc039a3bc0968bf0cf72db | 41.746 | 本地缓存，不是部署输出 |
| .cache-loader/npm/_cacache/content-v2/sha512/34/3a/234d25eb22aef34b4f744f4570235bb306bc995af7b08315ef4b4b308fcff91869f388164b9b284491f1133bc9f89f70ec26965b664abd17f315dab2102b | 41.571 | 本地缓存，不是部署输出 |
| .cache-loader/node-v26.8.2-win-x64.zip | 41.379 | 本地缓存，不是部署输出 |
| .cache-loader/npm-upgrade-cache/_cacache/content-v2/sha512/2c/d7/421f380b15cf947aa312f382f35cf69e0512b2a8337d38cc8502bd4eac1d17acdc3bf0846b115b59bef03bdb8e56fc7b1aa1e54e417f633e33e4f23a23c0 | 34.864 | 本地缓存，不是部署输出 |
| .cache-loader/npm-upgrade-cache/_cacache/content-v2/sha512/e0/78/8ec1ed58fef5fb0a302c7bf5e31564ee0a22434301b1e89ded4959f06930b9278a77df0802186dea5269325e414934965daa2edad4c55de48e65d89f7476 | 31.237 | 本地缓存，不是部署输出 |
| apps/web/.next/dev/cache/webpack/client-development/10.pack.gz | 26.721 | 需按静态输出或 NFT 归属判断 |
| .cache-loader/npm-upgrade-cache/_cacache/content-v2/sha512/f4/04/fe0af3fb310fca3bb154cb1311178acb940dc047165c011b90c7cb9ba927fd303e63c4d33eb9266abffd92f6c82ed3ec120ab47559b134efc23c2a798f6c | 25.538 | 本地缓存，不是部署输出 |
| apps/astra-hero/node_modules/@typescript/typescript-win32-x64/lib/tsc.exe | 24.521 | 依赖安装文件，仅实际 NFT 引用部分可能进入函数 |
| apps/web/node_modules/@typescript/typescript-win32-x64/lib/tsc.exe | 24.521 | 依赖安装文件，仅实际 NFT 引用部分可能进入函数 |
| .cache-loader/ia-chrome/component_crx_cache/485187ce78b5eaa19aaba6cb088a3d8ef80fafe00f5068fa71a7989775436e2e | 23.365 | 本地缓存，不是部署输出 |
| .cache-loader/ia-chrome/WasmTtsEngine/20260826.1/bindings_main.wasm | 22.970 | 本地缓存，不是部署输出 |
| apps/astra-hero/node_modules/@img/sharp-win32-x64/lib/libvips-42.dll | 18.615 | 依赖安装文件，仅实际 NFT 引用部分可能进入函数 |
| apps/web/node_modules/@img/sharp-win32-x64/lib/libvips-42.dll | 18.615 | 依赖安装文件，仅实际 NFT 引用部分可能进入函数 |
| apps/web/.next/dev/cache/webpack/server-development/10.pack.gz | 16.690 | 需按静态输出或 NFT 归属判断 |
| .cache-loader/npm/_cacache/content-v2/sha512/4c/ae/b2e646031b9eaf6dc8d3571cee72e17f34eba117b70b336dd2641426790081245545b5e73e21e7b47569b55314c387b8ba461d5bc50f9139c9df43a25c45 | 15.665 | 本地缓存，不是部署输出 |
| .cache-loader/npm/_cacache/content-v2/sha512/d5/46/2742457c2156756d5b94b4db6db872416e13abc2f7e0183034da5d47ce8a9f73efdf0c689fd2bdef85a69e221905e5d77cd85d4e15cbf75b7dd2aa290a0e | 15.660 | 本地缓存，不是部署输出 |
| .cache-loader/npm/_npx/6de2aa2fded2970c/node_modules/agent-browser/bin/agent-browser-linux-x64 | 14.254 | 本地缓存，不是部署输出 |
| .cache-loader/npm/_npx/6de2aa2fded2970c/node_modules/agent-browser/bin/agent-browser-linux-musl-x64 | 14.093 | 本地缓存，不是部署输出 |
| .cache-loader/npm/_npx/6de2aa2fded2970c/node_modules/agent-browser/bin/agent-browser-win32-x64.exe | 13.942 | 本地缓存，不是部署输出 |
| .cache-loader/npm/_npx/6de2aa2fded2970c/node_modules/agent-browser/bin/agent-browser-darwin-x64 | 13.592 | 本地缓存，不是部署输出 |
| apps/web/.next/dev/static/chunks/main-app.js | 13.244 | 需按静态输出或 NFT 归属判断 |
| .cache-loader/npm/_npx/6de2aa2fded2970c/node_modules/agent-browser/bin/agent-browser-linux-arm64 | 12.508 | 本地缓存，不是部署输出 |
| .cache-loader/npm/_npx/6de2aa2fded2970c/node_modules/agent-browser/bin/agent-browser-darwin-arm64 | 12.429 | 本地缓存，不是部署输出 |

### 优化后最大静态输出文件

| 路径 | MB |
| --- | ---: |
| apps/web/.next/server/app/en/radar/weekly/2026-W39.html | 0.502 |
| apps/web/.next/server/app/zh-TW/radar/weekly/2026-W39.html | 0.490 |
| apps/web/.next/server/app/radar/weekly/2026-W39.html | 0.489 |
| apps/web/.next/server/app/en/radar/weekly/2026-W38.html | 0.484 |
| apps/web/.next/server/app/en/radar/weekly/2026-W40.html | 0.482 |
| apps/web/.next/server/app/zh-TW/radar/weekly/2026-W38.html | 0.472 |
| apps/web/.next/server/app/radar/weekly/2026-W38.html | 0.471 |
| apps/web/.next/server/app/zh-TW/radar/weekly/2026-W40.html | 0.469 |
| apps/web/.next/server/app/radar/weekly/2026-W40.html | 0.469 |
| apps/web/.next/server/app/en/radar/weekly/2026-W41.html | 0.381 |
| apps/web/.next/server/app/en/radar/weekly/2026-W36.html | 0.371 |
| apps/web/.next/server/app/en/radar/weekly/2026-W37.html | 0.371 |
| apps/web/.next/server/app/zh-TW/radar/weekly/2026-W41.html | 0.370 |
| apps/web/.next/server/app/radar/weekly/2026-W41.html | 0.369 |
| apps/web/.next/server/app/zh-TW/radar/weekly/2026-W36.html | 0.360 |
| apps/web/.next/server/app/zh-TW/radar/weekly/2026-W37.html | 0.360 |
| apps/web/.next/server/app/radar/weekly/2026-W36.html | 0.359 |
| apps/web/.next/server/app/radar/weekly/2026-W37.html | 0.359 |
| apps/web/.next/static/chunks/9d78c252.c07fc3988dc6ac57.js | 0.357 |
| apps/web/.next/server/app/en/radar/weekly/2026-W38.segments/$oc$segments/__PAGE__.segment.rsc | 0.338 |
| apps/web/.next/server/app/en/radar/weekly/2026-W39.segments/$oc$segments/__PAGE__.segment.rsc | 0.338 |
| apps/web/.next/server/app/en/radar/weekly/2026-W40.segments/$oc$segments/__PAGE__.segment.rsc | 0.338 |
| apps/web/.next/server/app/en/radar/weekly/2026-W41.segments/$oc$segments/__PAGE__.segment.rsc | 0.338 |
| apps/web/.next/server/app/en/radar/weekly/2026-W36.segments/$oc$segments/__PAGE__.segment.rsc | 0.338 |
| apps/web/.next/server/app/en/radar/weekly/2026-W37.segments/$oc$segments/__PAGE__.segment.rsc | 0.338 |
| apps/web/.next/server/app/en/radar/weekly/2026-W38.rsc | 0.337 |
| apps/web/.next/server/app/en/radar/weekly/2026-W38.segments/_full.segment.rsc | 0.337 |
| apps/web/.next/server/app/en/radar/weekly/2026-W39.rsc | 0.337 |
| apps/web/.next/server/app/en/radar/weekly/2026-W39.segments/_full.segment.rsc | 0.337 |
| apps/web/.next/server/app/en/radar/weekly/2026-W40.rsc | 0.337 |
