import test from "node:test";
import assert from "node:assert/strict";
import { languageUrl } from "../lib/navigation.mjs";

test("language changes discard stale anchors while preserving page and filters", () => {
  for (const [route, hash] of [
    ["journey", "architecture"],
    ["journey/virtual-lab", "gazebo-ros2"],
    ["docs/ai-apps/java-first-llm", "%E5%A4%9A%E8%BD%AE%E5%AF%B9%E8%AF%9D"],
    ["radar", "signal-example"],
    ["", "main-content"],
  ]) {
    const current = `https://huhohoo.com/en/${route}?q=ROS2&source=official#${hash}`;
    for (const locale of ["zh-CN", "zh-TW", "en"]) {
      const prefix = locale === "zh-CN" ? "" : "/" + locale;
      assert.equal(
        languageUrl(locale, route, current),
        `${prefix}/${route}?q=ROS2&source=official`,
      );
    }
  }
});

test("language changes without a fragment preserve encoded queries and clean paths", () => {
  assert.equal(
    languageUrl(
      "en",
      "radar",
      "https://huhohoo.com/radar?q=%E6%9C%BA%E5%99%A8%E4%BA%BA",
    ),
    "/en/radar?q=%E6%9C%BA%E5%99%A8%E4%BA%BA",
  );
  assert.equal(languageUrl("zh-CN", "", "https://huhohoo.com/en"), "/");
});
