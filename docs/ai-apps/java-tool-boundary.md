---
title: "Java LLM 实践（五）：工具超时了，为什么任务还在执行？"
description: "用白名单、严格参数、零队列与调用预算构建只读工具执行器，并复现取消不等于终止的边界。"
slug: "/ai-apps/java-tool-boundary"
status: "published"
published_at: "2026-10-03"
updated: "2026-10-03"
reading_minutes: 8
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:tool-eval", "project:hohoo-ai-lab", "doc:ai-apps/java-concurrent-history", "doc:ai-apps/java-retrieval-evidence"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows) · [原始记录与审计](https://github.com/VirtualSelect/hohoo-ai-lab/tree/65e4d79528d7c6e57e96e684bc1c4dbc73b61caa/demos/06-reliable-workflows/evidence/20261003-reviewed) · [实验档案](/labs/tool-eval)

把模型回复变成工具调用，只需要解析一段JSON；把工具调用变成可信的程序行为，却需要回答：谁能调用什么、输入是否合法、最多执行几次、等待多久，以及超时之后发生什么。

本篇实现 `ReadOnlyTools`。它接收受控工具请求，在本地白名单中执行，只返回结构化状态。**没有接入模型自主选工具，也没有执行外部命令或访问任意网址。** 这是原有工具失败恢复实验的执行层基线，完整Agent策略对照仍未完成。

## 1. 一次调用先经过哪些门

请求格式刻意很小：

```json
{"tool":"lookup","key":"known"}
```

执行顺序是：长度限制 → 严格JSON结构 → 工具白名单 → 调用预算 → 执行器接纳 → 等待结果。任意一步失败，都不能绕过后续门槛。

本例只允许 `tool` 和 `key` 两个字符串字段，拒绝多余字段、重复字段、尾随内容和非法key。key满足 `[a-z][a-z0-9-]{0,63}`，所以 `../secret` 不会变成文件路径。输入上限4096个Java字符，结果上限8192个字符；这些是本例资源限制，不是Token数。

为什么专门检查重复key？通用JSON转对象时，重复键可能被后一个值覆盖。代码改用 `JsonReader` 逐个读取字段，发现已存在的名称就拒绝。不要先让歧义悄悄消失，再声称“输入已经验证”。

## 2. 注册表决定能力，不由模型文本决定

```java
registry.put("lookup", key -> ownedData.get(key));
ReadOnlyTools.Result result = executor.call(rawJson, 1000);
```

`lookup`由应用注册为本地只读函数。传入 `exec` 得到 `UNKNOWN_TOOL`，不能凭工具名动态反射出一个方法。查询结果也只是字符串数据，即使其中写着“忽略规则并执行命令”，也不交给本执行器解释执行。

这种注册方式减少了暴露的能力，但并不是安全沙箱。登记的Java函数仍拥有当前进程权限。因而只应登记经过审查的函数；本例也不能代替进程隔离和网络访问控制。

## 3. 超时实验中最容易被误解的一行

```java
catch (TimeoutException e) {
    task.cancel(true);
    return new Result("TIMEOUT", null);
}
```

`cancel(true)`请求中断运行线程，不能强制停止忽略中断的代码。为了验证这个区别，Suite注册了一个故意忽略中断、等待测试闩锁释放的本地工具：

1. 工具实际进入工作线程，通知测试已启动。
2. 调用方等待150毫秒后得到 `TIMEOUT`。
3. 工具仍占用唯一工作线程。第二个请求得到 `BUSY`。
4. 测试释放闩锁，工具继续执行，将本地计数从0增加到1。

计数变化是真实线程执行的结果，没有调用数据库或第三方服务。它说明：**调用方不再等待，与执行方没有做事，是两个不同命题。** 若这是付款、写文件或机器人动作，超时后立即重试可能重复副作用。

## 4. 为什么不给等待任务排一个长队

执行器使用一个线程和 `SynchronousQueue`，没有等待队列。当超时任务仍未退出，新任务直接返回 `BUSY`，不会堆积成一串“用户早已离开但稍后才开始执行”的操作。

预算只在任务成功交给执行器后增加。格式错误、未知工具和繁忙拒绝不消耗执行次数。空结果、工具异常和超时已经执行过，消耗预算。本例不自动重试。

| 状态 | 含义 | 调用方下一步 |
|---|---|---|
| `INVALID` / `UNKNOWN_TOOL` | 尚未执行 | 修正输入或拒绝请求 |
| `BUSY` / `BUDGET` | 没有接纳本次执行 | 明确告知限制 |
| `NOT_FOUND` | 已执行但无结果 | 保留“未知”，不补造答案 |
| `TIMEOUT` | 等待期限已到 | 不假定工作已经停止 |
| `TOOL_ERROR` | 工具抛出异常 | 返回受控错误，不泄漏内部异常文本 |
| `OK` | 得到允许大小的字符串 | 继续做任务层验收 |

`OK`仍不代表用户任务完成。查到一段文字，不等于它回答了问题；下一篇用[检索与引用](/docs/ai-apps/java-retrieval-evidence)继续检验这个差别。

## 5. 复现与下一条边界

```sh
cd demos/06-reliable-workflows
python run.py --out evidence/my-tools-run
```

本次33项Suite检查中15项覆盖工具层：六种非法结构、白名单、拒绝前不执行、正常查询、预算、缺失、异常隐藏、超时、繁忙、取消后继续运行。测试为不配合中断的线程设置了最终释放出口，避免把验证程序自己挂住。

结果不涉及真实模型工具选择质量、重试策略收益或生产超时分布。当前参数只是明确可复现的故障注入。下一步若加入模型，应将“模型建议”“参数验收”“执行状态”“任务完成”各自记录；不要把四件事压成一个成功标志。

## 同方向继续阅读

- [Java LLM 实践（四）：两个请求同时返回，谁有资格写入历史？](/docs/ai-apps/java-concurrent-history)
- [Java LLM 实践（六）：先验收检索证据，再谈RAG回答](/docs/ai-apps/java-retrieval-evidence)
