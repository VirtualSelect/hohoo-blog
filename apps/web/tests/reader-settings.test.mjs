import test from "node:test";
import assert from "node:assert/strict";
import { parseReaderSettings } from "../lib/reader-settings.mjs";
test("reader preferences recover from missing, corrupt and unknown versions", () => {
  for (const value of [
    null,
    "{",
    "{}",
    '{"version":2,"width":"wide"}',
    '{"version":1,"width":"huge"}',
  ])
    assert.deepEqual(parseReaderSettings(value), {
      version: 1,
      width: "standard",
    });
  assert.equal(
    parseReaderSettings('{"version":1,"width":"wide"}').width,
    "wide",
  );
});
