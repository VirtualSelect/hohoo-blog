---
title: "TypeScript 能保证模型输出正确吗？32组输入与 Java 校验器的边界对照"
description: "从类型断言、unknown到原始JSON：复现22个误接收、4个对象校验盲区，以及Java/TypeScript契约一致性的实际边界。"
slug: /ai-apps/typescript-output-boundary
status: published
published_at: "2026-09-30"
updated: "2026-09-30"
reading_minutes: 11
domain: ai-apps
article_kind: case-study
difficulty: intermediate
related: ["doc:ai-apps/java-structured-output", "doc:ai-apps/java-transactional-history", "lab:typescript-output-boundary", "project:hohoo-ai-lab"]
---

在 [Java结构化输出实践](/docs/ai-apps/java-structured-output)里，程序拿到HTTP 200以后，还要检查返回值能否进入业务流程。换到TypeScript，这个问题不会自动消失。

最容易产生错觉的一行代码是：

```typescript
const result = JSON.parse(raw) as Classification;
```

它能让编辑器显示正确字段，却没有证明模型真的返回了这些字段。本轮把相同的32组输入交给Java与TypeScript，比较**类型断言、对象校验、原始JSON校验**三个边界。所有样本与逐项结果公开；没有新增模型调用。

[TypeScript工程](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/experiments/03-typescript-boundary) · [32组输入和结果](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/experiments/03-typescript-boundary/evidence/20260930-boundary) · [Java原校验器](https://github.com/VirtualSelect/hohoo-ai-lab/tree/405c25668d9bb9aee0ccb258b258103271314300/demos/04-structured-output/src/main/java/com/hohoo/ailab/structured/Classification.java)

## 1. TypeScript适合加在哪里？

Java仍负责既有LLM实践。TypeScript作为AI Engineering的补充，用来实现浏览器或Node.js侧的数据适配和交互，并复用相同的业务契约。

本轮只增加独立实验目录，没有重写Java工程，也没有把整个博客转换为TypeScript。依赖只有开发用的TypeScript编译器；校验逻辑使用原生语言能力。这样能先回答一个具体问题，再决定是否扩大技术栈。

本机实际验证：Node.js 26.8.2、TypeScript 7.0.2、Java 1.8.0_171、Gson 2.10.1。Maven使用的Java来自JAVA_HOME，可能不同于另一终端的 `java -version`。

## 2. 类型断言到底做了什么？

按照 [TypeScript官方说明](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)，类型断言不会在运行时校验值。它是在告诉编译器“按这个类型看待它”，不是转换器或验证器。

例如下面的内容是合法JSON，但标签不是字符串：

```json
{"category":"llm","tags":[42]}
```

断言之后，代码可能相信 `tags[0]` 有字符串方法，直到真正调用才失败。类型写得越完整，也不会让已经越过边界的数据自动变正确。

更合适的入口是 `unknown`：先保留“不知道”，在完成检查后才返回可信类型。

## 3. 本轮真正要守的契约

| 字段/边界 | 规则 |
|---|---|
| 根对象 | 只包含category和tags |
| category | ai-apps / llm / embodied-ai / needs-review |
| tags | 1～3个、不重复的字符串 |
| 单个标签 | 非空、无首尾ASCII空白、无控制字符 |
| 标签长度 | 最多20个Unicode码点 |
| 原始内容 | 最多8000个UTF-16代码单元 |
| 重复根字段 | 拒绝，包括转义后同名字段 |
| 验收结果 | 独立拷贝并冻结，不返回输入数组本身 |

为什么分别写“码点”和“UTF-16代码单元”？因为JavaScript的字符串 `.length` 与用户感知的字符数并不总相等。例如本轮20个emoji码点通过，21个被拒绝；原始内容上限则刻意与Java的字符串长度边界对齐。

这仍不是完整国际化文本规范。组合字符与字素簇没有单独计数；首尾空白沿用Java `String.trim` 的ASCII边界。NBSP兼容样本被两边接受，是已记录的契约选择，不是“所有空白都被禁止”。

## 4. 为什么对象校验还不够？

看这一份原始文本：

```json
{"category":"ai-apps","category":"llm","tags":["json"]}
```

对象校验器拿到 `JSON.parse` 后的对象时，只能看见最终的 `category` 值。原文曾经包含两个同名字段的信息已经丢失，后来写再严格的字段类型检查也找不回来。

因此实现分两层：

```typescript
const decoded: unknown = JSON.parse(raw);
uniqueRootKeys(raw);       // 检查原始字段名，包含转义解码
return validateClassification(decoded);
```

原始字符串先通过长度和JSON语法检查，再扫描根对象键；扫描器跟踪字符串转义及嵌套层级，不靠一个匹配双引号的正则硬猜。业务对象不允许嵌套结构，所以这个扫描器只承担**该扁平契约的根字段去重**，不是通用JSON解析器或JSON Schema实现。

## 5. 32组输入是怎么来的？

20组沿用Java已有离线用例，另加12组边界，包括转义同名键、重复tags字段、根数组、嵌套标签、字符串内括号/引号、Unicode长度、NBSP与超大输入。

这些都是刻意构造的测试材料，不是32次模型输出。其中6组预期有效、26组预期无效。这样的样本选择适合找边界漏洞，不适合估计真实使用中的出错比例。

还保留一个“分类语义错误但结构有效”的样本，用来防止我们把格式正确误当成内容正确。

## 6. 实际运行结果

| 入口 | 无效输入被接受数 | 与预期契约一致 |
|---|---:|---:|
| JSON.parse后直接类型断言 | 22 | 10 / 32 |
| 解码后只检查对象 | 4 | 28 / 32 |
| 原始JSON + 对象校验 | 0 | 32 / 32 |
| 既有Java校验器 | 0 | 32 / 32 |

对象校验漏过的4组分别是：普通重复category、转义同名category、重复tags字段，以及超出原始长度上限的合法对象。最后一项不是类型错误，而是**对象入口已经失去了原始文本长度这个条件**。

TypeScript原始入口与Java判定32/32一致。它证明这些固定用例在两个实现中符合相同契约；不能证明未来所有JSON都一致，也不能把22/32称为模型错误率。

## 7. 历史真实响应重放：适配不能偷换成成功

上一轮Java真实响应带有单一JSON代码围栏。直接传入严格入口仍然被拒绝；显式移除**包围整个内容的单一json围栏**后，再走相同校验，结果通过。

这是对2026-09-28已有响应的离线重放，没有再次请求模型。原记录中的 `agnes-2.5-flash` 保留原样，不改写成新型号；后续新调用使用 `agnes-3.0-flash`。

适配器不会猜测分类、补字段、把字符串数字转换为数字，或从大段解释中挑一段JSON。多个围栏也不会静默处理。宽容应该是显式选项，并保留原始输入。

## 8. 为什么运行.ts仍要单独typecheck？

Node可以执行本例中可擦除的类型语法，但直接执行不等于类型检查。[Node官方文档](https://nodejs.org/api/typescript.html)明确区分这两件事。

本工程分别运行：

```bash
npm run typecheck
npm test
npm run experiment -- evidence/my-run
node audit.mjs evidence/my-run
```

编译期检查用 `@ts-expect-error` 验证unknown不能直接当作Classification使用；运行期37项测试检查输入边界、冻结结果、围栏适配与语义边界。任何一项都不能替代另外一项。

## 9. 从零复现Java/TypeScript对照

先在同一工程中编译既有Java校验器：

```bash
mvn -q -f demos/04-structured-output/pom.xml compile
cd experiments/03-typescript-boundary
npm ci
npm run typecheck
npm test
npm run experiment -- evidence/my-run
```

Java探针通过JAVA_HOME运行。Gson使用Maven本地仓库；若不是默认目录，以进程环境变量 `GSON_JAR` 指定已下载的2.10.1 jar。无需API Key。

结果保存输入、四路判定、源码/历史响应哈希、版本与代码提交。审计只允许Git检出引起的LF/CRLF换行差异，不忽略其他内容变化。

## 10. 本轮可以带进真实项目的规则

外部模型结果、HTTP请求体和本地缓存都先视为unknown。对象类型检查解决“形状是什么”，原始文本入口解决“哪些信息会在解码时丢失”；语义是否可靠、来源是否可信、操作是否获准，必须另设边界。

当前不引入新的校验库，是因为只有一个扁平契约。如果后续出现多种嵌套输出、跨服务共享Schema和错误定位需求，再评估成熟Schema库会更划算。先建立验证边界，比先统一所有语言更重要。

继续看 [事务式对话历史](/docs/ai-apps/java-transactional-history)：输出通过校验以后，什么时候才应该进入长期会话状态？
