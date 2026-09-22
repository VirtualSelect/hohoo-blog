---
title: OpenVLA 代码导读：图像和一句指令，怎样变成机器人动作？
description: 沿着 processor、视觉投影、动作 Token 与反归一化追踪一次推理，重点检查动作单位、边界索引和部署接口。
slug: /embodied-ai/openvla-action-pipeline
status: published
published_at: '2026-09-22'
updated: '2026-09-22'
reading_minutes: 12
domain: embodied-ai
article_kind: mechanism
difficulty: intermediate
related: ["doc:llm/kv-cache", "lab:action-representation"]
---

看到“视觉—语言—动作模型”，很容易把它想成一个会看图、再输出控制指令的聊天机器人。真正需要追问的是：输出的数据是什么？它有几个维度？数字在什么坐标系、什么尺度下才有意义？

本文把原版 OpenVLA 当成一个需要读懂的接口：图像和文字从哪里进入，动作数字从哪里出来，以及这两个端点之间哪些约定不能丢失。

:::note 这是源码导读，不是机器人实验
本文由 AI 辅助整理，依据 [OpenVLA 原论文 v3](https://arxiv.org/html/2406.09246v3) 及官方仓库 2026-09-22 可访问的源码。讨论原版自回归动作 Token 路径，不覆盖 OpenVLA-OFT 等后续变体。没有运行权重、仿真或实体机器人；文中数字算例为教学数据。
:::

## 1. 先看接口，不先看参数量

原版模型将单幅 RGB 观测与语言任务条件映射为机器人动作。其视觉端融合 DINOv2 与 SigLIP 特征，经投影进入语言模型空间，再由 Llama 2 骨干生成动作 Token。论文示例使用七维控制动作。这是论文的架构描述，不意味着所有七维向量都能交给同一台机械臂。[论文第 3 节](https://arxiv.org/html/2406.09246v3#S3) 给出了这一结构。

```text
RGB 观测 + 任务文字
  → processor：图像张量 + 文本 Token
  → 视觉编码器 + projector
  → 视觉嵌入与文字嵌入拼接
  → 自回归生成动作 Token
  → Token ID 解码为归一化数值
  → 数据集统计量反归一化
  → 环境适配器 / 控制器
```

学习时先把最后两行圈出来。文本生成可以直接显示给人，动作向量还需要环境解释；解释错误，数字合法也会执行错误。

## 2. 从四个源码入口开始

| 文件 / 函数 | 读它时要回答的问题 |
| --- | --- |
| `experiments/robot/openvla_utils.py` / `get_vla_action` | 输入图像怎样取得？任务怎样形成提示？ |
| `prismatic/extern/hf/processing_prismatic.py` | 哪些预处理把图像、文字变成模型张量？ |
| `prismatic/extern/hf/modeling_prismatic.py` / `forward`、`predict_action` | 视觉信息插在哪里？输出怎样解码？ |
| `prismatic/vla/action_tokenizer.py` | 连续动作与离散索引如何互转？ |

官方 [推理辅助函数](https://github.com/openvla/openvla/blob/main/experiments/robot/openvla_utils.py) 从观测取出图像，转换为 RGB，按配置处理裁剪，再调用 processor 和 `predict_action`。原版与 v0.1 的提示模板在函数里分支处理。自己随意改写聊天模板，不等同于保持训练时的接口。

[Processor 实现](https://github.com/openvla/openvla/blob/main/prismatic/extern/hf/processing_prismatic.py) 则负责各视觉骨干需要的预处理与文本分词。检查数据时应同时记录原图尺寸、裁剪策略和最终张量形状；不能只检查“文件能打开”。

## 3. 图像不会先被翻译成一段自然语言

在 [模型实现](https://github.com/openvla/openvla/blob/main/prismatic/extern/hf/modeling_prismatic.py) 的多模态路径中，图像经过视觉骨干和投影后，以嵌入的形式接在首个文本 Token 之后。注意力遮罩也相应扩展。它不需要先写出“桌上有一个杯子”再把这句话交给另一个模型。

用形状理解这个接口更直接：设文本有 N 个位置，图像产生 P 个 patch 嵌入，语言隐藏宽度为 D，那么拼接后的输入长度是 N + P，宽度仍为 D。这里 N、P、D 是符号，不是假设某个检查点的真实数值。

如果投影输出宽度不等于 D，拼接就不成立；如果遮罩仍是 N 个位置，注意力输入也不一致。**图像进入模型是一份张量契约，不只是一个图片上传控件。**

## 4. 动作为什么也可以使用 Token？

动作离散化把连续数值映射到有限编号，再借用词表中的 Token 表示编号。训练目标因此能沿用预测下一个 Token 的形式；Token 在这里的含义是动作区间，不是某个日常词语。

真正容易踩坑的是边界。[ActionTokenizer 源码](https://github.com/openvla/openvla/blob/main/prismatic/vla/action_tokenizer.py) 默认使用 `linspace(-1, 1, 256)` 得到边界，再计算相邻边界的中点，所以有 **256 个边界、255 个中点**。编码中的 `digitize` 索引与中点索引不是同一个范围；解码需要减一并裁剪上界。不能读到“256 bins”就自行写出一个不同的等价实现。

下面把它缩小为四个边界，便于手算。它只演示索引规则，**不是 OpenVLA Tokenizer 的替代实现**：

```javascript
const edges = [-1, -1 / 3, 1 / 3, 1];
const centers = edges.slice(1).map((x, i) => (edges[i] + x) / 2);
function roundTrip(value) {
  const clipped = Math.max(-1, Math.min(1, value));
  const bin = edges.filter((edge) => clipped >= edge).length;
  const index = Math.max(0, Math.min(centers.length - 1, bin - 1));
  return { bin, index, decoded: centers[index] };
}
console.log(roundTrip(1));
// { bin: 4, index: 2, decoded: 0.6666666666666666 }
```

这个例子解释了为什么边界值 1 解码后并不是 1：离散表示恢复的是区间中心，量化本来就会损失精度。更重要的是，`bin = 4` 不能直接用作只有三个元素的中心数组索引。

在实际模型中，还要先从生成的词表 ID 还原动作编号。词表大小与用于对齐的填充不能混为一谈；应沿着 `predict_action` 的代码检查，而不是根据模型名称猜一个固定数字。

## 5. 反归一化，决定数字的尺度

`predict_action` 使用所选数据集的 `q01`、`q99` 和 mask，把需要反归一化的维度从模型输出空间映射回动作尺度。对于 mask 为真的某个维度：

```text
action = 0.5 × (normalized + 1) × (q99 - q01) + q01
```

若**教学假设**某轴上下界为 -0.02 和 0.02 米，归一化输出 0.5 对应 0.01 米；同样的输出，若上下界改成 -0.10 和 0.10 米，就变成 0.05 米。五倍差异来自统计量，而不是模型“改变了意图”。实际单位必须由数据集与控制器确认，源码不会自动赋予所有维度“米”的含义。

`unnorm_key` 选择的是检查点内的数据集统计项，不是新的任务指令。选错但碰巧合法的统计项，比明显缺少一个字段更难发现。mask 为假的维度保留归一化值，不能对整条向量无差别套公式。以上接口可直接核对 [predict_action 与 get_action_stats](https://github.com/openvla/openvla/blob/main/prismatic/extern/hf/modeling_prismatic.py)。

## 6. 从返回数组到真正执行，还缺什么？

对于一个准备接入环境的程序，至少应写出下面这份契约，而不是看到七个数就执行：

| 检查项 | 应有的明确说明 | 错配的可能表现 |
| --- | --- | --- |
| 动作含义 | 末端增量、绝对位姿或关节目标 | 方向与移动幅度不符合预期 |
| 参考坐标系 | 世界、基座或工具坐标 | 同一个正方向在环境中不同 |
| 旋转与单位 | 旋转表示、角度单位、平移单位 | 量级异常、姿态跳变 |
| 夹爪约定 | 开闭方向、连续值或二值 | “抓取”变成“松开” |
| 时间 | 图像时间戳、推理耗时、动作执行间隔 | 在旧观测上继续动作 |
| 终止与边界 | 限幅、碰撞处理、终止条件 | 数组有效但任务不能安全结束 |

这张表是接入时的工程检查建议，不是原版模型保证具备的安全能力。离线阶段先保存输入和预测，再在环境适配器中检查形状、有限数值、范围与坐标约定。模型输出通过类型检查，只说明数据可解析；完成抓取仍需要环境观测与任务判据。

## 7. 哪些理解已具备，哪些结果还没有？

现在可以沿源码解释图像嵌入、动作离散化与反归一化，也可以独立验证上面的索引算例。这些是阅读和算术层面的证据。

本站尚未用该检查点完成一次仿真闭环，因此这里没有成功率、轨迹图或“实测有效”的结论。已有 [动作表示实验计划](/labs/action-representation) 可以接住后续工作：固定环境与动作接口，保存输入、预测、执行后的观测和终止原因，再讨论模型表现。

若对自回归生成中的缓存感兴趣，可继续阅读 [KV Cache 拆解](/docs/llm/kv-cache)。但不能因为相邻动作都用了同一条任务指令，就推断不同图像观测之间可以直接复用整段旧缓存；输入前缀是否相同仍需检查。
