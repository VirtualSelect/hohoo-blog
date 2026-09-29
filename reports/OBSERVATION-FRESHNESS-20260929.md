# 观测新鲜度研究与发布验收 · 2026-09-29

## 交付

- 具身实践第四篇：`/docs/embodied-ai/mujoco-observation-freshness`，简体、繁体、英文完整正文。
- Lab 008：`/labs/observation-freshness`，复用既有实验模型。
- 首页精选、Now、项目、Journey、时间轴与搜索索引关联新文章；个人 VL01 状态仍为 learning，M4/M5 不自动完成。
- 两幅图来自本轮保存的记录，不是模拟视频或虚构指标。相关代码链接固定到可复现提交。

## 工程与证据

仓库：`VirtualSelect/hohoo-embodied-agent`。

- 冻结协议及执行代码：`7ef9442704ec2e7851f67949097ee8275697aec5`，提交后再运行。
- 文章引用代码和证据版本：`53cc6cbf3fbb3b734b8c5dddfc7e4f0dbddf3f86`。
- 工程主干：`f2fa3f2375872089c6fb33398f4c57f7c54374b9`，已推送。
- 代码：`experiments/vl01_observation_freshness`。
- 证据：`evidence/freshness-20260929`，包含逐回合 control.csv、trajectory.csv、states.jsonl、events.json、summary.json，以及总清单、独立审计和图表。

45 回合 = 3 个观测周期 × 5 个输入条件 × 3 个监测策略，每格一次确定性运行，无随机化或统计成功率声明。控制周期 2ms，常规物理快照 20ms；每个搬运控制步另有决策记录。

固定故障相位下，三次异常计数策略的报警等待为 22/42/102ms，40ms 异常跨度策略为 42/42/52ms。40ms 空报告只有 10ms 周期的计数策略误停。重送旧正常包或静默时，计数和异常跨度均不报警；年龄检查在最近捕获已过去 60ms 时报警。年龄报警表明新证据不足，不等于仅凭年龄确认掉落，也没有恢复放置。

## 验证

- Python：17 项新边界测试与原有 24 项测试通过。
- 独立审计：45 回合，45 对分歧前保存状态前缀一致，9 条无扰动轨迹与上一轮基线一致，无 MuJoCo warning。
- 180 份提交中的原始文件字节哈希与审计记录一致。
- `npm run test:web`：73 项通过。
- CI 其余内容、学习、资讯、阅读状态测试：44 项通过。
- `npm run i18n:check`：无翻译过期告警；共享数据文件修订前，核对了旧版本哈希。
- `npm run news:check`：146 条既有资讯校验通过。
- 本轮源文件 Prettier 检查通过，`git diff --check` 无空白错误。
- `npm run build`：241 个静态页面生成成功。
- `PREVIEW_URL=http://localhost:4202 npm run test:routes --prefix apps/web`：222 个页面及重定向、RSS、404 检查通过。
- 浏览器：三语言 × 六种宽度（1440/1280/1024/768/430/375）× 明暗主题，共36个布局；另测首页、文章、Lab、项目、Journey、时间轴六个375px页面，无页面横向溢出。
- 三语言 canonical 正确，正文无未解析加粗标记，两幅图片正常加载且有本地化替代文本。
- 手机图片放大、Escape 关闭与焦点恢复通过。Ctrl+K 搜索命中新文、无结果查询和 Escape 关闭通过。
- 搜索输入框聚焦后距下一行16px，轮廓2px、偏移2px，不遮挡下文。
- 上述浏览器过程无 pageerror 或 console error。

## 依赖与性能

新增依赖：None。博客新增两幅 PNG 共181,043字节，无新增全局 JavaScript、运行时 API 或模型调用。

## 边界与后续

- 仿真真值、同一时钟、固定故障相位；没有真机、自然滑移、网络抖动或跨机器时钟同步。
- 监测只覆盖 transfer；60ms 是实验门槛，不是经过验证的硬件安全参数。
- 重送保留原序号和捕获时刻，没有测试伪造新时间戳或序号重启。
- 45 次状态前缀核对使用保存的50Hz快照，不声称保存了全部500Hz物理状态。
- 没有继续调用付费模型或读取 API 凭证；LLM 成组对照仍保持待实测状态。
- 工作区原有 package-lock.json、pnpm-lock.yaml、yarn.lock 不纳入本次提交。

下一步已写回原 VL01 待办：延迟与乱序观测、重新观测后的恢复条件。本轮不启动新一轮实验。
