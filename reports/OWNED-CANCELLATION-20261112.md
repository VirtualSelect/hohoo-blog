# 把连接取消接入整轮日志（本地，未提交）

本轮沿持续迭代队列完善已有Java案例，不新增文章URL、栏目或研究成果计数。博客仍在`codex/content-search-20261111`；配套代码在`codex/bounded-turn-flow-20261112`。两个仓库原有未提交工作均保留，没有合并、推送或部署。

## 解决的实际缺口

上一轮`TurnFlow`只在请求和提交检查点读取取消标记。阻塞读取期间到不了下一个检查，提交资格被撤销不等于连接和线程已经回收。

新增`demos/15-cancellable-turn-flow`，不修改Demo 14协调器、Demo 11日志与预算、旧实验协议或测量。每轮创建新的`CancellationLease`：先设置不可复位标记，再在同步区中取出自己拥有的资源，锁外关闭。资源注册检查同一标记，取消早于注册时关闭迟到资源。旧A lease不拥有新B Socket，正常释放也只处理本轮连接。

`SocketFixtureReplyClient`在connect之前注册Socket，显式无代理且只连接127.0.0.1。它仅处理受控HTTP/1.1关闭连接分帧和SSE，不是完整HTTP客户端。复用的是Demo 10经过JSON词法修订的`StreamReader`；当前文件与`7fb37e8cdc7420c41fa474867b1fb268e97564e9`一致，不能当作原`503f527...`测量的未修订源码。没有叠加另一份Session历史，日志仍只有工作线程拥有并写入。

