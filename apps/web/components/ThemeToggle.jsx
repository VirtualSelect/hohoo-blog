"use client";
import { useEffect, useLayoutEffect, useState } from "react";
import { useText } from "./Shell";
import { useSite } from "../runtime/context";

export default function ThemeToggle() {
  const t = useText();
  const [theme, setTheme] = useState("light");
  const { route, locale } = useSite();
  useLayoutEffect(() => {
    // A static root segment can replace html attributes during navigation.
    // Restore the preference before paint, including when the new page hydrates.
    let saved;
    try {
      saved = localStorage.getItem("huhohoo.theme.v1");
    } catch {}
    const next =
      saved === "dark" || saved === "light"
        ? saved
        : document.documentElement.dataset.theme ||
          (matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light");
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }, [route, locale]);
  useEffect(() => {
    const sync = () =>
      setTheme(
        document.documentElement.dataset.theme === "dark" ? "dark" : "light",
      );
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const storage = (event) => {
      if (event.key !== "huhohoo.theme.v1" && event.key !== null) return;
      const saved = event.newValue;
      document.documentElement.dataset.theme =
        saved === "dark" || saved === "light"
          ? saved
          : matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
    };
    window.addEventListener("storage", storage);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", storage);
    };
  }, []);
  const dark = theme === "dark";
  const action = dark
    ? t("切换到护眼模式", "Switch to light mode", "切換到護眼模式")
    : t("切换到夜间模式", "Switch to dark mode", "切換到夜間模式");
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={action}
      title={action}
      onClick={() => {
        // Read the actual theme: it may have changed in another tab or before hydration.
        const next =
          document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        setTheme(next);
        try {
          localStorage.setItem("huhohoo.theme.v1", next);
        } catch {}
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        {dark ? (
          <path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
          </>
        )}
      </svg>
      <span>
        {dark ? t("夜间", "Dark", "夜間") : t("护眼", "Light", "護眼")}
      </span>
    </button>
  );
}
