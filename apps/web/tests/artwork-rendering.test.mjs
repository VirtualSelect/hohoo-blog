import test from "node:test";
import assert from "node:assert/strict";
import { artworkPixelRatio } from "../components/theme-artwork-rendering.ts";

test("high-DPI phones retain detail without exceeding the mobile buffer budget", () => {
  for (const [w, h] of [
    [375, 500],
    [430, 932],
    [844, 390],
  ]) {
    const ratio = artworkPixelRatio(w, h, 3, true, false);
    assert.ok(ratio > 1);
    assert.ok(ratio <= 1.75);
    assert.ok(w * h * ratio * ratio <= 2_000_001);
  }
});

test("fullscreen ultra-wide buffers and adaptive fallback stay bounded", () => {
  for (const [w, h] of [
    [1440, 900],
    [2560, 1440],
    [3840, 2160],
  ]) {
    for (const degraded of [false, true]) {
      const ratio = artworkPixelRatio(w, h, 2, false, degraded);
      assert.ok(ratio > 0 && Number.isFinite(ratio));
      assert.ok(w * h * ratio * ratio <= (degraded ? 1_250_001 : 4_000_001));
    }
  }
  assert.equal(artworkPixelRatio(375, 500, 1, true, false), 1);
});
