"""Redraw one archived E7 condition; never run MuJoCo or change evidence."""
import argparse
import csv
import hashlib
import io
import json
import subprocess
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

COMMIT = "43dacf4bbe72e0eecc288c1dc46692f51be2b43e"
ARCHIVE = "evidence/phase-contracts-20261001"
CONDITION = "lower-drop-late"
POLICIES = ("transfer-only", "reuse-transfer", "phase-aware")
PHASES = {"lower": "#668598", "hold": "#b18a59", "release": "#648874"}


def git_blob(repo, name):
    return subprocess.check_output(["git", "-C", str(repo), "show", f"{COMMIT}:{name}"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repo", type=Path, help="Existing hohoo-embodied-agent checkout")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--preview", type=Path, help="Optional PNG for visual review")
    args = parser.parse_args()
    hashes = json.loads(git_blob(args.repo, f"{ARCHIVE}/raw-sha256.json"))
    protocol = json.loads(git_blob(args.repo, "experiments/vl01_phase_contracts/protocol.json"))
    fault = next(c for c in protocol["conditions"] if c["id"] == CONDITION)
    dt = protocol["dt_s"]
    start, end = fault["start_s"], fault["start_s"] + fault["duration_s"]
    used = {}

    def read(name):
        payload = (args.repo / ARCHIVE / name).read_bytes()
        digest = hashlib.sha256(payload).hexdigest()
        if digest != hashes[name]:
            raise ValueError(f"Archive fingerprint mismatch: {name}")
        used[name] = digest
        return payload.decode("utf-8")

    runs = []
    for policy in POLICIES:
        stem = f"{CONDITION}--{policy}"
        rows = list(csv.DictReader(io.StringIO(read(stem + "/control.csv"))))
        summary = json.loads(read(stem + "/summary.json"))
        events = json.loads(read(stem + "/events.json"))
        if summary["condition"] != CONDITION or summary["policy"] != policy:
            raise ValueError("Unexpected archived condition or policy")
        if events != ([summary["first_stop"]] if summary["first_stop"] else []):
            raise ValueError("Stop event and summary disagree")
        for tick, row in enumerate(rows, 1):
            if int(row["tick"]) != tick or abs(float(row["time"]) - tick * dt) > 1e-8:
                raise ValueError("Unexpected control clock")
        active = [r for r in rows if int(r["fault_active"])]
        if (not active or abs((int(active[0]["tick"]) - 1) * dt - start) > 1e-9
                or abs(int(active[-1]["tick"]) * dt - end) > 1e-9):
            raise ValueError("Recorded fault window differs from the protocol")
        runs.append((policy, rows, summary))

    plt.rcParams.update({
        "font.family": "DejaVu Sans", "font.size": 11,
        "text.color": "#263d3a", "axes.labelcolor": "#263d3a",
        "axes.spines.top": False, "axes.spines.right": False,
        "axes.facecolor": "#faf9f5", "figure.facecolor": "#faf9f5",
        "svg.fonttype": "none", "svg.hashsalt": "hohoo-e7-command-timing-v1",
    })
    fig = plt.figure(figsize=(10.5, 6.8), layout="constrained")
    grid = fig.add_gridspec(2, 2, width_ratios=(4.5, 1.4), height_ratios=(1.25, 1))
    timeline = fig.add_subplot(grid[0, 0])
    outcomes = fig.add_subplot(grid[0, 1], sharey=timeline)
    command = fig.add_subplot(grid[1, 0], sharex=timeline)
    note = fig.add_subplot(grid[1, 1])
    xlim = (start - .4, protocol["schedule_s"]["release"][0] + .3)

    for index, (policy, rows, summary) in enumerate(runs):
        y = 2 - index
        left = 0
        for right in range(1, len(rows) + 1):
            if right < len(rows) and rows[right]["phase"] == rows[left]["phase"]:
                continue
            a, b = (int(rows[left]["tick"]) - 1) * dt, int(rows[right - 1]["tick"]) * dt
            if b > xlim[0] and a < xlim[1]:
                phase = rows[left]["phase"]
                if phase not in PHASES:
                    raise ValueError(f"Unexpected phase in the displayed window: {phase}")
                timeline.broken_barh([(a, b - a)], (y - .18, .36),
                                     facecolors=PHASES[phase], alpha=.82)
            left = right
        event = summary["first_stop"]
        if event:
            t = event["tick"] * dt
            timeline.scatter(t, y, marker="x", color="#263d3a", zorder=4, s=60)
            timeline.annotate(f"stop {t:.3f}s", (t, y), (t + .035, y + .30), fontsize=10)
        else:
            timeline.text(xlim[0] + .015, y + .30, "no stop", fontsize=10)
        outcomes.text(0, y, ("PASS" if summary["placement"] else "FAIL") +
                      "\nrelease " + ("entered" if summary["entered_release"] else "not entered"),
                      va="center", fontsize=10)

    timeline.set(yticks=[2, 1, 0], yticklabels=POLICIES, ylim=(-.5, 2.7),
                 title="A / Recorded control phase", xlim=xlim)
    timeline.legend(handles=[Patch(color=c, label=p) for p, c in PHASES.items()],
                    ncol=3, loc="lower left", fontsize=9, frameon=False)
    outcomes.set_title("Placement @ 9.2s", fontsize=10)
    outcomes.axis("off")

    _, rows, summary = runs[2]
    times = [(int(r["tick"]) - 1) * dt for r in rows]
    command.step(times, [1000 * float(r["target_grip"]) for r in rows], where="post",
                 color="#648874", ls="--", lw=2, label="stored target")
    command.step(times, [1000 * float(r["applied_grip"]) for r in rows], where="post",
                 color="#4b7788", lw=2, label="applied command")
    command.axvline(summary["first_stop"]["tick"] * dt, ls=":", color="#263d3a", alpha=.6)
    command.set(title="B / phase-aware gripper command", ylabel="Actuator command (mm)",
                xlabel="Simulation time (s)", ylim=(-4, 39), yticks=[0, 33])
    command.legend(loc="lower left", fontsize=9, frameon=False)
    note.axis("off")
    note.text(0, .95, "0 = open command\n33 = closed target\n\nOverride ends at 6.440s:\nthe held closed target\napplies again.\n\nThis is not evidence\nof a designed regrasp.",
              va="top", fontsize=10, linespacing=1.5)
    for ax in (timeline, command):
        ax.axvspan(start, end, color="#b18a59", alpha=.12, zorder=0)
        ax.grid(axis="x", alpha=.15)
    fig.suptitle("E7 / Earlier stop does not mean earlier fault detection\n"
                 "Shaded: forced-open override, 6.200-6.440s (same in all runs)", fontsize=13)
    fig.supxlabel("Commands are aligned to step start; crosses mark step-end decisions. "
                  "Hold applies at the next control step. No new simulation.", fontsize=9)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(args.out, metadata={
        "Title": "E7 late-lowering control phases and gripper commands",
        "Description": json.dumps({"sourceCommit": COMMIT, "archive": ARCHIVE, "files": used}),
        "Date": None,
    })
    if args.preview:
        args.preview.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(args.preview, dpi=160)
    plt.close(fig)
    print(json.dumps({"sourceCommit": COMMIT, "condition": CONDITION, "files": used,
                      "output": str(args.out), "bytes": args.out.stat().st_size}, indent=2))


if __name__ == "__main__":
    main()
