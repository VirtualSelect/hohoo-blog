import test from "node:test";
import assert from "node:assert/strict";
import { articleVideo } from "../lib/article-media.mjs";

test("recordings preserve bounded intrinsic dimensions without trusting CSS input", () => {
  const src = "/media/practice/completion-replay.mp4";
  const valid = articleVideo("video", { src, width: "1280", height: "448" });
  assert.equal(valid.attribs.width, "1280");
  assert.equal(valid.attribs.height, "448");
  for (const width of [
    "0",
    "-1",
    "99999",
    "100%",
    "1e3",
    "1280px",
    "",
    undefined,
  ]) {
    const result = articleVideo("video", { src, width, height: "448" });
    assert.equal(result.attribs.width, "960");
    assert.equal(result.attribs.height, "640");
  }
});

test("article recordings load only on demand with accessible native controls", () => {
  const result = articleVideo("video", {
    src: "/media/practice/vl01-baseline.mp4",
    poster: "/media/practice/vl01-lift.png",
    autoplay: "",
    onerror: "alert(1)",
    preload: "auto",
    "aria-label": "Recorded simulation",
  });
  assert.equal(result.attribs.preload, "none");
  assert.equal(result.attribs.controls, "");
  assert.equal(result.attribs.autoplay, undefined);
  assert.equal(result.attribs.onerror, undefined);
  assert.equal(result.attribs["aria-label"], "Recorded simulation");
});

test("untrusted media URLs and malformed poster suffixes are rejected", () => {
  for (const src of [
    "https://example.com/a.mp4",
    "//evil/a.mp4",
    "/media/practice/../a.mp4",
    "javascript:alert(1)",
  ])
    assert.equal(articleVideo("video", { src }).tagName, "span");
  const result = articleVideo("video", {
    src: "/media/practice/vl01-baseline.mp4",
    poster: "https://example.com/evilwebp",
  });
  assert.equal(result.attribs.poster, undefined);
});
