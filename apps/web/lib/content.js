import fs from "node:fs";
import path from "node:path";
export const locales = ["zh-CN", "zh-TW", "en"];
export function getContent(locale) {
  return JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "generated", locale + ".json"),
      "utf8",
    ),
  );
}
export function getMessages(locale) {
  const p = path.resolve(process.cwd(), "../../i18n", locale, "code.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
}
export function resolveSegments(segments = []) {
  const locale = ["en", "zh-TW"].includes(segments[0]) ? segments[0] : "zh-CN";
  return {
    locale,
    route: (locale === "zh-CN" ? segments : segments.slice(1)).join("/"),
  };
}
