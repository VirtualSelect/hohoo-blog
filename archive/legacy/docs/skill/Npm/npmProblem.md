---
sidebar_label: npm 命令排查
sidebar_position: 1
title: npm 无法确定可执行命令时如何排查
description: 检查 npm 包的 bin 声明、命令名称和本地依赖，定位可执行命令解析失败。
---

## 问题现象

运行 `npx` 或 `npm exec` 时出现：

```text
npm ERR! could not determine executable to run
```

这通常意味着 npm 无法从指定包中确定要执行的命令。包没有 `bin` 声明，或者存在多个无法唯一匹配的命令，都可能导致这一错误。

## 排查顺序

1. 检查输入的是工具的命令，而不是普通库的包名。并非每个 npm 包都提供命令行工具。
2. 查看目标版本的 `package.json` 和使用文档，确认 `bin` 中实际提供的命令。
3. 如果执行项目脚本，先检查项目 `package.json` 的 `scripts`，使用 `npm run <脚本名>`。
4. 检查依赖是否已经安装，以及安装版本是否与参考文档一致。项目有锁文件时，可以使用 `npm ci` 按锁文件重装依赖；它会先移除现有的 `node_modules`。

当包名与命令名不同，可以显式指定：

```sh
npm exec --package=<包名> -- <命令名> <参数>
```

请将尖括号部分替换为实际值。执行前确认包名及来源可信，因为该命令可能下载并运行包中的程序。

## 不需要删除 Git hooks

`.git/hooks` 保存 Git 钩子，与 npm 选择可执行命令不是同一机制。删除它可能破坏项目已有的提交检查，不应作为此错误的通用修复方法。

参考：[npm exec 官方文档](https://docs.npmjs.com/cli/v10/commands/npm-exec/)。
