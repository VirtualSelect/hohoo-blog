---
title: "Java LLM 实践（三）：超时之后，别让对话历史悄悄变了"
description: "用候选副本、整轮提交与UTF-8请求预算重写多轮会话边界：41项离线检查，失败不污染历史，裁剪失败也能保留原状态。"
slug: /ai-apps/java-transactional-history
status: published
published_at: "2026-09-30"
updated: "2026-09-30"
reading_minutes: 10
domain: ai-apps
article_kind: case-study
difficulty: intermediate
related: ["doc:ai-apps/java-first-llm", "doc:ai-apps/java-structured-output", "doc:ai-apps/typescript-output-boundary", "lab:transactional-history", "project:hohoo-ai-lab"]
---

[第一次Java调用](/docs/ai-apps/java-first-llm)让我们看到了多轮对话的本质：每次请求重新发送消息历史。到了持续使用的程序，真正棘手的问题变成了：**哪一轮值得进入历史，失败后应该保留什么？**

假设已有“我在学习Java / 可以从接口开始”的成功问答，接着请求超时。下一次如果把失败的问题也带上，模型看到的对话顺序就与用户收到的结果不一致；如果为腾空间而提前删掉旧历史，失败还可能永久抹掉已经成功的对话。

本篇提供第五个Java Demo，围绕“候选请求”和“已提交历史”分离实现。**41项离线检查通过，13次测试替身调用，真实网络请求为0。**这是程序状态实践，不是新的模型记忆能力评测。

[完整Demo](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/demos/05-transactional-chat) · [会话状态实现](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/demos/05-transactional-chat/src/main/java/com/hohoo/ailab/history/Session.java) · [实际检查记录](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/demos/05-transactional-chat/evidence/20260930-contract.json)

## 1. 一次对话的提交边界

最小规则可以写成一行：

```text
旧历史 → 复制候选 → 添加当前问题 → 裁剪候选 → 请求 → 验收 → 提交完整问答
```

请求过程中，已提交历史不变。只有拿到符合完整性条件的回复，才把candidate替换为committed。出错时直接丢弃候选，不需要再猜测“最后一条是不是本轮刚插入的user”。

本例的“事务”只指单进程内存中的会话状态，不涉及数据库事务，也不意味着服务端请求被回滚。

## 2. 为什么不在原列表上先add再remove？

旧Demo已经在失败后撤回最后一条user消息，作为入门很好理解。但当它同时承担历史裁剪、输出校验和更多失败路径时，回滚分支会变多。

候选副本把规则放到一个地方：

```java
List<Message> candidate = new ArrayList<Message>(committed);
candidate.add(new Message("user", question));
// 只修改candidate；transport失败时committed仍然完整。
Reply reply = transport.send(request);
if (reply == null || reply.content == null ||
        reply.content.trim().isEmpty()) {
    throw new Failure("EMPTY");
}
if (!"stop".equals(reply.finishReason)) {
    throw new Failure("INCOMPLETE");
}
candidate.add(new Message("assistant", reply.content));
committed = candidate;
```

这里省略了请求构造和容量裁剪，完整版本见工程。赋值是成功路径中唯一替换会话历史的地方。快照是不可修改的独立列表，调用者不能清空内部历史；Message字段也不可变。

## 3. 哪些结果可以提交？

| 结果 | 对历史的处理 |
|---|---|
| 非空回复，finish_reason=stop | 提交user/assistant完整一对 |
| HTTP 429或其他非2xx | 不提交 |
| 读取超时或I/O错误 | 不提交 |
| 响应包缺字段/无法解析 | 不提交 |
| 空字符串回复 | 不提交 |
| finish_reason=length、缺失或其他值 | 不提交 |
| 空问题或当前问题超出本地预算 | 请求前拒绝，不调用传输层 |

本例是普通文本聊天，不处理tool_calls。因此没有把工具调用结束状态当作完整助手回答。未来增加Tool Calling时，应定义工具循环的提交边界，而不是简单扩大“成功状态”名单。

`stop`只满足本例的完整性约定，不保证回答事实正确。语义判断仍然是另一项工作。

## 4. 历史上限按完整问答对计算

控制台默认最多保留4个已提交问答对。下一次请求可以带上这4对再加当前问题；新回复通过验收后，裁掉最旧一对，让保存状态重新回到4对。

