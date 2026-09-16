import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateJourney, validateVirtualLabs } from "../lib/journey.mjs";
const read = (file) =>
  JSON.parse(fs.readFileSync(new URL(file, import.meta.url), "utf8"));
const data = () => read("../../../data/journey.json");
const labs = () => read("../../../data/journey-labs.json");
test("Virtual labs reject broken engine, project, milestone and week relations", () => {
  for (const change of [
    (r, d) => (r.labs[0].engine = "unknown"),
    (r, d) => (r.labs[0].project = "invented"),
    (r, d) => (r.labs[0].milestones = ["M99"]),
    (r, d) => (d.weeks[0].labs = ["missing"]),
    (r, d) => (d.currentWeek = 9),
  ]) {
    const r = labs(),
      d = data();
    change(r, d);
    assert.throws(() => validateVirtualLabs(r, d));
  }
});
test("Future labs cannot carry fabricated results or unsafe references", () => {
  const r = labs();
  r.labs[3].result = "invented result";
  assert.throws(() => validateVirtualLabs(r, data()), /unexecuted/);
  r.labs[3].result = null;
  r.labs[0].articles = [
    { titleKey: "journey.title", href: "javascript:alert(1)" },
  ];
  assert.throws(() => validateVirtualLabs(r, data()), /unsafe/);
});
test("Completed lab needs dates and evidence, valid results remain maintainable", () => {
  const r = labs(),
    lab = r.labs[0];
  lab.status = "completed";
  assert.throws(() => validateVirtualLabs(r, data()), /evidence/);
  Object.assign(lab, {
    startedAt: "2026-09-16",
    completedAt: "2026-09-17",
    result: "journey.test.result",
    evidence: [
      {
        titleKey: "journey.test.evidence",
        href: "https://example.com/fixture",
      },
    ],
  });
  assert.doesNotThrow(() => validateVirtualLabs(r, data()));
});
test("Journey rejects cycles, unknown prerequisites and unsupported states", () => {
  for (const mutate of [
    (d) => d.milestones[0].prerequisites.push("M10"),
    (d) => d.milestones[0].prerequisites.push("M99"),
    (d) => (d.milestones[0].status = "published"),
  ]) {
    const d = data();
    mutate(d);
    assert.throws(() => validateJourney(d));
  }
});
test("Journey completion requires dates, result and evidence", () => {
  const d = data();
  Object.assign(d.milestones[0], {
    status: "completed",
    startedAt: "2026-09-16",
    completedAt: "2026-09-17",
    result: "test fixture",
  });
  assert.throws(() => validateJourney(d), /evidence/);
  d.milestones[0].evidence = [
    { title: "test fixture", href: "https://example.com/test" },
  ];
  assert.doesNotThrow(() => validateJourney(d));
});
for (const locale of ["zh-CN", "zh-TW", "en"]) {
  test(
    locale +
      ": Journey links resolve without entering the published content feed",
    () => {
      const d = validateJourney(data()),
        generated = read("../generated/" + locale + ".json"),
        messages = read("../../../i18n/" + locale + "/code.json");
      assert.equal(d.milestones.length, 10);
      assert(generated.routes.includes("journey"));
      assert(generated.routes.includes("journey/virtual-lab"));
      const registry = validateVirtualLabs(labs(), d);
      assert.equal(registry.labs.length, 4);
      assert.equal(
        registry.labs.find((lab) => lab.engine === "isaac").status,
        "future",
      );
      for (const lab of registry.labs) {
        for (const key of [
          lab.titleKey,
          lab.descriptionKey,
          lab.robotKey,
          lab.environmentKey,
          ...lab.steps,
        ])
          assert(messages[key]?.message, key);
        for (const ref of lab.articles.filter((ref) =>
          ref.href.startsWith("/"),
        ))
          assert(generated.routes.includes(ref.href.slice(1).split("#")[0]));
      }
      for (const key of [
        ...d.targetProject.architecture,
        ...d.simulation.executionLoop,
        ...d.simulation.trainingLoop,
        ...d.simulation.dataArchitecture,
        ...d.simulation.sim2real,
      ])
        assert(messages[key]?.message, key);
      assert(
        !generated.globalData["content-index"].entries.some(
          (item) => item.id === "virtual-lab",
        ),
      );
      assert.equal(
        generated.search.find((item) => item.id === "virtual-lab").title,
        messages["journey.virtual.title"].message,
      );
      assert(generated.search.some((item) => item.id === "journey"));
      assert(
        !generated.globalData["content-index"].entries.some(
          (item) => item.id === "journey",
        ),
      );
      for (const m of d.milestones) {
        assert(messages[m.titleKey]?.message);
        assert(messages[m.goalKey]?.message);
        for (const path of m.articles)
          assert(generated.routes.includes(path.slice(1)));
      }
      const source = read("../../../i18n/zh-CN/code.json");
      for (const key of Object.keys(source).filter((k) =>
        k.startsWith("journey."),
      ))
        assert(messages[key]?.message, key);
    },
  );
}
