# Node.js 与 npm 运行环境

本机开发及 GitHub Actions 使用 Node.js **26.8.2**（Current 正式版本，非 LTS）、npm / npx **12.0.2**。版本分别记录于 `.node-version` 和 `package.json#packageManager`。依赖仍以 `package-lock.json` 为准，没有更换包管理器。

Windows 新运行时并行安装于 `E:\nodejs-26.8.2`，系统 PATH 已从原 `E:\nodejs` 切换到该目录。旧版仍保留；已有终端或 IDE 继承的 PATH 不会自动更新，重新启动应用后运行 `node -v`、`npm -v`、`npx -v` 确认。

如需回退本机环境，将系统 PATH 中 `E:\nodejs-26.8.2` 改回 `E:\nodejs`，再重新启动终端。不要结束无关项目的 Node 进程。

升级验证：全部现有测试、三语言生产构建与本地预览。没有增加业务依赖；Docusaurus 保持 3.10.2。此变更没有修改线上 Vercel 项目设置或触发部署，托管平台的运行时支持范围需要在下次部署时单独核实。

已知非阻断提示：Node 26 构建时可能提示未提供 `--localstorage-file` 的实验性 Web Storage；未为静态构建创建共享用户存储文件。受限环境中 Docusaurus 的更新通知缓存也可能不可写。这两项提示不影响当前构建与浏览器功能。

官方版本来源：[Node.js 下载](https://nodejs.org/en/download)、[npm registry](https://registry.npmjs.org/npm/latest)。下载的 Node.js Windows x64 包已与官方 SHASUMS256 文件核对 SHA-256。
