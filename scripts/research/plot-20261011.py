"""Render compact publication figures from the archived 2026-10-11 runs.

Usage: python scripts/research/plot-20261011.py --java-repo PATH --embodied-repo PATH
Requires matplotlib 3.10.6; never launches an experiment or changes its evidence.
"""
import argparse
import json
from pathlib import Path
from statistics import mean, median

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

p = argparse.ArgumentParser()
p.add_argument("--java-repo", type=Path, required=True)
p.add_argument("--embodied-repo", type=Path, required=True)
p.add_argument("--out", type=Path, default=Path("static/img/research/20261011"))
a = p.parse_args()
a.out.mkdir(parents=True, exist_ok=True)
load = lambda path: json.loads(path.read_text(encoding="utf-8"))
kv = load(a.java_repo / "experiments/12-packed-kv/evidence/results.json")
timing = load(a.java_repo / "experiments/12-packed-kv/evidence/timings.json")
robot = load(a.embodied_repo / "evidence/planar-reliability-20261011/results.json")
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11,
                     "svg.fonttype": "none", "svg.hashsalt": "hohoo-20261011",
                     "axes.spines.top": False, "axes.spines.right": False,
                     "figure.facecolor": "#faf9f6", "axes.facecolor": "#faf9f6"})
colors = ["#42685d", "#627ca0", "#ab7153", "#847099"]
translations = {
    "4-bit payload includes scales": ("4-bit 存储也要计算 scale 开销", "4-bit 儲存也要計算 scale 開銷"),
    "N=128, D=32. Code arrays + float32 scales + shape metadata; not process memory.": ("N=128，D=32：整数码、float32 scale 与形状元数据；不是进程内存。", "N=128，D=32：整數碼、float32 scale 與形狀中繼資料；不是行程記憶體。"),
    "Stored bytes": ("存储字节数", "儲存位元組數"),
    "A recent high-precision window helps where attention goes": ("高精度近期窗口：收益取决于注意力落点", "高精度近期窗口：收益取決於注意力落點"),
    "Mean relative output L2 over 6 fixed inputs per condition; synthetic attention, not model task quality.": ("每种条件 6 份固定输入的相对输出 L2 均值；合成注意力，不代表模型任务质量。", "每種條件 6 份固定輸入的相對輸出 L2 均值；合成注意力，不代表模型任務品質。"),
    "clean": ("干净输入", "乾淨輸入"), "early focus": ("关注早期", "關注早期"), "recent focus": ("关注近期", "關注近期"),
    "Recent float32 tokens": ("近期 float32 Token 数", "近期 float32 Token 數"), "Output error (%)": ("输出误差（%）", "輸出誤差（%）"),
    "Smaller decode blocks did not make this CPU run faster": ("解码块更小，本机 CPU 耗时却更长", "解碼塊更小，本機 CPU 耗時卻更長"),
    "Median of 135 observations per bar; decode + attention. Prepacking excluded. Windows / NumPy 2.2.6.": ("每列 135 次计时的中位数；解码 + 注意力，不含预打包。Windows / NumPy 2.2.6。", "每列 135 次計時的中位數；解碼 + 注意力，不含預打包。Windows / NumPy 2.2.6。"),
    "float32 cache": ("float32 缓存", "float32 快取"), "decode dense": ("全量解码", "全量解碼"), "decode blocks": ("分块解码", "分塊解碼"),
    "Median time (microseconds)": ("耗时中位数（微秒）", "耗時中位數（微秒）"),
    "Held-out control: lower position error is not a full pass": ("留出验证：位置误差低，不代表完整通过", "留出驗證：位置誤差低，不代表完整通過"),
    "18 episodes per policy. Full contract also requires every tail speed < 0.04 m/s and distance < 15 mm.": ("每策略 18 回合。完整契约要求尾段每步速度 < 0.04m/s 且距离 < 15mm。", "每策略 18 回合。完整契約要求尾段每步速度 < 0.04m/s 且距離 < 15mm。"),
    "Baseline": ("基线", "基線"), "Selected on dev only": ("仅由开发集选择", "僅由開發集選擇"),
    "Mean tail position RMS (mm)": ("尾段位置 RMS 均值（mm）", "尾段位置 RMS 均值（mm）"),
    "Permanent observation loss: zero force is not a brake": ("永久失联：零力不等于制动", "永久失聯：零力不等於制動"),
    "Mean of 3 held-out seeds per bar. Log scale. All 27 dropout-study episodes fail the full contract.": ("每列 3 个留出种子均值；对数刻度。失联对照全部 27 回合均未通过完整契约。", "每列 3 個留出種子均值；對數刻度。失聯對照全部 27 回合均未通過完整契約。"),
    "hold": ("保持", "保持"), "zero": ("置零", "置零"), "fade": ("衰减", "衰減"),
    "No loss": ("正常", "正常"), "0.4–1.0 s loss": ("0.4–1.0 秒丢包", "0.4–1.0 秒丟包"), "Loss from 0.4 s": ("0.4 秒起永久失联", "0.4 秒起永久失聯"),
    "Mean tail RMS (mm, log scale)": ("尾段 RMS 均值（mm，对数刻度）", "尾段 RMS 均值（mm，對數刻度）"),
    "Mass-scaled gains are not a universal improvement": ("按质量缩放增益，并非普遍更好", "按質量縮放增益，並非普遍更好"),
    "6 episodes per mass/controller. Force limit stays at +/-5 N per axis; noise and delay remain.": ("每个质量/策略组合 6 回合；每轴力上限保持 ±5N，噪声与延迟不变。", "每個質量/策略組合 6 回合；每軸力上限保持 ±5N，雜訊與延遲不變。"),
    "fixed": ("固定增益", "固定增益"), "mass scaled": ("按质量缩放", "按質量縮放"),
}

