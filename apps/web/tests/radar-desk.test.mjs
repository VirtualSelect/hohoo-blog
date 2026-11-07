import test from "node:test";
import assert from "node:assert/strict";
import {
  readRadarDesk,
  deskSignals,
  radarDeskUrl,
  signalFromHash,
} from "../lib/radar-desk.mjs";

const items = [
  {
    id: "a",
    title: "Robot memory",
    summary: "Control",
    domain: "embodied-ai",
    sourceId: "paper",
  },
  {
    id: "b",
    title: "Agent memory",
    summary: "Tools",
    domain: "agents",
    sourceId: "official",
  },
  {
    id: "c",
    title: "Robot memory",
    summary: "Control",
    domain: "embodied-ai",
    sourceId: "paper",
  },
];
const defaults = {
  query: "",
  domain: "all",
  source: "all",
  inbox: "all",
  order: "latest",
};
test("reading state composes with topic/source/search without mutating the archive", () => {
  const reading = { read: ["a"], saved: ["a", "c"] };
  const filters = {
    ...defaults,
    query: "robot control",
    domain: "embodied-ai",
    source: "paper",
    inbox: "unread",
    order: "oldest",
  };
  assert.deepEqual(
    deskSignals(items, filters, reading).map((i) => i.id),
    ["c"],
  );
  assert.deepEqual(
    deskSignals(
      items,
      { ...defaults, inbox: "saved", order: "oldest" },
      reading,
    ).map((i) => i.id),
    ["c", "a"],
  );
  assert.deepEqual(
    items.map((i) => i.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    deskSignals(
      items,
      { ...defaults, inbox: "saved" },
      { read: [], saved: [] },
    ),
    [],
  );
});
test("desk URL roundtrip retains locale and other parameters while clearing obsolete signal", () => {
  const filters = {
    ...defaults,
    query: "具身 memory",
    domain: "embodied-ai",
    inbox: "saved",
    order: "oldest",
  };
  const path = radarDeskUrl(
    "https://huhohoo.com/zh-TW/radar?ref=reading#signal-01234567890123456789",
    filters,
  );
  const url = new URL(path, "https://huhohoo.com");
  assert.equal(url.pathname, "/zh-TW/radar");
  assert.equal(url.searchParams.get("ref"), "reading");
  assert.equal(url.hash, "");
  assert.deepEqual(
    readRadarDesk(url.search, ["embodied-ai"], ["paper"]),
    filters,
  );
  assert.equal(
    radarDeskUrl(
      "https://huhohoo.com/radar?inbox=saved&order=oldest",
      defaults,
    ),
    "/radar",
  );
});
test("unsupported desk state and malformed deep links cannot select a signal", () => {
  assert.deepEqual(
    readRadarDesk("?inbox=unknown&order=random&domain=wrong", [], []),
    defaults,
  );
  assert.equal(
    signalFromHash("#signal-0123456789abcdefabcd"),
    "0123456789abcdefabcd",
  );
  for (const hash of [
    "#signal-unknown",
    "#signal-0123456789abcdefabcd/next",
    "#other",
    "#signal-",
  ])
    assert.equal(signalFromHash(hash), null);
});
