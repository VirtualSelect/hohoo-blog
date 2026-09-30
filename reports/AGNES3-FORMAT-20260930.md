# Agnes 3.0 在线对照与格式检查修复

## 授权与范围

用户授权读取既有 Agnes 密钥，仅执行已冻结 L1v2-agnes3 的最多 24 次请求；不扩大预算、不重试。博客 TypeScript 迁移不在本轮范围内。

## 格式告警根因与修复

- 现有 `apps/web` 格式检查报告 70 个旧文件告警。执行 Prettier 后，Git 内容差异为零：告警来自工作区 CRLF 换行，不是需要重构的业务逻辑。
- `.gitattributes` 对 `apps/web/**` 使用 `text=auto eol=lf`，保留二进制识别，不改写应用外的历史实验材料。
- 根目录增加 `npm run format:check`，复用原检查范围；GitHub Actions 的 Validate blog changes 在测试之前执行同一检查。
- Windows 回归：临时目录开启 `core.autocrlf=true`，从 Git 索引重新检出检查范围内 124 个文件，CRLF 文件数为 0，Prettier 检查通过。
- Markdown、JSON 研究证据和生成资源不是当前应用格式检查的对象；本次没有以全仓重排格式为由改写这些材料，也没有新增忽略规则来压掉告警。
- 保留任务开始时已有的 `package-lock.json` 工作区状态及未跟踪的 `pnpm-lock.yaml`、`yarn.lock`，未加入本次提交。

## 验证

- `npm run format:check` 通过。
- `npm run test:web`：73 项通过。
- 现有内容索引、阅读状态、论文、Radar、RSS、Timeline 测试组：19 项通过。
- `npm run test:news`：34 项通过（含与上一组重叠的 RSS 测试，不合并为唯一测试总数）。
- `npm run news:check`：150 条资讯通过。

## 在线实验

- 已执行24/24请求，6/6完整块；18个编号正确、6个正确UNKNOWN，无HTTP/协议失败或重试。此后没有新增模型调用。
- 响应返回模型均为agnes-3.0-flash。输入134614、输出144、总计134758 tokens；用量是响应汇总，不是账单。
- UTC 05:06:52.476–05:17:12.120，最短观察暂停20001ms。
- 实际计划与离线准备逐项一致；唯一运行前文件哈希差异为protocol.json的Git换行转换，规范化内容相同。运行manifest保留实际字节哈希。
- Java固定证据版本：`e3cd8fdfdabdd7df3838b3ecb3d79e3db7e5e9d1`。80项既有自检、独立审计与5项新离线审计测试通过。
- 公开文件保留最终回答与必要usage；没有保存密钥、Authorization头或reasoning_content。
- 三语言更新既有成组协议文章，保留2026-09-29原发布日期和历史模型，更新日期2026-09-30；项目与近况复用同一内容入口。未虚增新文章或Lab数量。

## 发布前验收

- 补充结果后再次通过格式、73项Web测试、三语言翻译校验与Next.js生产构建（258个App Router静态内容路径）。
- 生产预览4204：243个页面及旧地址跳转、RSS、404路由检查通过。
- Chrome浏览器检查三语言×护眼/夜间×1440/1280/1024/768/430/375，共36组布局，无页面级横向溢出。
- 六个语言/主题组合均验证审计命令实际复制到剪贴板、Ctrl+K打开搜索、Esc关闭；没有捕获页面或控制台错误。桌面护眼、375px夜间截图已检查。
- 新依赖：None。没有迁移TypeScript，也没有扩大Agnes请求预算。
- Java工程主干已合并推送，合并提交 `16a05f1`。博客通过现有Git集成发布，不修改Vercel项目设置。
