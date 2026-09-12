---
title: Java 8 调用大语言模型：从第一次请求到多轮对话
description: 用三个真实运行的 Java Demo，理解模型请求、JSON 解析、读取超时与对话历史。
slug: /ai-apps/java-first-llm
status: published
published_at: '2026-09-12'
updated: '2026-09-12'
reading_minutes: 15
learning_step: first-call
domain: ai-apps
difficulty: beginner
related: ["project:hohoo-ai-lab"]
---

:::note 实践说明
本文根据实际学习对话、代码和运行结果整理，已由作者审阅。预计阅读 15 分钟，动手运行时间另计。接口和用量是本次实践记录，不代表服务的长期承诺。代码由 AI 协助编写，调用结果由我在本地运行验证。
:::

第一次调用模型，我从一个最熟悉的入口开始：HTTP 请求。先在接口工具里发送“你好”，再用 Java 完成同样的操作，最后把单次请求扩展成可以连续输入的控制台对话。

这一篇不讨论模型训练，也不急着引入 Spring AI。目标是看清楚：问题怎样发出去，回答怎样取出来，以及下一轮为什么能接上之前的话。

## 先选一个 Demo 跑起来

三个阶段都在 [hohoo-ai-lab 项目](/projects/hohoo-ai-lab) 中，代码目录按学习顺序编号。下面链接固定到本次验证对应的提交，避免后续代码变化导致文章与示例不一致。

