# AI 雷达七日只读复盘 · 2026-11-25

观察区间为北京时间 2026-11-18 21:15 至 2026-11-25 21:15。GitHub Actions 返回 20 次运行，均有可下载报告且 ZIP 的 SHA-256 与 GitHub 记录一致。19 次由定时触发，1 次由推送触发，20 次任务均成功。核对使用既有采集报告、固定提交的归档和生产快照。[工作流和运行列表](https://github.com/VirtualSelect/hohoo-blog/actions/workflows/ai-news.yml)

## 已观测到的运行

- AIHOT 读取成功 20 次，报告中均未使用回退。20 次均使用 48 小时发布窗口。
- 13 次运行选中 22 个不同条目，逐个核对后均已进入与线上快照一致的远端归档。7 次零新增，来源均成功，未见候选被配额阻挡。
- 配额仅在 11 月 25 日 19:40 出现 1 个分时预留项，该次同时选中 2 条。UTC 入库日为 11 月 25 日，当时已用 4 条、累计释放 6 条。被预留候选截至核对时未入归档。[分时预留对应运行](https://github.com/VirtualSelect/hohoo-blog/actions/runs/45606506419)
- 原始报告累计 860 次相关性拒绝、68 次重复、49 次超窗，均为跨运行的观察次数。49 次超窗涉及 14 个 ID，其中 13 个已在核对时的归档内，剩下 1 个仅在一份旧版报告观察到。最近 3 份带结构化诊断的报告均没有符合「相关、未归档且未显式屏蔽」条件的超窗条目。另 17 份有原始报告，但缺少这一判定和首见字段，首见时间仍未知。[该次旧版报告对应运行](https://github.com/VirtualSelect/hohoo-blog/actions/runs/45203255200)

| 北京时间       | 定时运行 | 推送触发 | 零新增运行 | 已入归档的新记录 | 带新版诊断的报告 |
| -------------- | -------: | -------: | ---------: | ---------------: | ---------------: |
| 11-19          |        3 |        0 |          1 |                4 |                0 |
| 11-20          |        3 |        0 |          1 |                2 |                0 |
| 11-21          |        3 |        0 |          1 |                2 |                0 |
| 11-22          |        3 |        0 |          2 |                1 |                0 |
| 11-23          |        3 |        0 |          1 |                3 |                0 |
| 11-24          |        2 |        1 |          1 |                4 |                1 |
| 11-25 21:15 前 |        2 |        0 |          0 |                6 |                2 |
| 合计           |       19 |        1 |          7 |               22 |                3 |

区间开头 11 月 18 日 21:15 后没有运行记录；首份报告在 11 月 19 日 01:30。定时运行相邻启动间隔约为 5 小时 29 分至 12 小时 13 分。按每两小时的配置，整段长度对应 84 个名义触发时点，公开运行历史可见 19 次定时启动。无记录时段的执行和来源状态均未知。后续优先核查定时启动间隔。现有报告未显示重复的未归档超窗情况，暂无证据支持调整来源、时窗或配额。[最大间隔起点](https://github.com/VirtualSelect/hohoo-blog/actions/runs/45103644372) · [终点](https://github.com/VirtualSelect/hohoo-blog/actions/runs/45203255200)

## 线上核对

北京时间 11 月 25 日 21:15 执行 `npm run news:status -- --json`。远端 `main` 的提交为 `a9e9d0119bad9b725fa2924f0ee13d4d4a951a21`，与网站归档数据 SHA-256 `bc2c9c7cd2e3c72a1834ce0ed426d2181bdca94d46fd2924aca80ce0707a4f11` 一致。两边均为 234 条原始记录、233 条聚合信号，最近收录于 11 月 25 日 19:40。RSS 的聚合条数与最新发布时间也一致。工作区基线快照为 228 条记录、227 条聚合信号。[远端固定归档](https://github.com/VirtualSelect/hohoo-blog/blob/a9e9d0119bad9b725fa2924f0ee13d4d4a951a21/data/news/items.json) · [生产快照](https://huhohoo.com/radar/snapshot.json) · [生产 RSS](https://huhohoo.com/news/rss.xml)

## 已核对的报告

各运行链接的 `news-run-report` 产物包含 `news-report.json`。下表中的「超窗」为原始排除原因，只有新版的「未归档超窗」列可用来检查当时未入库的候选。所有条目事件按报告 `runAt` 转为北京时间分组，配额按报告内 UTC 日期解读。通过选中 ID 与固定远端归档逐一比对，再以生产快照的全量指纹确认当前数据一致。

| 北京时间    | 运行与报告                                                                          | 选中且已入归档 | 重复 | 超窗 | 配额预留 | 未归档超窗 |
| ----------- | ----------------------------------------------------------------------------------- | -------------: | ---: | ---: | -------: | ---------- |
| 11-19 01:30 | [44359354995](https://github.com/VirtualSelect/hohoo-blog/actions/runs/44359354995) |              2 |    4 |    0 |        0 | 旧报告     |
| 11-19 08:42 | [44431117670](https://github.com/VirtualSelect/hohoo-blog/actions/runs/44431117670) |              2 |    4 |    0 |        0 | 旧报告     |
| 11-19 18:43 | [44508241143](https://github.com/VirtualSelect/hohoo-blog/actions/runs/44508241143) |              0 |    6 |    0 |        0 | 旧报告     |
| 11-20 04:56 | [44613665128](https://github.com/VirtualSelect/hohoo-blog/actions/runs/44613665128) |              1 |    4 |    0 |        0 | 旧报告     |
| 11-20 11:42 | [44669452193](https://github.com/VirtualSelect/hohoo-blog/actions/runs/44669452193) |              0 |    5 |    0 |        0 | 旧报告     |
| 11-20 21:31 | [44745050917](https://github.com/VirtualSelect/hohoo-blog/actions/runs/44745050917) |              1 |    2 |    3 |        0 | 旧报告     |
| 11-21 05:56 | [44824655774](https://github.com/VirtualSelect/hohoo-blog/actions/runs/44824655774) |              1 |    2 |    1 |        0 | 旧报告     |
| 11-21 11:25 | [44861021585](https://github.com/VirtualSelect/hohoo-blog/actions/runs/44861021585) |              1 |    3 |    1 |        0 | 旧报告     |
| 11-21 20:57 | [44906431563](https://github.com/VirtualSelect/hohoo-blog/actions/runs/44906431563) |              0 |    4 |    1 |        0 | 旧报告     |
| 11-22 04:39 | [44947374304](https://github.com/VirtualSelect/hohoo-blog/actions/runs/44947374304) |              0 |    3 |    1 |        0 | 旧报告     |
| 11-22 10:37 | [44976907120](https://github.com/VirtualSelect/hohoo-blog/actions/runs/44976907120) |              1 |    3 |    1 |        0 | 旧报告     |
| 11-22 20:49 | [45024250015](https://github.com/VirtualSelect/hohoo-blog/actions/runs/45024250015) |              0 |    2 |    3 |        0 | 旧报告     |
| 11-23 04:49 | [45068568880](https://github.com/VirtualSelect/hohoo-blog/actions/runs/45068568880) |              0 |    2 |    3 |        0 | 旧报告     |
| 11-23 11:03 | [45103644372](https://github.com/VirtualSelect/hohoo-blog/actions/runs/45103644372) |              1 |    0 |    5 |        0 | 旧报告     |
| 11-23 23:16 | [45203255200](https://github.com/VirtualSelect/hohoo-blog/actions/runs/45203255200) |              2 |    1 |    6 |        0 | 旧报告     |
| 11-24 11:01 | [45316517195](https://github.com/VirtualSelect/hohoo-blog/actions/runs/45316517195) |              3 |    3 |    4 |        0 | 旧报告     |
| 11-24 23:12 | [45422740120](https://github.com/VirtualSelect/hohoo-blog/actions/runs/45422740120) |              1 |    5 |    5 |        0 | 旧报告     |
| 11-24 23:46 | [45429289399](https://github.com/VirtualSelect/hohoo-blog/actions/runs/45429289399) |              0 |    6 |    5 |        0 | 0          |
| 11-25 09:01 | [45522614678](https://github.com/VirtualSelect/hohoo-blog/actions/runs/45522614678) |              4 |    3 |    5 |        0 | 0          |
| 11-25 19:40 | [45606506419](https://github.com/VirtualSelect/hohoo-blog/actions/runs/45606506419) |              2 |    6 |    5 |        1 | 0          |
