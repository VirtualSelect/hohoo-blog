import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import localization from "../../../src/utils/localization.cjs";

for (const locale of ["zh-CN", "zh-TW", "en"]) {
  test(`${locale}: practice articles connect translated reading, code and recorded media`, () => {
    const data = JSON.parse(
      fs.readFileSync(new URL(`../generated/${locale}.json`, import.meta.url)),
    );
    const entries = data.globalData["content-index"].entries;
    const writing = localization.writingEntries(entries);
    for (const slug of [
      "ai-apps/java-structured-output",
      "embodied-ai/mujoco-first-pick-place",
    ]) {
      const entry = writing.find((e) => e.id === "doc:" + slug);
      assert(entry);
      assert.equal(entry.articleKind, "tutorial");
      assert.equal(
        entry.translationStatus,
        locale === "zh-CN" ? "ORIGINAL" : "AI_TRANSLATED",
      );
      const doc = data.documents.find((d) => d.route === "docs/" + slug);
      assert(doc.headings.length >= 9);
      assert(!/JAVA_REF|EMBODIED_REF/.test(doc.html));
      assert.match(
        doc.html,
        /github\.com\/VirtualSelect\/[a-z-]+\/(?:tree|blob)\/[a-f0-9]{40}\//,
      );
      assert(doc.html.includes("<details>"));
      for (const id of entry.related) assert(entries.some((e) => e.id === id));
    }
    for (const id of ["project:hohoo-ai-lab", "project:hohoo-embodied-agent"]) {
      const p = entries.find((e) => e.id === id);
      assert.equal(
        p.translationStatus,
        locale === "zh-CN" ? "ORIGINAL" : "AI_TRANSLATED",
      );
      for (const s of p.sections) assert(s.zh && s.tw && s.en);
    }
    const doc = data.documents.find(
      (d) => d.route === "docs/embodied-ai/mujoco-first-pick-place",
    );
    const videos = [...doc.html.matchAll(/<video\b[^>]*>/g)].map((m) => m[0]);
    assert.equal(
      videos.length,
      2,
      "sanitizer must retain the two real recordings",
    );
    for (const video of videos) {
      assert.match(video, /controls/);
      assert.match(video, /preload="none"/);
      assert.match(video, /aria-label="[^"]+"/);
      assert(!/autoplay|onerror/.test(video));
      const src = video.match(/src="([^"]+)"/)[1];
      assert(fs.existsSync(new URL("../../../static" + src, import.meta.url)));
    }
  });
}
