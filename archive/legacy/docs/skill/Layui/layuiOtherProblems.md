---
sidebar_label: 排查清单
sidebar_position: 3
title: Layui 页面问题排查清单
description: 围绕模块、表单渲染和事件绑定，整理现有 Layui 笔记的检查入口。
---

遇到页面不响应或数据没有显示时，先打开浏览器开发者工具，确认控制台错误和接口返回，再对照下面的项目逐项检查。

## 表单事件没有触发

- 检查 `layui.use` 中是否加载了使用的模块。
- 检查 `form.on('select(名称)')` 中的名称与元素的 `lay-filter` 是否一致，不能只设置 `id`。
- 动态添加选择项后，检查是否调用了 `form.render('select')`。

完整片段见 [Form 表单笔记](./layuiFormProblems.md)。

## 表格没有显示预期内容

- 对照返回数据，检查列配置的 `field` 与对象属性是否一致，包括大小写。
- 检查工具栏模板 ID 和事件对应的 `lay-filter`。
- 示例中的业务弹窗封装并非 Layui 自带 API，需要替换为项目自己的实现。

完整片段见 [Table 表格笔记](./layuiTableProblems.md)。
