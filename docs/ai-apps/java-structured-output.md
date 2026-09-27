---
title: Java LLM 实践（二）：HTTP 200 之后，怎样验收模型的 JSON？
description: 从一次真实的代码围栏响应和三次超时出发，用 Java 8 实现严格结构校验、受限格式适配与可追溯的失败处理。
slug: /ai-apps/java-structured-output
status: published
published_at: '2026-09-28'
updated: '2026-09-28'
reading_minutes: 16
learning_step: structured-output
domain: ai-apps
article_kind: tutorial
difficulty: intermediate
prerequisites: ["doc:ai-apps/java-first-llm"]
related: ["project:hohoo-ai-lab", "doc:ai-apps/java-first-llm"]
---

上一篇让 Java 接上了多轮对话。这一篇向前走一步：假设博客需要根据文章简介选择分类，模型的回答怎样才能进入程序，而不只是打印给人看？

本次实验没有得到“一切顺利”的演示。模型第一次返回 HTTP 200，却没有遵守“不要代码围栏”的要求；后面还遇到了读取超时。我们把这些真实结果保留下来，完成一个可以拒绝不合格结果、也可以明确适配特定格式的 Java 程序。

:::note 实践与证据范围
本轮由 Codex 在作者授权下，于北京时间 2026-09-28 使用本机 Java 8 和 Agnes 接口实际执行。本文由 AI 辅助编写，未声称作者已亲手完成复现或人工审校。在线调用共四次；离线校验、HTTP 故障注入和响应重放分别标注。全部代码与脱敏记录位于独立的 [hohoo-ai-lab 仓库](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0f91065aeac1cb1da22a20ec87a2ab2c14b21938/demos/04-structured-output)。
:::

## 1. 先定义“可用”，再写提示词

任务是给文章简介分类。希望得到这样的对象：

```json
{
  "category": "ai-apps",
  "tags": ["Java", "JSON"]
}
```

这只是一个**格式示例**，不是模型运行记录。程序约定如下：

| 字段 | 约束 | 为什么需要 |
| --- | --- | --- |
| category | ai-apps、llm、embodied-ai、needs-review 四选一 | 不能生成网站不存在的分类 |
| tags | 1～3 个非空字符串，不重复 | 列表组件需要可预期的数据 |
| 单个标签 | 不超过20个 Unicode 码点，无控制字符及首尾空白 | 拦截异常长度与格式 |
| 对象本身 | 必须且只能有这两个字段，不允许重复键 | 避免字段缺失、额外指令或覆盖歧义 |

`needs-review` 表示无关或依据不足，需要再看一下。它是程序里的待审核值，不是博客新增的第四条研究方向。没有它，就可能把“番茄炒蛋”硬分到 LLM。