def canvas(title, note):
    f, ax = plt.subplots(figsize=(10, 4.8), layout="constrained")
    f.suptitle(title, fontsize=16, fontweight="bold", x=.02, ha="left")
    f.supxlabel(note, fontsize=9)
    ax.set_axisbelow(True)
    ax.grid(axis="y", alpha=.2)
    return f, ax

def finish(f, name):
    f.savefig(a.out / (name + ".svg"), metadata={"Date": None})
    texts = [(t, t.get_text()) for t in f.findobj(matplotlib.text.Text)]
    for locale, i in [("zh-CN", 0), ("zh-TW", 1)]:
        for t, original in texts:
            t.set_fontfamily("Microsoft YaHei")
            t.set_text(translations.get(original, (original, original))[i].replace(" pass", " 通过" if i == 0 else " 通過"))
        f.savefig(a.out / (name + "." + locale + ".svg"), metadata={"Date": None})
    plt.close(f)

f, ax = canvas("4-bit payload includes scales", "N=128, D=32. Code arrays + float32 scales + shape metadata; not process memory.")
rows = [next(r for r in kv if r["section"] == "groups" and r["n"] == 128 and r["group"] == g and r["bits"] == b) for g,b in [(8,4),(8,8),(32,4),(32,8)]]
bars = ax.bar(["float32", "g8 / 4-bit", "g8 / 8-bit", "g32 / 4-bit", "g32 / 8-bit"], [32768]+[r["bytes"] for r in rows], color=["#aaa99f"]+colors)
ax.bar_label(bars, padding=4); ax.set_ylabel("Stored bytes"); ax.set_ylim(0,38000)
finish(f,"packed-groups")

f, ax = canvas("A recent high-precision window helps where attention goes", "Mean relative output L2 over 6 fixed inputs per condition; synthetic attention, not model task quality.")
for i,c in enumerate(["clean","early_focus","recent_focus"]):
    vals=[mean(r["relative_l2"]*100 for r in kv if r["section"]=="residual" and r["condition"]==c and r["residual"]==n) for n in [0,16,64]]
    ax.plot([0,16,64], vals, marker="o", color=colors[i], label=c.replace("_"," "))
