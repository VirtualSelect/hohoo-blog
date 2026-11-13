# 404恢复路径与文章空结果提示

状态：`codex/content-search-20261111`，本地未提交、未合并、未推送、未发布；保留此前全部待审阅改动。上一轮代码复制回退与阅读工具验收属于已完成的实际进展，本轮从其记录的404服务端日志继续核查。

## 核查结论

修改前，未知地址、英文前缀未知地址、繁体前缀未知地址均返回404 HTML并带`noindex`；正常文章返回200。因此没有把日志直接判断为页面500或生产宕机。

实际路由为预生成的可选catch-all，`dynamicParams=false`。安装的Next.js版本为16.3.5。Next.js仓库中[问题90537](https://github.com/vercel/next.js/issues/90537)记录并确认了同类现象：拒绝不在静态参数中的地址时，返回正确404，但内部控制流错误会被写入日志。本地现象、路由配置和错误类型与其一致；这不是对当前版本所有内部实现的完整证明。

保留`dynamicParams=false`及现有`globalNotFound`，没有屏蔽`console.error`、修改node_modules、引入自定义服务端或为了清除日志将未知路径改成动态生成。日志问题仍然存在，应在上游有明确修复版本后评估升级，不能写成“已修复服务端错误”。[官方约定](https://nextjs.org/docs/app/api-reference/file-conventions/not-found)支持当前顶层动态布局使用独立的全局404文档。

另有两个可以直接改善的真实问题：

1. 原404文档没有`title`，浏览器与辅助技术无法获得明确页面标题。
2. 错误页仅提供栏目链接；读者若记得关键词，还需要先进入目录再输入。沿恢复流程核查时还发现，关键词搜索没有结果会被提示“清除筛选或切换方向”，与实际触发条件不符。

## 本轮修改

- `apps/web/app/global-not-found.jsx`：补`404 · Hohoo`标题与说明，保留框架提供的`noindex`。
- `apps/web/app/[[...segments]]/not-found.jsx`：增加带可见标签、原生必填验证的GET表单；关键词直接交给现有文章页`q`参数。浏览器中的中、英、繁体版本使用各自文章地址。
- `apps/web/app/editorial.css`：表单使用已有主题变量与控件，宽屏并排、窄屏自然换行；按钮触控高度不小于44px。
- `src/components/WritingList.tsx`及`i18n/zh-CN/code.json`、`i18n/en/code.json`、`i18n/zh-TW/code.json`：复用`writing.empty`，说明调整关键词或清除条件，取消无根据的方向归因。
- `apps/web/scripts/verify-routes.mjs`：原有600页、RSS与重定向检查之外，三种语言前缀的未知地址都校验404、标题、`noindex`和搜索入口。
- `docs/CONTENT-MODEL.md`、`docs/ROADMAP.md`：记录实际行为、已知限制和后续优先级。

没有新增页面、索引、依赖、服务或数据；没有改变文章内容、作者结论、实验结果、固定代码链接和阅读状态ID。

## 验证

用户流程为：失效地址 → 输入关键词并提交 → 原有文章匹配 → 打开正文 → 浏览器返回保留原查询。搜索不调用模型或新的后端。

- 中文搜索“缓存”，进入`/articles?q=缓存`，显示9篇真实匹配结果；打开缓存开销文章后返回，查询与结果保留，再返回能回到404表单。
- 英文搜索`cache`进入`/en/articles?q=cache`并显示英文文章；繁体搜索“快取”进入`/zh-TW/articles?q=快取`，显示8篇真实匹配。此数量只是当前标题/摘要词项匹配，不是检索质量指标。
- 未填写查询时，原生表单阻止提交并提示必填；Enter可以提交有内容的查询。
- 中、英、繁体搜索不存在的测试词均显示新空结果文案；英文点击“Clear conditions”能移除查询并恢复近作。
- 1440、1280、1024、768、430、375宽度下表单及按钮均位于视口内，所测全局横向宽度未超出对应视口；375宽度按钮自然换行，实测高度约46.4px。
- 护眼中文手机页、夜间英文桌面页已目视检查；品牌、输入和按钮沿用主题。正常浏览器测试未捕获console error，与服务端的已知日志分别记录。
- 全部三种前缀最终HTTP检查均为404、标题正确且有`noindex`。
- `npm run format:check --prefix apps/web`、`npm run typecheck --prefix apps/web`通过；最后一次构建包含类型验证。
- `npm test --prefix apps/web`：187项通过，0失败。
- `PREVIEW_URL=http://localhost:4216 npm run test:routes --prefix apps/web`：600页，0错误；包括扩展后的三种前缀404检查。
- `npm run i18n:check`：完成，advisory；这不是作者人工审校证明。
- `npm run build --prefix apps/web`通过。本地未压缩静态产物估算143,162,801 bytes，比上一轮143,133,747 bytes增加29,054 bytes；公开资产仍为8,295,764 bytes，客户端资产为2,539,137 bytes。低于250MB本地预算，不等于Vercel历史部署累计用量。

最终预览服务在4216，保留中文404页供检查。截图与六档读数保存在工作区制品目录的`not-found-final-20261112.png`、`not-found-desktop-20261112.png`、`not-found-mobile-20261112.png`、`not-found-widths-20261112.json`。手机截图包含测试空输入时的原生必填提示；不将此提示当作产品异常。验证日志在忽略目录`.cache-loader/not-found-*.log`。

## 剩余边界

- 上游内部日志仍会出现，未修复也未隐藏；后续升级需要重新验证当前静态输出与部署配置。
- 全局404只预生成一份。原始HTML仍为中文、默认表单地址仍为`/articles`；浏览器挂载后适配`/en`或`/zh-TW`，`main`有对应语言标记。没有宣称按请求SSR国际化已完成。文章目录的关键词筛选同样沿用既有客户端同步，核心文章链接仍在静态HTML中。
- 浏览器验证为本机内置浏览器与视口模拟；没有覆盖Safari、Firefox、真机或禁用JavaScript的完整交互。
- 未取得新的云端累计存储读数，未操作云端部署或生产配置。

下一轮回到内容和完整案例的实际缺口：先核查现有Java示例的连接方式、运行入口和故障解释，再决定可复用的整合工作；不将本轮页面改进或离线示例称为新研究成果。
