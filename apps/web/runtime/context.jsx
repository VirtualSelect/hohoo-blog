"use client";
import { createContext, use } from "react";
export const SiteContext = createContext(null);
export function useSite() {
  return use(SiteContext);
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