机制依据：[Java 8 Socket.close](https://docs.oracle.com/javase/8/docs/api/java/net/Socket.html#close--)规定，关闭Socket会令其上阻塞的I/O抛出SocketException。本轮另外记录工作线程的finally退出信号与join后的终止状态，不把Future完成状态当线程回收凭证。

## 实际运行与负结果

最终协议`owned-cancellation-v1`，产物位于Java工程`demos/15-cancellable-turn-flow/out/local-v3`。实际环境为Windows、Java 8u171、Python 3与已有Gson 2.10.1。由AI辅助编写并运行，作者尚未独立复现；没有模型请求、密钥读取、依赖安装或付费服务。

- 原解析器53项词法回归通过；8个受控场景及独立源码/产物审计通过。
- 共收到6份回环请求；11条保存记录中8条为预置、3条为新增，不能合并为成功率。
- `flag-only`仅设置标记，服务端继续门保持关闭，100ms观察结束时工作线程仍未退出。随后显式清理关闭Socket，读取者在服务端放行前退出。它是固定控制观察，不是取消延迟分布。
- `close-reading`在首段到达后撤销资格并关闭连接，也在服务端放行之前退出，没有新增问答。放行后服务端仍执行剩余一步，每份请求最终记录两步，不能据客户端退出推断远端停止计算或计费。
- 启动前、注册前、注册后但connect前取消都没有收到请求；后两者确实创建并最终关闭Socket。这不证明真实阻塞建连已被取消。
- `before-commit`保留已解析完整候选的观察，但日志只有预置轮；`old-lease`在A提交、B读取时取消A旧凭据，B继续完成。后者是同写者串行交接，不是并发多用户服务。

首次`out/local-v1`因Gson省略null字段，独立检查找不到`socketClosed`而失败。失败产物保留；修正为显式序列化null后在新目录运行v2，再在完善清理检查后形成最终v3，未覆盖旧产物，也不将开发重跑当独立统计样本。

两份忽略目录内的产物副本分别篡改“flag-only观察时已退出”和“取消轮已提交”。即使重新计算文件哈希，独立检查仍按协议与日志拒绝。原v3未变。上一轮Demo 14的`out/local-v4 --verify-sources`继续通过（16场景、13次接收、15条预置与4条新增）。

逐场景观察、源码与文件哈希见[实际运行摘要](owned-cancellation-local-20261112.json)。完整原始请求、日志和运行器留在配套工程，没有复制进网站public。

## 文章与文件

- `docs/ai-apps/java-transport-cancellation.md`及英文、繁体译文：保留旧30次测量、固定链接与原发表日期，追加资源归属、控制对照、运行方法、小练习及边界说明。更新日期为2026-11-12。
- `docs/ai-apps/java-durable-turns.md`及两份译文：原参考末尾连接到取消补充，区分已完成的回环读取整合和未完成的提供商适配。
- `data/projects.json`：修正Java项目验证说明，状态继续building；其他项目正文未改。
- `data/localization.json`：同步上述指纹，译文保持AI_TRANSLATED。共享projects文件使另一项目的文件指纹需同步，其日期和审校状态未提升。
- `docs/ROADMAP.md`、`docs/CONTENT-MODEL.md`：更新队列与证据边界，不扩建入口。
- Java工程新增`CancellationLease.java`、`SocketFixtureReplyClient.java`、`CancellationChecks.java`、`run.py`、`audit.py`、`protocol.json`、`README.md`；`.gitattributes`增加新目录LF约定。运行输出、编译产物和依赖仍被忽略。

本轮没有新增客户端组件、生产依赖、数据存储或第三方服务。

## 网页验证

- 既有网页测试187项通过；格式检查通过；三语言审计完成无警告（advisory，不是人工审校）。
- 生产构建及其中TypeScript检查通过；600页路由、RSS、重定向与404检查无错误。框架已知404服务端NoFallbackError仍按前轮记录，不声称已修复。
- 去掉脚本的实际HTTP正文仍包含三语补充、旧版本与修订版链接；补充之间的真实锚点存在。实际返回的索引以`CancellationLease`命中新文章段落，是已知标识符接入检查，不是新增独立评测。[检查记录](owned-cancellation-web-20261112.json)。
- 中文护眼与英文夜间分别检查1440/1280/1024/768/430/375宽度，整页无横向溢出；繁体手机正文和补充跳转已检查。目录、跨文章锚点、语言切换归顶和完整方法的点击/键盘复制正常；所查页面浏览器无console error。隐藏预览中的动画未结束读数没有作为故障结论，显示预览后核对了最终落点。
- 已保存默认尺寸桌面、1440夜间、375护眼截图和12组宽度记录，且检查实际图片。最终恢复默认尺寸和护眼主题，保留正常4216预览。

冻结v1检索协议、算法、513块语料和历史结果未改。v1报告字节SHA256仍为`4148149f5390fef0f26f22e729ff2d7d4a84e74d30b3d7194f52d0d8b91aeeec`；语料内容指纹仍为`0b48da5ef8af7d5d96705278fd46fc8cec0cffb9a39e7f68fa5ae27e05dcd06b`。当前正文522块、61篇，另写current报告；8个有依据问题命中，4个无答案问题中1个仍返回候选，没有改阈值抹去误命中。仍是同组开发验收，不是独立标签评估。

本地静态估算143,621,817 bytes，public为8,339,594 bytes、客户端资产2,540,016 bytes，比上轮静态估算增加195,915 bytes，低于250MB预算。它不等于Vercel云端保留的历史部署累计占用；本轮未取得新云端读数，未删除部署。

## 预览与剩余范围

[查看本地代码讲解](http://localhost:4216/docs/ai-apps/java-transport-cancellation#一轮请求-只拥有自己的连接)。补充开头为同页“把连接取消接到整轮落盘”。配套代码只在本地分支，没有伪造新的固定GitHub链接；上文旧提交均不含Demo 15。

未验证真实DNS、阻塞connect/write、TLS、chunked、鉴权、连接池、任意关闭失败、多用户或真实提供商协议；未做Linux/macOS、其他JDK和真实账单对照。取消与最后检查后的写盘仍可能竞争，不保证撤销已经提交的记录；没有严格硬实时总期限。

后续优先审阅目前两个本地整合，再选择实际客户端与产品提交语义。正式固定版本与公开复现链接须等用户批准提交配套仓库后补齐，不因本地通过自动发布或升级项目完成状态。
