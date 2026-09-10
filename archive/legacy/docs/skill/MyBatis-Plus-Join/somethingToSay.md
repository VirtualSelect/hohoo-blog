---
sidebar_label: 联表查询记录
sidebar_position: 1
title: MyBatis-Plus-Join 联表查询的关联条件
---

## 不必每张表都直接关联主表

原笔记中“母表一定要与其他表有字段直接关联”的结论过于绝对。关联条件可以引用已经参与查询的其他表，关键是 `ON` 条件和表别名正确。

例如，订单关联用户，用户再关联部门，可以表达为：

```sql
SELECT o.id, u.name, d.name AS department_name
FROM orders o
LEFT JOIN users u ON u.id = o.user_id
LEFT JOIN departments d ON d.id = u.department_id;
```

这里部门通过用户表关联，订单表不需要直接保存部门字段。

## 排查方向

- 对照生成的 SQL，逐个核对 JOIN 的字段和别名。
- 同一张表参与多次关联时，为它们分配不同别名。
- 对照项目安装的版本查看 API，避免照搬其他版本的参数形式。

参考：[MyBatis-Plus-Join 官方连表查询文档](https://mybatis-plus-join.github.io/pages/core/lambda/join.html)。
