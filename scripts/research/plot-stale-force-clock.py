"""Plot the decision and state clocks in one archived MuJoCo episode."""
import argparse
import csv
import gzip
import hashlib
import io
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

COMMIT = "1d1faab57e20b352761e9abc736c6d277b505e6b"
ARCHIVE = "evidence/planar-reliability-20261011"
MANIFEST_LF_SHA = "7562134003011a495c51576bb70aadd359b1a85bff55f0ba39d8de3571c537ac"
INK, ACCENT, GRID = "#173b47", "#a74726", "#dadfdf"
COPY = {
    "en": ("When force drops to zero", "Permanent loss · zero policy · seed 73",
           "Last sample", "Arrives", "Zero force", "Sample age (ms)",
           "Applied force, x (N)", "Velocity, x (m/s)", "Simulation time (ms)"),
    "zh-CN": ("力归零时，物体还在滑行", "永久失联 · zero 策略 · 种子 73",
              "最后采样", "样本到达", "控制力归零", "采样年龄（ms）",
              "x 方向施力（N）", "x 方向速度（m/s）", "仿真时间（ms）"),
    "zh-TW": ("施力歸零時，物體仍在滑行", "永久失聯 · zero 策略 · 種子 73",
              "最後取樣", "樣本送達", "控制力歸零", "取樣年齡（ms）",
              "x 方向施力（N）", "x 方向速度（m/s）", "模擬時間（ms）"),
}


def verified(name, data, expected):
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError(f"{name} differs from the pinned archive")
    return data


def read_evidence(folder):
    raw = (folder / "manifest.json").read_bytes().replace(b"\r\n", b"\n")
    manifest = json.loads(verified("manifest.json (LF)", raw, MANIFEST_LF_SHA))
    results_raw = (folder / "results.json").read_bytes()
    # The archived JSON uses Windows line endings. Accept a text checkout on Unix.
    results_raw = results_raw.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
    files = manifest["files"]
    results = json.loads(verified("results.json", results_raw, files["results.json"]))
    record, = (r for r in results if r["section"] == "dropout"
               and r["dropout"] == "permanent" and r["policy"] == "zero" and r["seed"] == 73)
    name = record["trace"]
    csv_bytes = gzip.decompress(verified(name, (folder / name).read_bytes(), files[name]))
    rows = [{k: float(v) for k, v in row.items()}
            for row in csv.DictReader(io.StringIO(csv_bytes.decode("utf-8")))]
    if len(rows) != record["rows"]:
        raise ValueError(f"Unexpected row count for {name}")
    return rows, manifest["protocol"], name, files[name]


def clocks(rows, protocol):
    # run.py sets the force before mj_step and logs qvel afterwards.
    dt = protocol["timestep"]
    decision_ms = [round((r["t"] - dt) * 1000) for r in rows]
    state_ms = [round(r["t"] * 1000) for r in rows]
    checks = [(t, round(r["capture_t"] * 1000)) for t, r in zip(decision_ms, rows)
              if r["control_tick"] == 1 and r["capture_t"] >= 0]
    limit = round(protocol["fresh_limit"] * 1000)
    stale = next(t for t, c in checks if t - c > limit)
    capture = checks[-1][1]
    arrival = next(t for t, c in checks if c == capture)
    return decision_ms, state_ms, checks, limit, capture, arrival, stale


