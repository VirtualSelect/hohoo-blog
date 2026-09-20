export const readerSettingsKey = "huhohoo.reader.v1";
export function parseReaderSettings(raw) {
  try {
    const value = JSON.parse(raw);
    if (value?.version === 1 && ["standard", "wide"].includes(value.width))
      return value;
  } catch {}
  return { version: 1, width: "standard" };
}