按单条message随意裁剪可能留下孤立assistant回答：

```text
错误的边界：assistant1 → user2 → assistant2 → user3
本例的边界：user2 → assistant2 → user3
```

system指令由请求构造器单独加入，不参与历史淘汰。当前问题始终保留；如果它单独就太大，直接拒绝，而不是截掉一半问题再发给模型。

## 5. 字节预算为什么不是Token预算？

本例还有16000 UTF-8字节的请求体上限，测量的是序列化后整个JSON，包含model、system、角色、引号转义和消息内容：

```java
while (request.getBytes(StandardCharsets.UTF_8).length > maxRequestBytes
        && candidate.size() > 1) {
    candidate.subList(0, 2).clear();
    request = serialize(candidate);
}
```

这是可确定验证的传输体积约束，不是模型上下文窗口，也不能据此推算计费。中文字符、emoji、JSON转义与模型Token化的计数规则不同。

新回复可能很长，导致下一轮需要丢弃那一整对。这里不做摘要，避免把“压缩后的模型文本”悄悄当作原始记忆。想保留更长期的事实，应另做摘要/检索实验。

## 6. 最容易遗漏的失败：裁剪之后又超时

测试中先保存一个较长的成功回答，再发送会触发候选裁剪的问题，随后让测试传输层抛出TIMEOUT。

预期不是“裁剪仍然生效”，而是**整个候选作废，原来的成功问答仍完整保留**。否则一次未完成请求会改变后续对话的基础。

下一次成功时，提交的是实际发送的候选加新回答。被裁掉的旧问答不会在之后的请求中又突然出现。失败不改变状态，成功则准确反映这次使用的上下文。

## 7. 离线检查实际覆盖了什么？

本轮运行环境是Maven使用的Java 1.8.0_171与Gson 2.10.1。

41项断言覆盖消息顺序、失败后历史不变、空输入/预算失败不请求、请求型号、完整问答裁剪、快照不可变、UTF-8长度、候选裁剪失败回滚和畸形响应包。共13次传输替身调用，均在本进程内完成。

其中TIMEOUT、HTTP_429和PARSE是明确注入的故障，不是伪装的真实接口记录。它们能够证明状态机对这些事件的行为，却不能证明网络一定按预想方式失败、模型能记住事实，或在线适配器已经兼容所有供应商响应。

原始报告保留每条检查名、合成请求JSON、源码SHA-256与Java版本，可逐项复核。

## 8. 在线入口与超时语义

Demo也提供 `--live`，使用 `agnes-3.0-flash`，从AGNES_API_KEY环境变量读取密钥；本轮没有执行这个入口。

连接超时10s、读取等待90s，响应正文上限256KiB；不打印错误响应正文、不自动重试。读取超时不能证明服务端尚未处理，也不能保证没有产生费用。

按照 [Java 8 URLConnection文档](https://docs.oracle.com/javase/8/docs/api/java/net/URLConnection.html#setReadTimeout-int-)，读取超时约束读取等待，并不是整个请求的绝对耗时上限。若要提供用户可依赖的整体deadline，需要另外设计取消与状态处理。

## 9. 怎样运行和检查？

从 `demos/05-transactional-chat` 执行：

```bash
mvn -q compile
mvn -q exec:java "-Dexec.args=--self-test evidence/my-run.json"
```

报告使用CREATE_NEW，新路径才可写入，不覆盖已提交证据。想真实聊天时，自行配置环境变量后执行：

```bash
mvn -q exec:java "-Dexec.args=--live"
```

输入exit结束。重启进程后历史清空；没有账户、磁盘记忆或云端同步。控制台错误码对应上面的失败分类。

## 10. 这离生产服务还差什么？

Session用synchronized串行化同一会话，网络等待期间持有锁。这对单人控制台容易推理，但不是高并发服务的终态方案。没有跨进程一致性、请求幂等、取消后的结果对账、持久化或流式输出事务。

下一步应先做两个可分离的验证：一是授权后的真实对话，确认线上请求与错误包处理；二是版本号/并发冲突方案，防止两个并发请求以同一旧历史提交。这里不把离线检查通过写成线上验证完成。

结合 [TypeScript输出边界对照](/docs/ai-apps/typescript-output-boundary)，我们现在有两条清晰边界：外部文本先验收，验收后的整轮结果再进入历史。
