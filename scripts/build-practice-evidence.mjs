import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
const source = process.argv[2];
if (!source) throw Error("Pass the hohoo-embodied-agent repository directory.");
const base = path.join(source, "evidence/vl01-20260928-v2");
const result = {
  version: 1,
  commit: "17144c47a2294f157420946b15f78c49d8d17dd5",
  recording: "vl01-20260928-v2",
  samplingHz: 50,
  displayRounding: 4,
  runs: [],
};
for (const [mm, stem] of [
  [0, "vl01-baseline"],
  [25, "vl01-bias25"],
  [50, "vl01-bias50"],
]) {
  const dir = path.join(
    base,
    "bias-" + String(mm).padStart(3, "0") + "mm-run-1",
  );
  const raw = fs.readFileSync(path.join(dir, "trajectory.csv"), "utf8");
  const [header, ...lines] = raw.trim().split(/\r?\n/);
  const keys = header.split(",");
  const rows = lines.map((line) =>
    Object.fromEntries(
      line
        .split(",")
        .map((v, i) => [
          keys[i],
          ["phase", "contacts"].includes(keys[i]) ? v : Number(v),
        ]),
    ),
  );
  const summary = JSON.parse(fs.readFileSync(path.join(dir, "summary.json")));
  const events = JSON.parse(fs.readFileSync(path.join(dir, "events.json")));
  result.runs.push({
    offsetMm: mm,
    episode: path.basename(dir),
    csvSha256: createHash("sha256")
      .update(raw.replace(/\r\n/g, "\n"))
      .digest("hex"),
    summary,
    video: "/media/practice/" + stem + ".mp4",
    poster:
      "/media/practice/" + (mm === 0 ? "vl01-lift" : stem + "-lift") + ".png",
    trajectory: rows.map((r) => [
      Number(r.time.toFixed(4)),
      Number(r.cube_z.toFixed(4)),
    ]),
    stages: events.map((e) => ({
      phase: e.phase,
      start: Number(e.startTime.toFixed(4)),
      observation: rows.find((r) => r.phase === e.phase),
    })),
  });
  fs.copyFileSync(
    path.join(dir, "episode.mp4"),
    "static/media/practice/" + stem + ".mp4",
  );
  fs.copyFileSync(
    path.join(dir, "lift.png"),
    "static/media/practice/" +
      (mm === 0 ? "vl01-lift" : stem + "-lift") +
      ".png",
  );
}
fs.mkdirSync("data/practice", { recursive: true });
fs.writeFileSync("data/practice/mujoco.json", JSON.stringify(result) + "\n");
console.log(
  "Derived display data from three first-episode CSVs; original evidence unchanged.",
);