| 阶段 | 要弄懂的问题 | 代码与运行说明 |
| --- | --- | --- |
| 01 / REQUEST | Java 怎样发送模型请求？ | [第一次调用](https://github.com/VirtualSelect/hohoo-ai-lab/tree/845fa9f18475b77e761806d14565612680ba6fe1/demos/01-first-llm-call) |
| 02 / PARSE | 怎样从 JSON 中取出回答？ | [解析响应与控制台输入](https://github.com/VirtualSelect/hohoo-ai-lab/tree/845fa9f18475b77e761806d14565612680ba6fe1/demos/02-parse-llm-response) |
| 03 / CHAT | 怎样让下一轮利用历史？ | [多轮对话](https://github.com/VirtualSelect/hohoo-ai-lab/tree/845fa9f18475b77e761806d14565612680ba6fe1/demos/03-multi-turn-chat) |

准备 Java 8、IDEA 和自己申请的 Agnes API Key。我的运行环境报告为 `1.8.0_341`；代码侧另用 `javac 1.8.0_171` 编译验证。第二、三个 Demo 使用 Gson 2.10.1 和独立 Maven 配置，第一个只用 JDK 标准库。

## 01 / 一次调用，本质上发送了什么

这次使用的地址来自 Agnes 平台提供的调用示例，并已在本地验证：

```text
POST https://apihub.agnes-ai.com/v1/chat/completions
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

基础地址是 `https://apihub.agnes-ai.com/v1`，`/chat/completions` 是本次操作的路径。浏览器里的管理平台地址和程序实际调用的地址不是一回事。

请求正文如下，`YOUR_API_KEY` 只是占位符：

```json
{
  "model": "agnes-2.5-flash",
  "messages": [
    { "role": "user", "content": "你好！" }
  ]
}
```

`model` 选择模型，`messages` 是本次交给模型的消息列表。`user` 表示用户消息，`content` 是具体内容。模型返回的消息角色则是 `assistant`。

在 Java 中，这些字段对应熟悉的请求配置。以下是关键片段，完整的流关闭和错误处理请看 Demo 01：

```java
String apiKey = System.getenv("AGNES_API_KEY");
connection.setRequestMethod("POST");
connection.setDoOutput(true);
connection.setRequestProperty("Authorization", "Bearer " + apiKey);
connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
byte[] requestBytes = requestBody.getBytes(StandardCharsets.UTF_8);
```

密钥从环境变量读取，不能写进源码或提交到 GitHub。IDEA 里在运行配置的 **Environment variables** 设置 `AGNES_API_KEY`。在外部终端设置变量，不会让已经打开的 IDEA 自动得到新值。

我的第一次 Java 调用返回 `HTTP 200`，并报告输入 293、输出 104、合计 397 Token。这证明这次请求完成了，但还没有回答“程序怎样只展示模型说的话”。

## 02 / 从一大段 JSON 里找回答

刚收到的 `responseBody` 只是一个 Java 字符串。JSON 库把它解析成有层次的数据，我们才能按字段取值。

下面是从首次 Java 响应保留的字段，不是另一次运行结果：

```json
{
  "choices": [
    {
      "finish_reason": "stop",
      "message": {
        "role": "assistant",
        "content": "\n\n大语言模型是一种基于深度学习和海量文本数据训练的人工智能系统，能够理解、生成和处理复杂的自然语言任务。"
      }
    }
  ],
  "usage": {
    "prompt_tokens": 293,
    "completion_tokens": 104,
    "total_tokens": 397
  }
}
```

“字段路径”就是一层层找值的顺序：`choices` → 第一项 → `message` → `content`。数组从 0 开始，所以第一项写成 `[0]`。

```java
// 简化阅读片段；完整 Demo 还检查字段缺失、类型错误和空数组。
JsonObject root = JsonParser.parseString(responseBody).getAsJsonObject();
JsonArray choices = root.getAsJsonArray("choices");
JsonObject firstChoice = choices.get(0).getAsJsonObject();
JsonObject message = firstChoice.getAsJsonObject("message");
String answer = message.get("content").getAsString();
System.out.println(answer.trim());
```

`\n` 会被解析成实际换行；展示时用 `trim()` 去掉首尾空白。服务还返回了 `reasoning_content`，这个练习不依赖、不展示或保存它，也不把它视为可验证的内部计算记录。

用量在另一个位置：`usage.total_tokens`。本次 `293 + 104 = 397`。Token 不能直接等同于汉字数，接口统计也可能包含我们看不到的输入结构。没有平台计费规则，不能只凭这个数字算费用。若响应没有用量，程序显示“未提供”，而不是填写 0。

### 把固定问题换成输入

```java
String question = scanner.nextLine();
userMessage.addProperty("content", question);
```

`question` 保存的是我输入的问题。Gson 负责把它转换成合法 JSON，不再手工拼接引号。我实际输入了 `请解释 Java 中的 "接口"，并给一个简短例子。`，成功后报告用量为 299 / 246 / 545。双引号没有破坏请求结构。

## 中途遇到的 Read timed out

这次练习并非每次都顺利。输入 Java 接口问题后，程序曾输出：

```text
请求失败: Read timed out
Process finished with exit code 1
```

Demo 02 当时的读取等待上限是 30 秒，后来改成 90 秒，连接等待保持 10 秒。调整后手动重试成功。

两者含义不同：连接超时控制建立连接的等待，读取超时控制读取响应数据时的等待；90 秒不是整个请求的总时限。[Java 8 URLConnection 文档](https://docs.oracle.com/javase/8/docs/api/java/net/URLConnection.html#setReadTimeout-int-)说明了这两个设置的语义。

这次成功不能证明上次一定是模型生成慢，也可能与网络或服务端状态有关。超时不代表服务端没有处理请求，因此程序没有自动重试。IDEA 的 `Disconnected from the target VM` 则是进程退出后的调试连接提示。

## 03 / 多轮对话怎样接上前文

我先做了一组对照：只发送“我上一条消息说了什么”，模型表示不知道；把之前的“你好！”和助手回答一起放入请求后，模型正确指出了“你好！”。

我的理解是：

> 每次对话带上之前对话的记忆，包括问题及回答。

落实到代码，“记忆”就是程序保存的历史消息列表。第三轮发出请求时，结构为：

```text
用户① → 助手① → 用户② → 助手② → 用户③
```

助手③是本次返回的结果，收到后才追加进列表。下一轮重新发送这些消息，而不是仅发送最新一句问题。

Demo 03 的核心流程可以简化为：

```java
history.add(new ChatMessage("user", question));
try {
    ChatResponse response = request(history);
    history.add(new ChatMessage("assistant", response.content));
} catch (RequestFailedException e) {
    removeLastUserMessage();
}
```

失败时撤回本次用户消息，保留之前成功的历史；不捏造助手回答，也不自动重试。完整实现还负责打印回答、用量和非正常结束提示。

### 实际运行结果

| 轮次 | 我输入的内容 | 回答观察 | 输入 / 输出 / 总 Token |
| --- | --- | --- | --- |
| 1 | 你好 | 返回问候 | 285 / 60 / 345 |
| 2 | 我正在学习Java | 回应 Java 学习话题 | 318 / 75 / 393 |
| 3 | 我正在学习什么 | 回答“你正在学习 Java！” | 368 / 81 / 449 |

第三轮的问题本身没有出现 Java，模型仍能根据本次提供的历史回答。输入 Token 也随着这组对话增加，符合请求携带更多历史的情况。这些是单次学习记录，不是性能对比或固定成本。

这份历史只存在当前 Java 进程的内存里，输入 `exit` 后退出，重新启动不会保留。它没有改变模型参数，也不是跨设备或长期记忆。历史还受模型上下文长度限制，本版没有实现压缩或截断。

## 在你自己的环境复现

1. 下载或克隆 [Demo 仓库](https://github.com/VirtualSelect/hohoo-ai-lab)，先阅读所选目录的 README。
2. Demo 01 可直接用 `javac` 编译；Demo 02、03 在 IDEA 中把各自 `pom.xml` 添加为 Maven 项目，使用 Java 8。
3. 为对应主类的运行配置设置 `AGNES_API_KEY`。主类依次是 `FirstLlmCall`、`ParseLlmResponse`、`MultiTurnChat`。
4. 单次输入版输入问题并回车；多轮版先输入“我正在学习 Java”，等回答后再输入“我正在学习什么？”，最后输入 `exit`。
5. 若报错，先区分 HTTP 错误、网络超时和 JSON 结构错误；分享日志时移除密钥，不关闭 TLS 校验来绕过连接错误。

编译与离线自检使用 Java 8 和缓存的 Gson 完成；Maven 插件解析曾在本机仓库配置下等待，不能把直接编译通过说成 Maven 构建通过。离线 fixture 只用于验证转义、字段提取和历史回退；上面的模型回答与 Token 表来自我提供的真实运行结果。

## 请求成功之后，还要检查什么

首次 Java 请求要求“两句话”，回答却只有一句；下一次调用才返回两句。Java 接口问题的回答也出现了“不提供实现”“实现所有方法”这样的绝对表述，与它自己的 `default` 方法例子不一致。

因此需要分开判断：HTTP 200 表示请求成功，`finish_reason: stop` 表示生成以该状态结束，两者都不保证事实正确或完全遵守要求。遇到语言细节仍应查阅 [Java 8 默认方法说明](https://docs.oracle.com/javase/tutorial/java/IandI/defaultmethods.html)。

到这里，我已经把请求、解析、输入和历史串起来了。下一步值得做的是限制和校验输出，让程序不仅“拿到回答”，还能判断回答是否适合后续处理。先把这三个小程序读懂，再进入框架集成。

---

继续查看：[项目说明](/projects/hohoo-ai-lab) · [AI 应用开发](/docs/ai-apps) · [学习路线](/learning)
