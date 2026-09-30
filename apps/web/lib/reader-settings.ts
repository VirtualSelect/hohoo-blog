export const readerSettingsKey = "huhohoo.reader.v1";
export type ReaderWidth = "standard" | "wide";
export interface ReaderSettings {
  version: 1;
  width: ReaderWidth;
}
export function parseReaderSettings(raw: string | null): ReaderSettings {
  try {
    const value: unknown = JSON.parse(raw || "null");
    if (
      value &&
      typeof value === "object" &&
      "version" in value &&
      value.version === 1 &&
      "width" in value &&
      (value.width === "standard" || value.width === "wide")
    )
      return { version: 1, width: value.width };
  } catch {}
  return { version: 1, width: "standard" };
}
