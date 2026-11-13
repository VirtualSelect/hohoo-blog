import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { embodiedGuideEvidence } from "../lib/embodied-guide.mjs";
import {
  completionViewUrl,
  readCompletionCase,
} from "../lib/completion-view.mjs";
const root = new URL("../../../", import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), "utf8");
test("shared completion conditions preserve locale and unrelated query state", () => {
  const data = embodiedGuideEvidence(read);
  assert.equal(
    readCompletionCase("?completion=post-push", data.cases, data.defaultCase),
    "post-push",
  );
  assert.equal(
    readCompletionCase("?completion=unknown", data.cases, data.defaultCase),
    "lower-drop",
  );
  assert.equal(
    readCompletionCase("", data.cases, data.defaultCase),
    "lower-drop",
  );
  assert.equal(
    completionViewUrl(
      "https://huhohoo.com/en/docs/embodied-ai?ref=reading#old",
      "post-push",
      data.cases,
    ),
    "/en/docs/embodied-ai?ref=reading&completion=post-push#embodied-guide",
  );
  assert.throws(() =>
    completionViewUrl(
      "https://huhohoo.com/docs/embodied-ai",
      "unknown",
      data.cases,
    ),
  );
});
test("archive distinguishes accidental placement, historical completion and missing evidence", () => {
  const data = embodiedGuideEvidence(read);
  assert.equal(data.cases.length, 8);
  const drop = data.cases.find((item) => item.name === "下降松爪");
  assert.deepEqual(
    [drop.physical, drop.ever, drop.current, drop.qualified],
    [true, true, "VALID", "ABORTED"],
  );
  const pushed = data.cases.find((item) => item.name === "释放后推动");
  assert.deepEqual(
    [pushed.ever, pushed.current, pushed.qualified],
    [true, "INVALID", "INVALID"],
  );
  const missing = data.cases.find((item) => item.name === "下降永久缺测");
  assert.deepEqual(
    [missing.ever, missing.current, missing.qualified],
    [false, "UNKNOWN", "ABORTED"],
  );
  assert.equal(data.durationSeconds, 12);
  assert.match(data.source.code, /9800095689ce3893f9e7a6ec681355e76c6fcff6/);
  assert.match(data.correction, /907c10a8fb25e1cec242e335b1a52b21b122fdc6/);
  const reproduce = JSON.parse(read("data/reproduction.json"))[
    "embodied-ai/mujoco-qualified-completion"
  ];
  assert(
    data.source.code.includes(reproduce.commit + "/" + reproduce.directory),
  );
});
test("outcome matrix follows article edits and invalid states or missing corrections stop generation", () => {
  const changed = embodiedGuideEvidence((file) =>
    read(file).replace(
      "| 下降松爪 | 通过 | 是 | VALID | ABORTED |",
      "| 下降松爪 | 通过 | 是 | UNKNOWN | ABORTED |",
    ),
  );
  assert.equal(
    changed.cases.find((item) => item.name === "下降松爪").current,
    "UNKNOWN",
  );
  for (const edit of [
    (text) => text.replace("| 条件 | 最终物理验收 |", "| removed |"),
    (text) =>
      text.replace(
        "| 下降松爪 | 通过 | 是 | VALID | ABORTED |",
        "| 下降松爪 | 通过 | 是 | MAYBE | ABORTED |",
      ),
    (text) => text.replace("[修正版代码与回归命令]", "[removed]"),
  ])
    assert.throws(() => embodiedGuideEvidence((file) => edit(read(file))));
});
for (const locale of ["zh-CN", "en", "zh-TW"])
  test(
    locale +
      ": both scenes and the versioned completion case remain discoverable",
    () => {
      const data = JSON.parse(read("apps/web/generated/" + locale + ".json"));
      for (const slug of [
        "mujoco-first-pick-place",
        "mujoco-planar-pd",
        "mujoco-qualified-completion",
      ]) {
        const entry = data.globalData["content-index"].entries.find(
          (entry) => entry.id === "doc:embodied-ai/" + slug,
        );
        assert(entry && entry.translationStatus !== "MISSING");
      }
      const track = JSON.parse(read("data/learning-paths.json")).find(
        (track) => track.domain === "embodied-ai",
      );
      assert.equal(track.synthesisHref, "/docs/embodied-ai#embodied-guide");
    },
  );