约束写在 [contract.schema.json](https://github.com/VirtualSelect/hohoo-ai-lab/blob/0f91065aeac1cb1da22a20ec87a2ab2c14b21938/demos/04-structured-output/contract.schema.json)。这份文件用来说明本地契约，**没有发送给 Agnes**；Java 的额外检查包括重复键和控制字符，也不等同于实现了完整的 JSON Schema 标准。

## 2. 两层 JSON，分别负责什么

接口返回值本来就是 JSON，但里面的 `message.content` 仍是一个字符串：

```text
HTTP 响应正文
└─ 外层 JSON：choices、message、finish_reason、usage
   └─ message.content：模型生成的字符串
      └─ 内层 JSON：category、tags
```

因此要依次过四道关：

1. **传输**：HTTP 请求有没有拿到可接受的响应？
2. **协议**：有没有 assistant 消息，是否正常结束，content 是否存在？
3. **结构**：content 是不是符合本地契约的 JSON？
4. **含义**：给这篇文章分的类别是否合理？

前面通过不会自动保证后面通过。例如，模型把炒饭分成 `llm`，字段完全合法，含义仍然错误。

这也是本例的边界：程序解决前三层的一部分检查；语义评价需要独立的标注和判断，不能拿“JSON 能解析”代替分类准确性。

## 3. 第一次真实请求：200 了，为什么还被拒绝？

请求仍使用上一课的端点和模型：

```text
POST https://apihub.agnes-ai.com/v1/chat/completions
model: agnes-2.5-flash
```

system 消息列出了分类和标签规则，明确要求“只返回一个 JSON 对象，不能有 Markdown 或解释”。user 消息是这段公开教学材料：

> 本文介绍使用 Java 调用大模型 HTTP 接口，并用 Gson 解析 JSON。示例中有术语 "接口" 和换行。包括多轮对话。

请求由 Gson 构造，不手拼引号、反斜杠或换行。第一条真实响应的 `content` 是下面这个**字符串表示**；反引号和换行都属于返回内容：

```json
"\n\n```json\n{\"category\":\"ai-apps\",\"tags\":[\"LLM应用\",\"API集成\",\"多轮对话\"]}\n```"
```

外层报告 HTTP 200、`finish_reason=stop`；usage 为输入431、输出79、总计510 Token。严格的内层解析器遇到代码围栏，抛出 `MalformedJsonException`，结果没有被接受。

这条记录说明：**提示词表达了期望，却没有在这一次调用中保证输出格式。** 它没有说明模型永远不遵守格式，也不能据此计算稳定通过率。[查看完整脱敏记录](https://github.com/VirtualSelect/hohoo-ai-lab/blob/0f91065aeac1cb1da22a20ec87a2ab2c14b21938/demos/04-structured-output/evidence/live-20260928/live-1.json)。

## 4. Java 如何严格验收

实现拆成四个小职责：

| 类 | 负责什么 |
| --- | --- |
| ChatClient | HTTPS、等待时间、响应大小、状态码 |
| Classification | API 外层协议和内层分类对象 |
| ContentFormat | 可选且受限的格式适配 |
| StructuredOutput | 组织请求、运行模式、保存证据 |

先检查外层的角色、结束原因和正文。如果 `finish_reason=length`，即使眼前的 JSON 看上去完整，本例也选择拒绝，避免把未完整结束的生成当作确定结果。

内层使用 Gson 的 `JsonReader` 逐个检查 token，而不只是把任意响应反序列化成 DTO。下面摘自核心逻辑：

```java
JsonReader reader = new JsonReader(new StringReader(text));
reader.setLenient(false);

require(reader.peek() == JsonToken.BEGIN_OBJECT, "object_required");
reader.beginObject();

Set<String> seen = new HashSet<String>();
while (reader.hasNext()) {
    String key = reader.nextName();
    require(seen.add(key), "duplicate_field");
    // category 检查字符串及枚举；tags 检查数组、元素类型和数量。
    // 未知字段直接拒绝，完整实现见 Classification.java。
}
```

这里的 `require` 是本例的显式检查方法，不是 Java 的 `assert`。失败就抛异常，运行时不需要另外启用断言开关。

为什么检查实际类型？因为“可以转换成字符串”和“原本就是字符串”不是一回事。标签 `12` 不应因为能显示成“12”就被偷偷接受。

为什么拒绝重复键？像下面这种对象会产生解释歧义：

```json
{"category":"llm","category":"ai-apps","tags":["Java"]}
```

不能让后面的值悄悄覆盖前面的值，再假装输入没有问题。完整源码也检查尾随内容：合法对象之后再接一个对象，同样拒绝。

## 5. 明确适配格式，而不是修补所有坏回答

真实响应里的 JSON 本身满足契约，问题是它被一个代码块包住。产品可以选择继续严格拒绝，也可以**明确允许这种特定包装**。

本例提供一个可选适配器：

```java
String normalized = ContentFormat.unwrapOneJsonFence(raw);
Classification result = Classification.parse(normalized);
```

适配范围很窄：只移除覆盖整个内容的一对 `json` 代码围栏。前面有解释、后面有多余内容、出现两个代码块，都不接受。移除围栏后仍必须通过同一个严格校验器。

它不会猜测类别，不会把 `java` 改成 `ai-apps`，不会从一大段文字里寻找第一对花括号。否则格式适配很容易悄悄变成内容修改。

我们拿已经保存的首次真实响应做了**离线重放**，得到：

```json
{
  "transformation": "unwrap-one-json-fence",
  "accepted": true,
  "classification": {
    "category": "ai-apps",
    "tags": ["LLM应用", "API集成", "多轮对话"]
  }
}
```

这是对同一份旧响应的本地处理结果，**不是新增的一次模型成功调用**。重放文件记录了原始证据路径和 SHA256，便于检查处理的是哪份材料。

## 6. JSON 模式与 Schema 模式不能混为一谈

可以把约束分成三个层次：

| 方式 | 意图 | 本次确认了什么 |
| --- | --- | --- |
| 提示词要求 JSON | 用自然语言说明输出格式 | 曾收到带代码围栏的回答 |
| JSON 模式 | 由支持此能力的服务限制合法 JSON | 本次显式探测超时，支持情况未确认 |
| Schema 约束输出 | 由支持此能力的服务约束字段结构 | 本次未验证，不对 Agnes 作能力承诺 |

显式探测增加了：

```json
{"response_format":{"type":"json_object"}}
```

但这次请求发生了 `SocketTimeoutException`。超时既不能证明参数被支持，也不能证明参数不被支持。因此这个模式是代码里的**可选能力探测入口**，没有自动开启或悄悄回退。

即使服务保证合法 JSON，`{"category":"java"}` 也仍然是合法 JSON，却违反我们的字段和枚举契约。本地验收依然有意义。

## 7. 四次尝试，全部保留

| 请求 | 实际观察 | 本地结果 |
| --- | --- | --- |
| Java 简介，提示词约束 | HTTP200，回答带代码围栏 | 严格校验拒绝 |
| 做饭简介，提示词约束 | 读取超时 | 无可用回答 |
| MuJoCo 简介，提示词约束 | 读取超时 | 无可用回答 |
| Java 简介，json_object 探测 | 读取超时 | 能力未确认 |

没有删除不顺利的记录，也没有为超时请求填上猜测的 Token 用量。证据保留了请求、模型标识、提示词版本、时间、异常类型与客户端耗时，不包含密钥、响应头和 `reasoning_content`。

客户端设置了连接等待10秒、读取等待90秒。读取等待不是严格的整次请求总时限，因此日志里的总耗时可能超过90秒。**客户端超时只说明它没有及时得到可用结果；服务端是否处理、是否计费，不能由这个异常单独确定。** 本例不自动重试。

## 8. 自己运行：先离线，再在线

首次获取代码时，先切到本文验证的提交，再进入第04个 Demo。使用 Java 8 和 Maven：

```powershell
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git
cd hohoo-ai-lab
git checkout 0f91065aeac1cb1da22a20ec87a2ab2c14b21938
cd demos/04-structured-output
```

```powershell
mvn -q compile exec:java '-Dexec.args=--self-test'
mvn -q compile exec:java '-Dexec.args=--replay evidence/live-20260928/live-1.json'
```

第一条运行35项离线检查，第二条重放真实响应。无需密钥，不产生模型调用。

在线模式需要在 IDEA 的运行配置或当前进程环境中设置 `AGNES_API_KEY`。不要把它写进代码或截图。下面命令固定执行三个教学请求，输出目录必须为空：

```powershell
mvn -q compile exec:java '-Dexec.args=--live evidence/my-run'
```

显式 JSON 模式探测只执行一次：

```powershell
mvn -q compile exec:java '-Dexec.args=--live-json evidence/my-json-probe'
```

[代码、环境说明与所有证据](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0f91065aeac1cb1da22a20ec87a2ab2c14b21938/demos/04-structured-output)。本次 Java 版本为1.8.0_171、Gson为2.10.1；文章“第二篇”对应工程的第04个 Demo，因为首篇已经使用了01～03三个 Demo。

35项检查中，HTTP 500、重定向、非法响应和读取超时来自 localhost 测试服务；它们验证客户端的处理行为，不是 Agnes 的错误样本。另有一个刻意设计的测试让“llm + 炒饭”通过结构校验，用来提醒我们不要混淆结构与含义。

## 9. 学完这一篇，应当能解释什么

先自己回答，再展开核对：

<details><summary>为什么 HTTP 200 不能代表分类成功？</summary>

它只通过传输层的一部分检查。仍需检查响应协议、模型正文格式、字段约束和分类含义。本文首次响应就是200但格式不合格。

</details>

<details><summary>移除围栏后，是不是可以直接信任结果？</summary>

不可以。移除围栏只改变包装，不能代替字段校验，更不能证明分类语义正确。测试中的非法枚举在适配后仍被拒绝。

</details>

<details><summary>这篇是否已经实现机器人任务控制？</summary>

没有。当前输出只是文章分类，未接入博客发布或机器人执行。下一步做 Tool Calling 时，需要重新定义工具参数、权限和执行结果，不能把任意合法 JSON 当作可执行指令。

</details>

下一步最值得继续练的，是用同样的“先定义契约，再验收输出”方式，为一个只读工具编写参数检查与失败处理。先把输入边界做好，再让模型产生外部效果。

## 参考与复现依据

- [Gson 2.10.1 JsonReader 源码](https://github.com/google/gson/blob/gson-parent-2.10.1/gson/src/main/java/com/google/gson/stream/JsonReader.java)：用于核对所用版本的流式 JSON 读取行为。
- [JSON Schema：对象约束](https://json-schema.org/understanding-json-schema/reference/object)：required、properties 与 additionalProperties 的含义。
- [Agnes 平台](https://platform.agnes-ai.com/)及本仓库实际响应：本文仅报告已执行请求，不推断未验证的提供商能力。
