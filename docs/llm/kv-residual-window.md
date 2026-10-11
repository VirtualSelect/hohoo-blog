---
title: "KV残差窗口：最近Token一定值得高精度吗？"
description: "用早段与近段注意力对照，解释同样的float32窗口为何收益不同。"
slug: "/llm/kv-residual-window"
status: "published"
published_at: "2026-10-11"
updated: "2026-10-11"
reading_minutes: 10
domain: "llm"
article_kind: "mechanism"
difficulty: "intermediate"
prerequisites: ["doc:llm/kv-packed-groups"]
related: ["lab:packed-kv", "project:hohoo-ai-lab"]
---

[固定代码](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv) · [原始证据](https://github.com/VirtualSelect/hohoo-ai-lab/tree/0d4009cf840052c3111bbfc40dce900326daa3ae/experiments/12-packed-kv/evidence) · [实验档案](/labs/packed-kv)

如果4-bit误差太大，保留最近一段KV为float32，较早部分再量化，是一个直观折中。但“最近”是时间位置，**不一定是当前Query真正关注的位置**。本篇用同一批输入构造早期关注和近期关注的对照，把这个隐藏假设拆出来。

这里仍是合成注意力机制实验。没有模型权重、文本问答或真实任务质量结论。

## 固定预算，先问它保护了谁

缓存分为两部分：

```text
[早期Token：分组4-bit] [最近R个Token：float32]
          N-R                    R
```

量化部分沿用上一篇组长32、K逐通道Token组、V逐Token特征组；R分别为0、16、64。18份相同输入各运行三个R，共54个对照。所有方案仍注意整个上下文，没有把旧Token删除；变化的是数值表示。

为了观察“近期性”假设，early_focus与recent_focus使用同一份基础随机数组，只修改Q/K第一通道，让最早或最近16个位置更容易获得较大分数。其他通道保留随机差异。它不是一份自然语言数据集，也没有把注意力强行设成one-hot。

## 看误差之前，先看注意力权重总量落在哪里

每份输入先使用未量化参考计算最近窗口获得的注意力权重总和，再观察量化输出误差。下表是六份输入（3种子×2长度）的均值；误差为逐输入相对L2的平均，不能当成回答正确率。

| 分布 | R=0误差 | R=16误差 | R=64误差 | R=16保护的注意力权重总量 |
| --- | ---: | ---: | ---: | ---: |
| 干净输入 | 13.450% | 12.863% | 11.477% | 8.28% |
| 关注早期 | 13.386% | 13.366% | 13.365% | **1.23%** |
| 关注近期 | 11.583% | **1.150%** | 1.038% | **77.19%** |

![相同近期窗口在不同注意力分布下的误差](/img/research/20261011/residual-window.zh-CN.svg)

关注近期时，保留16个高精度Token显著降低局部输出误差；继续扩到64只有较小变化。关注早期时，相同内存投入几乎没有改善，因为主要被使用的早期K/V仍然量化着。这不是“窗口越大越好”的论证，而是“空间应保护与当前计算有关的信息”的反例。

表中的注意力权重总量来自未量化参考，是解释工具，不是在线可免费获得的先知指标。不能据此宣布已经实现内容感知的缓存分配器。

## 残差窗口也会吃掉压缩收益

N=128时，完整float32 K/V占32,768字节。三种残差配置的数组payload分别为：

| 最近float32 Token数 | 实际payload | 相对完整float32的减少 |
| ---: | ---: | ---: |
| 0 | 5,136 B | 84.3% |
| 16 | 8,912 B | 72.8% |
| 64 | 18,960 B | 42.1% |

这里计入组补齐、scale和形状。特别是N-R不再整除32时，不能简单按“4-bit部分长度”线性估算。代码保存真实打包数组，让审计从 `nbytes` 复算。

最近16个并不是固定比例：在128长度里占12.5%，在512长度里占3.125%。因此跨长度均值只用于展示这次固定协议，不能直接选一个生产R。实际系统还需要考虑多层、多头、并发会话、分页和追加时的分组转换成本。

## 适用边界：本轮没有测在线更新

本实验一次性构造缓存，然后计算注意力。没有逐Token生成、没有把残差窗口最旧项不断量化搬迁，也没有实现 [KIVI](https://arxiv.org/abs/2402.02750) 的完整残差机制。静态表示的误差与大小可以复算，但不能替代动态缓存更新的延迟和临时内存。

下一篇只验证一个进一步的问题：按块解码能否在保持同一量化结果的前提下缩小单次解码数组，以及这会给本机CPU耗时带来什么变化。

### 小练习与排错

拿early_focus中任意一份输入，先比较R=0和R=64的输出误差，再看 `attention_mass`。如果R=64更贵却几乎没收益，应先检查假设，而不是把结果文件改成更漂亮的数字。尝试增加“最早16个保持高精度”的新策略时，另存协议和输出，不把新条件混进本篇54组数据。

若R=0仍计入尾部数组，检查Python切片：`x[-0:]` 是整个数组。本实现使用 `cut=N-R; x[cut:]` 避免这个坑。若结果突然与参考完全一致，也要检查是否误把量化前K/V传给注意力函数。

## 最小复现与排错

从干净检出目录运行以下PowerShell命令。输出目录必须尚不存在。同组的三篇文章共用一份冻结协议，只需运行一次，再按各篇的证据分组查看。

```powershell
git clone https://github.com/VirtualSelect/hohoo-ai-lab.git hohoo-ai-lab-study
cd hohoo-ai-lab-study
git checkout 0d4009cf840052c3111bbfc40dce900326daa3ae
python -m venv .venv
$py = '.\.venv\Scripts\python.exe'
& $py -m pip install -r experiments/12-packed-kv/requirements.txt
& $py -m unittest discover -s experiments/12-packed-kv -p "test_*.py"
& $py experiments/12-packed-kv/run.py --out experiments/12-packed-kv/target/my-run
& $py experiments/12-packed-kv/audit.py experiments/12-packed-kv/target/my-run
```

本机Windows已验证：Python 3.12.14 + NumPy 2.2.6；4项单测、144组对照、810条原始计时；独立审计预期输出 `PASS`。其他操作系统未复测。若只想核验归档，不重新实验，可将审计参数换为 `experiments/12-packed-kv/evidence`。源码哈希统一LF，证据哈希按原字节；不要改写manifest掩盖差异。

若导入失败，先检查安装与运行是否使用同一个 `$py`。失败输出保留，重跑时换新目录。数值按协议容差复核，耗时是本机观察，不要求复现相同速度。

代码与文章由AI辅助整理，结论以归档且可审计的实际运行记录为限。本轮没有新增付费模型请求，也不代表作者已亲手复现或完成人工审校。