ax.set(xlabel="Recent float32 tokens",ylabel="Output error (%)",xticks=[0,16,64]);ax.legend()
finish(f,"residual-window")

f, ax = canvas("Smaller decode blocks did not make this CPU run faster", "Median of 135 observations per bar; decode + attention. Prepacking excluded. Windows / NumPy 2.2.6.")
for i,method in enumerate(["float32_cache","decode_dense","decode_blocks"]):
    vals=[median(r["nanoseconds"] for r in timing if r["n"]==n and r["method"]==method)/1000 for n in [128,512]]
    bars=ax.bar([x+(i-1)*.25 for x in range(2)],vals,.24,label=method.replace("_"," "),color=colors[i])
    ax.bar_label(bars,fmt="%.1f",padding=3)
ax.set(xticks=[0,1],xticklabels=["128 tokens","512 tokens"],ylabel="Median time (microseconds)",ylim=(0,1560));ax.legend()
finish(f,"decode-cost")

f, ax = canvas("Held-out control: lower position error is not a full pass", "18 episodes per policy. Full contract also requires every tail speed < 0.04 m/s and distance < 15 mm.")
rows=[[r for r in robot if r["section"]=="holdout" and r["method"]==method] for method in ["baseline","selected"]]
bars=ax.bar(["Baseline","Selected on dev only"],[mean(r["tail_rms_m"] for r in group)*1000 for group in rows],color=colors[:2])
ax.bar_label(bars,labels=[f'{mean(r["tail_rms_m"] for r in group)*1000:.2f} mm; {sum(r["success"] for r in group)}/18 pass' for group in rows],padding=6)
ax.set(ylabel="Mean tail position RMS (mm)",ylim=(0,68))
finish(f,"controller-holdout")

f, ax = canvas("Permanent observation loss: zero force is not a brake", "Mean of 3 held-out seeds per bar. Log scale. All 27 dropout-study episodes fail the full contract.")
for i,policy in enumerate(["hold","zero","fade"]):
    vals=[mean(r["tail_rms_m"] for r in robot if r["section"]=="dropout" and r["policy"]==policy and r["dropout"]==drop)*1000 for drop in ["none","burst","permanent"]]
    bars=ax.bar([x+(i-1)*.25 for x in range(3)],vals,.24,label=policy,color=colors[i]);ax.bar_label(bars,fmt="%.1f",padding=3,fontsize=9)
ax.set(xticks=[0,1,2],xticklabels=["No loss","0.4–1.0 s loss","Loss from 0.4 s"],ylabel="Mean tail RMS (mm, log scale)",yscale="log",ylim=(1,75000));ax.legend()
finish(f,"stale-force")

f, ax = canvas("Mass-scaled gains are not a universal improvement", "6 episodes per mass/controller. Force limit stays at +/-5 N per axis; noise and delay remain.")
for i,method in enumerate(["fixed","mass_scaled"]):
    groups=[[r for r in robot if r["section"]=="transfer" and r["controller"]==method and r["mass"]==m] for m in [.5,1,2]]
    vals=[mean(r["tail_rms_m"] for r in g)*1000 for g in groups]
    bars=ax.bar([x+(i-.5)*.3 for x in range(3)],vals,.29,label=method.replace("_"," "),color=colors[i]);ax.bar_label(bars,labels=[f'{v:.2f}\n{sum(r["success"] for r in g)}/6 pass' for v,g in zip(vals,groups)],padding=4,fontsize=9)
ax.set(xticks=[0,1,2],xticklabels=["0.5 kg","1 kg","2 kg"],ylabel="Mean tail position RMS (mm)",ylim=(0,95));ax.legend()
finish(f,"mass-transfer")
for path in a.out.glob("*.svg"):
    # Matplotlib pads path-data lines; trim formatting without touching geometry.
    path.write_text("\n".join(line.rstrip() for line in path.read_text(encoding="utf-8").splitlines()) + "\n", encoding="utf-8", newline="\n")
print("Six figures generated from archived measurements.")
