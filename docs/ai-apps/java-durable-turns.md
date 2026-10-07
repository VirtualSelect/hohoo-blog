---
title: "Java 对话历史落盘：程序崩溃后，半轮记录怎么办？"
description: "校验追加日志、142种截断前缀和三个真实异常退出子进程，明确本地提交与远端幂等的边界。"
slug: "/ai-apps/java-durable-turns"
status: "published"
published_at: "2026-10-07"
updated: "2026-10-07"
reading_minutes: 9
domain: "ai-apps"
article_kind: "case-study"
difficulty: "intermediate"
related: ["lab:java-durable-turns", "project:hohoo-ai-lab", "doc:ai-apps/java-context-wire-budget"]
---

[固定版本代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant) · [原始证据](https://github.com/VirtualSelect/hohoo-ai-lab/tree/02a2660e22c969e70e3a6f095003614a7dfa448e/demos/11-bounded-assistant/evidence/20261007) · [实验档案](/labs/java-durable-turns)

内存里的整轮提交只在进程活着时有意义。把历史每次覆盖写成一个JSON文件，也会引入新问题：写到一半退出后，整个文件可能不能解析。本文把已经验收的问答作为追加记录，并明确说明哪些损坏能恢复、哪些必须拒绝打开。

范围是单写者、本地小文件。没有数据库、多用户服务或在线模型调用；测试刻意让子进程用 Runtime.halt(23) 退出，再由另一个JVM重开文件。

## 一轮是一条记录，不是两次独立写入

~~~text
JSON {id, question, answer}
        ↓ UTF-8
Base64(payload) + 空格 + SHA256(payload) + 换行
        ↓ 写完全部字节
FileChannel.force(true)
        ↓
更新内存历史、向调用者确认
~~~

换行是完成记录的边界；Base64让正文内的换行不会混淆边界，代价是文件变大。SHA256帮助发现意外损坏，不是鉴权：能修改文件的人也能重算校验和。本例不能防御恶意本地篡改。

写入先于内存更新，force先于成功返回。在系统允许的范围内，这减少“告诉调用者成功但内容仍仅在程序缓冲区”的窗口。[Java8 FileChannel文档](https://docs.oracle.com/javase/8/docs/api/java/nio/channels/FileChannel.html)也说明该保证与存储设备类型相关；本轮没有断电试验或网络文件系统验证。

## 恢复规则必须保守

打开时按完整行逐条验证格式、校验和与重复ID。如果最后还有没有换行的尾巴，截回最后一条完整记录；如果一条已经完整的记录校验失败，则拒绝打开。不能为了“修复成功”跳过中间坏行继续拼接历史，否则会掩盖数据丢失。

本例限制文件4MiB，并持有排他FileLock；第二写者被拒绝。同步程序只在一个拥有者线程使用它，不声称提供数据库隔离级别。

| 故障位置 | 重启后完整轮数 | 解释 |
| --- | --- | --- |
| 第二轮写入之前退出 | 1 | 没有新提交 |
| 第二条记录写入一半后退出 | 1 | 清除未完成尾部 |
| 第二轮提交并force后退出 | 2 | 完整记录被恢复 |

这三个案例真的启动并异常结束了子JVM，不是把“失败”字符串写进结果。除此之外，第二条142字节记录的每个未完成前缀都检查过；完整记录的损坏另行测试为拒绝打开。

## 去重能解决什么

同一ID、同一问题再次提交会返回原答案；相同ID用于另一问题则拒绝。调用远端前可先 find(id)，避免把已有本地结果重复生成。

但有一个无法靠此日志消除的窗口：

~~~text
远端已生成答案 → 本地尚未落盘 → 进程退出
~~~

重启后没有记录，不代表远端没执行。本例既没有事务性远端API，也没有提供商幂等凭证，因此不承诺“模型恰好调用一次”。日志中的去重，只是本地已提交回合的去重。

## 复现与练习

跑完 Suite 后，再看 before.log、partial.log、committed.log 与 crashes.json。前两个文件只有一轮，第三个有两轮；turns.log则是刻意破坏的负例，不能拿它当健康样本。

练习：把完整记录的一个Base64字符改掉但不改校验和，预期打开失败。然后只把最后一行截短，预期旧完整轮仍可恢复。不要在真实聊天文件上练习，使用新目录。

若遇到“journal already open”，先查第二个进程或尚未关闭的实例；若遇到完整记录损坏，保留原文件并排查存储与写入链，不应自动清空。写入异常后应结束本次使用并重新打开恢复，不在同一个可能含部分写入的实例上继续追加。

三个部件可以按“读取已提交历史 → 选择请求上下文 → 执行有预算的操作 → 验收回答 → 提交完整轮”组合。但本轮只交付这些可验证部件，完整在线助手仍需请求语义、模型边界和真实端到端验证。

## 从干净目录复现

需要 Java 8、Python 3、Gson 2.10.1。请将两个路径替换为自己的 JDK 和 jar；既有工程可复用 Maven 缓存。

~~~sh
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 02a2660e22c969e70e3a6f095003614a7dfa448e
python demos/11-bounded-assistant/run.py --java-home /path/to/jdk8 --gson /path/to/gson-2.10.1.jar --out outputs/my-run
python demos/11-bounded-assistant/audit.py outputs/my-run
~~~

输出目录必须不存在。本机验证环境为 Windows，Linux/macOS尚未复测。不需要模型密钥或付费服务。manifest中的代码冻结提交早于上方含证据的归档提交，源码哈希对应实际执行文件。
