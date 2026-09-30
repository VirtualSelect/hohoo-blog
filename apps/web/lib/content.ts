import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import {
  isLocale,
  type Locale,
  type SiteContent,
  type Messages,
} from "./site-types";
import type { SiteDocument, ClientDocument } from "./site-types";
export { locales } from "./site-types";
export function toClientDocument({
  html: _html,
  ...document
}: SiteDocument): ClientDocument {
  return document;
}
export const getContent = cache(function getContent(
  locale: Locale,
): SiteContent {
  // This file is generated locally by prepare:content after metadata validation.
  // Never use this boundary for untrusted network responses or localStorage.
  return JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "generated", locale + ".json"),
      "utf8",
    ),
  );
});
export const getMessages = cache(function getMessages(
  locale: Locale,
): Messages {
  const p = path.resolve(process.cwd(), "../../i18n", locale, "code.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
});
export function resolveSegments(segments: string[] = []): {
  locale: Locale;
  route: string;
} {
  const locale =
    isLocale(segments[0]) && segments[0] !== "zh-CN" ? segments[0] : "zh-CN";
  return {
    locale,
    route: (locale === "zh-CN" ? segments : segments.slice(1)).join("/"),
  };
}
