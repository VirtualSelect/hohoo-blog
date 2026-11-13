import { createHash } from "node:crypto";
import { signals } from "../../../src/utils/radar.cjs";

// Data identity, not a deployment version or a claim that a scan just ran.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}

export function radarSnapshot(records, config) {
  if (!Array.isArray(records)) throw Error("Radar records must be an array");
  if (!Number.isInteger(config.dailyLimit) || config.dailyLimit < 1)
    throw Error("Invalid Radar daily limit");
  const ids = new Set();
  for (const item of records) {
    if (typeof item.id !== "string" || !item.id || ids.has(item.id))
      throw Error("Missing or duplicate Radar id");
    ids.add(item.id);
    for (const key of ["publishedAt", "collectedAt"])
      if (
        typeof item[key] !== "string" ||
        !Number.isFinite(Date.parse(item[key]))
      )
        throw Error("Invalid Radar " + key);
  }
  const grouped = signals(records, config);
  const latest = (items, key) =>
    items.length
      ? new Date(
          Math.max(...items.map((item) => Date.parse(item[key]))),
        ).toISOString()
      : null;
  return {
    schemaVersion: 1,
    dataHash: createHash("sha256")
      .update(
        JSON.stringify(
          canonical([...records].sort((a, b) => a.id.localeCompare(b.id))),
        ),
      )
      .digest("hex"),
    recordCount: records.length,
    signalCount: grouped.length,
    latestFeedPublishedAt: latest(grouped, "publishedAt"),
    latestCollectedAt: latest(records, "collectedAt"),
    dailyLimit: config.dailyLimit,
    enabledSources: config.sources
      .filter((source) => source.enabled)
      .map((source) => source.id)
      .sort(),
  };
}

// A remote file is untrusted, including a successful HTTP response.
export function isRadarSnapshot(value) {
  return Boolean(
    value?.schemaVersion === 1 &&
      /^[a-f0-9]{64}$/.test(value.dataHash) &&
      [value.recordCount, value.signalCount].every(
        (n) => Number.isInteger(n) && n >= 0,
      ) &&
      Number.isInteger(value.dailyLimit) &&
      value.dailyLimit > 0 &&
      Array.isArray(value.enabledSources) &&
      value.enabledSources.every((id) => typeof id === "string") &&
      [value.latestFeedPublishedAt, value.latestCollectedAt].every((date) =>
        value.recordCount === 0
          ? date === null
          : typeof date === "string" && Number.isFinite(Date.parse(date)),
      ),
  );
}
