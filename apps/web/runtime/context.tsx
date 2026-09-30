"use client";
import { createContext, use } from "react";
import type { SiteContextValue } from "../lib/site-types";
export const SiteContext = createContext<SiteContextValue | null>(null);
export function useSite() {
  const site = use(SiteContext);
  if (!site) throw new Error("SiteContext must be provided by Shell");
  return site;
}
export default function useSiteConfig() {
  const { locale } = useSite();
  return {
    i18n: {
      currentLocale: locale,
      defaultLocale: "zh-CN",
      locales: ["zh-CN", "zh-TW", "en"],
    },
    siteConfig: {
      url: "https://huhohoo.com",
      title: "Hohoo's AI Lab",
      baseUrl: "/",
    },
  };
}
