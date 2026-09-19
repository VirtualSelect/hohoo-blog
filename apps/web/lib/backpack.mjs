import { decodeReflection } from "./reflection.mjs";
export const practiceKey = "huhohoo.practice.v1:docs/ai-apps/java-first-llm";
export const practiceSteps = ["environment", "request", "parse", "history"];
const reflectionPrefix = "huhohoo.reflection.v1:";
const safeId = (s) =>
  typeof s === "string" &&
  s.length < 240 &&
  !["__proto__", "constructor", "prototype"].includes(s);
const ids = (a) => Array.isArray(a) && a.length <= 5000 && a.every(safeId);
export function allowedKey(key) {
  if (typeof key !== "string") return false;
  return (
    ["huhohoo.learning.v1", "huhohoo.reading.v2", practiceKey].includes(key) ||
    (key.startsWith(reflectionPrefix) &&
      /^(docs|blog)\/[a-z0-9/-]+$/.test(key.slice(reflectionPrefix.length)))
  );
}
export function validateRecord(key, raw) {
  if (!allowedKey(key) || typeof raw !== "string" || raw.length > 500000)
    throw Error("record");
  const v = JSON.parse(raw);
  if (!v || typeof v !== "object" || Array.isArray(v)) throw Error("schema");
  const fields = key.startsWith(reflectionPrefix)
    ? ["version", "takeaway", "question", "next"]
    : key === practiceKey
      ? ["version", "completed"]
      : key === "huhohoo.reading.v2"
        ? ["version", "saved", "read", "reading", "savedAt"]
        : ["version", "items", "saved", "lastOpened"];
  if (Object.keys(v).some((k) => !fields.includes(k))) throw Error("fields");
  if (key.startsWith(reflectionPrefix)) {
    decodeReflection(raw);
    return;
  }
  if (key === practiceKey) {
    if (
      v.version !== 1 ||
      !ids(v.completed) ||
      !v.completed.every((x) => practiceSteps.includes(x))
    )
      throw Error("practice");
    return;
  }
  if (key === "huhohoo.reading.v2") {
    if (
      v.version !== 2 ||
      !["saved", "read", "reading"].every(
        (k) =>
          ids(v[k]) &&
          v[k].every((id) =>
            /^(?:[a-f0-9]{20}|(?:paper|note):[\w.-]+)$/.test(id),
          ),
      ) ||
      !v.savedAt ||
      Array.isArray(v.savedAt) ||
      typeof v.savedAt !== "object" ||
      Object.entries(v.savedAt).some(
        ([k, d]) =>
          !safeId(k) ||
          !v.saved.includes(k) ||
          typeof d !== "string" ||
          !Number.isFinite(Date.parse(d)),
      )
    )
      throw Error("reading");
    return;
  }
  if (
    v.version !== 1 ||
    !ids(v.saved) ||
    !v.items ||
    typeof v.items !== "object" ||
    Array.isArray(v.items) ||
    Object.entries(v.items).some(
      ([k, item]) =>
        !safeId(k) ||
        Object.keys(item || {}).some(
          (field) => !["status", "updatedAt"].includes(field),
        ) ||
        !["reading", "completed"].includes(item?.status) ||
        (item.updatedAt !== undefined &&
          (typeof item.updatedAt !== "string" ||
            !Number.isFinite(Date.parse(item.updatedAt)))),
    )
  )
    throw Error("learning");
  if (
    v.lastOpened !== undefined &&
    (!safeId(v.lastOpened) || !Object.hasOwn(v.items, v.lastOpened))
  )
    throw Error("lastOpened");
}
export function collectBackpack(storage) {
  const records = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!allowedKey(key)) continue;
    const raw = storage.getItem(key);
    validateRecord(key, raw);
    records[key] = raw;
  }
  return parseBackpack(
    JSON.stringify({ version: 1, kind: "huhohoo-backpack", records }),
  );
}
export function parseBackpack(text) {
  if (
    typeof text !== "string" ||
    text.length > 2000000 ||
    new TextEncoder().encode(text).length > 2000000
  )
    throw Error("size");
  const v = JSON.parse(text);
  if (
    v?.version !== 1 ||
    v.kind !== "huhohoo-backpack" ||
    !v.records ||
    Array.isArray(v.records) ||
    typeof v.records !== "object" ||
    Object.keys(v.records).length > 1000
  )
    throw Error("version");
  for (const [key, raw] of Object.entries(v.records)) validateRecord(key, raw);
  return v;
}
export function planRestore(storage, backup, replace = false) {
  return Object.entries(backup.records).map(([key, value]) => {
    const before = storage.getItem(key);
    return {
      key,
      value,
      before,
      action:
        before === value
          ? "same"
          : before !== null && !replace
            ? "keep"
            : "write",
    };
  });
}
export function restoreBackpack(storage, plan) {
  // Recheck the preview snapshot to avoid overwriting changes from another tab.
  for (const row of plan)
    if (storage.getItem(row.key) !== row.before) throw Error("changed");
  const written = [];
  try {
    for (const row of plan) {
      if (row.action !== "write") continue;
      validateRecord(row.key, row.value);
      storage.setItem(row.key, row.value);
      written.push(row);
    }
  } catch (error) {
    let rollbackFailed = false;
    for (const row of written.reverse()) {
      try {
        row.before === null
          ? storage.removeItem(row.key)
          : storage.setItem(row.key, row.before);
      } catch {
        rollbackFailed = true;
      }
    }
    throw Error(rollbackFailed ? "rollback-failed" : "restore-failed");
  }
  return written.length;
}