def draw(rows, protocol, locale, out, name, sha):
    title, subtitle, sampled, arrived, zeroed, age_label, force_label, velocity_label, time_label = COPY[locale]
    decisions, states, checks, limit, capture, arrival, stale = clocks(rows, protocol)
    first = decisions.index(stale)
    start, end = capture - 40, stale + 120
    fig = plt.figure(figsize=(4.9, 4.7), facecolor="white")
    grid = fig.add_gridspec(4, 1, height_ratios=[.41, 1, 1, 1],
                            left=.13, right=.965, top=.84, bottom=.12, hspace=.57)
    events, age, force, velocity = [fig.add_subplot(grid[i]) for i in range(4)]
    fig.text(.035, .965, title, color=INK, fontsize=15, weight="bold", va="top")
    fig.text(.038, .897, subtitle, color="#42585d", fontsize=9)
    for axis in (events, age, force, velocity):
        axis.set_xlim(start, end)
        axis.spines[["top", "right", "left"]].set_visible(False)
        axis.spines["bottom"].set_color(GRID)
        axis.tick_params(axis="both", labelsize=8.7, length=0, pad=3)
    events.set_axis_off()
    events.set_ylim(0, 1)
    for t, label, ha in [(capture, sampled, "right"), (arrival, arrived, "left"), (stale, zeroed, "left")]:
        color = ACCENT if t == stale else INK
        events.text(t, .44, label, ha=ha, va="bottom", fontsize=8.6, color=color)
        events.text(t, .36, str(t), ha=ha, va="top", fontsize=8.6, color=color)
    for axis, label in [(age, age_label), (force, force_label), (velocity, velocity_label)]:
        axis.set_title(label, loc="left", color=INK, fontsize=10.8, pad=4)
        axis.grid(axis="y", color=GRID, linewidth=.55)
        axis.axvline(stale, color=ACCENT, linewidth=.9, linestyle=(0, (3, 2)))
    for axis in (age, force):
        axis.tick_params(axis="x", bottom=False, labelbottom=False)
    for t in (capture, arrival):
        age.axvline(t, color=GRID, linewidth=.9, linestyle=(0, (2, 2)))
    age.axhline(limit, color="#70848b", linewidth=.85, linestyle=(0, (3, 2)))
    age.scatter([t for t, _ in checks], [t - c for t, c in checks], s=13, color=INK, zorder=3)
    age.scatter([stale], [stale - capture], s=18, color=ACCENT, zorder=4)
    age.annotate(f"{stale - capture} ms", (stale, stale - capture), xytext=(4, -11),
                 textcoords="offset points", color=ACCENT, fontsize=8.6)
    age.set(ylim=(-10, 255), yticks=[0, limit, 200])
    force.step(decisions, [r["fx"] for r in rows], where="post", color=INK, linewidth=1.7)
    force.scatter([stale], [rows[first]["fx"]], s=20, color=ACCENT, zorder=4)
    force.set(ylim=(-5.1, .7), yticks=[-4, -2, 0])
    velocity.plot(states, [r["vx"] for r in rows], color=INK, linewidth=1.8)
    velocity.scatter([states[first]], [rows[first]["vx"]], color=ACCENT, s=20, zorder=4)
    velocity.annotate(f"{states[first]} ms · {rows[first]['vx']:.6f} m/s",
                      (states[first], rows[first]["vx"]), xytext=(5, 6),
                      textcoords="offset points", color=ACCENT, fontsize=8.5)
    velocity.set(ylim=(.81, 1.30), yticks=[.85, 1.05, 1.25],
                 xticks=list(range(start, end + 1, 40)))
    velocity.set_xlabel(time_label, fontsize=10, labelpad=5)
    desc = f"{COMMIT}:{ARCHIVE}/{name}; sha256={sha}; {len(rows)} recorded steps."
    svg = io.StringIO()
    fig.savefig(svg, format="svg", metadata={
        "Date": None, "Title": title, "Description": desc,
    })
    plt.close(fig)
    normalized = "\n".join(line.rstrip() for line in svg.getvalue().splitlines())
    (out / f"stale-force-clock.{locale}.svg").write_bytes((normalized + "\n").encode("utf-8"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help=f"Path to pinned {ARCHIVE}")
    parser.add_argument("--out", type=Path, default=Path("static/img/research/20261011"))
    args = parser.parse_args()
    rows, protocol, name, sha = read_evidence(args.archive)
    fonts = {font.name for font in font_manager.fontManager.ttflist}
    family = next((name for name in ["Noto Sans CJK SC", "Noto Sans CJK TC", "Arial Unicode MS",
                                      "Microsoft YaHei", "PingFang SC", "WenQuanYi Zen Hei"]
                   if name in fonts), None)
    if not family:
        raise SystemExit("Install a CJK font such as Noto Sans CJK SC to render labels.")
    plt.rcParams.update({"font.family": [family, "DejaVu Sans"], "svg.fonttype": "path",
                         "svg.hashsalt": "stale-force-clock-v1", "axes.unicode_minus": False})
    args.out.mkdir(parents=True, exist_ok=True)
    for loc in COPY:
        draw(rows, protocol, loc, args.out, name, sha)
    decisions, states, _, _, capture, arrival, stale = clocks(rows, protocol)
    i = decisions.index(stale)
    print(f"{name} {len(rows)} rows SHA-256 {sha}\n"
          f"capture {capture} ms; arrival {arrival} ms; first stale decision {stale} ms; "
          f"post-step {states[i]} ms; fx {rows[i]['fx']} N; vx {rows[i]['vx']:.9f} m/s")


if __name__ == "__main__":
    main()
