"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useText } from "./Shell";
import { useSite } from "../runtime/context";
import {
  designThemes,
  designPreferenceKey,
  legacyThemePreferenceKey,
  resolveDesignPreference,
} from "../lib/design-themes.mjs";

function setDesignAttributes(design) {
  const root = document.documentElement;
  if (root.dataset.design !== design.id) root.dataset.design = design.id;
  if (root.dataset.theme !== design.mode) root.dataset.theme = design.mode;
}

function storedDesign(fallbackDesign) {
  const systemDark = matchMedia("(prefers-color-scheme: dark)").matches;
  try {
    return resolveDesignPreference(
      localStorage.getItem(designPreferenceKey),
      localStorage.getItem(legacyThemePreferenceKey),
      systemDark,
    );
  } catch {
    return resolveDesignPreference(
      fallbackDesign || document.documentElement.dataset.design,
      document.documentElement.dataset.theme,
      systemDark,
    );
  }
}

function applyThemeWithPosition(next, pendingFrame) {
  if (pendingFrame.current) cancelAnimationFrame(pendingFrame.current);
  const scrollTop = document.scrollingElement?.scrollTop || 0;
  const header = document
    .querySelector(".site-header")
    ?.getBoundingClientRect();
  // A full-height sidebar is not the top edge of the reading viewport.
  const readingLine =
    header && header.width >= window.innerWidth * 0.6 ? header.bottom + 20 : 20;
  let anchor = null;
  let anchorTop = 0;
  let closest = Infinity;
  if (scrollTop > 64) {
    for (const element of document.querySelectorAll(
      "#main-content :is(h1, h2, h3, p, pre, table, li)",
    )) {
      if (
        element.id !== "signal-sculpture-title" &&
        element.closest("nav, header, footer, dialog")
      )
        continue;
      const rect = element.getBoundingClientRect();
      if (
        rect.width < 16 ||
        rect.height <= 0 ||
        rect.height > window.innerHeight ||
        rect.bottom <= readingLine ||
        rect.top >= window.innerHeight
      )
        continue;
      const distance = Math.abs(rect.top - readingLine);
      if (distance < closest) {
        closest = distance;
        anchor = element;
        anchorTop = rect.top;
      }
    }
  }
  setDesignAttributes(next);
  pendingFrame.current = requestAnimationFrame(() => {
    pendingFrame.current = 0;
    const rect = anchor?.isConnected ? anchor.getBoundingClientRect() : null;
    const nextHeader = document
      .querySelector(".site-header")
      ?.getBoundingClientRect();
    const nextReadingLine =
      nextHeader && nextHeader.width >= window.innerWidth * 0.6
        ? nextHeader.bottom + 20
        : 20;
    const desiredTop = anchorTop + nextReadingLine - readingLine;
    const target =
      rect && rect.width > 0 && rect.height > 0
        ? (document.scrollingElement?.scrollTop || 0) + rect.top - desiredTop
        : scrollTop;
    window.scrollTo({ top: target, behavior: "instant" });
  });
}

export default function ThemeToggle() {
  const t = useText();
  const { route, locale } = useSite();
  const [selectedId, setSelectedId] = useState("clear");
  const [open, setOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const pendingThemeFrame = useRef(0);
  const selectedDesign = useRef(null);
  const unpersistedDesign = useRef(null);
  const trigger = useRef(null);
  const picker = useRef(null);
  const selected =
    designThemes.find((design) => design.id === selectedId) || designThemes[1];

  useLayoutEffect(() => {
    // Restore the full design before paint when a static root is replaced.
    // An unsaved choice remains active in this mounted session.
    const next = unpersistedDesign.current
      ? resolveDesignPreference(unpersistedDesign.current, null, false)
      : storedDesign(selectedDesign.current);
    setDesignAttributes(next);
    selectedDesign.current = next.id;
    setSelectedId(next.id);
    picker.current?.close();
  }, [route, locale]);

  useEffect(() => {
    const sync = () => {
      const root = document.documentElement;
      const design = resolveDesignPreference(
        root.dataset.design,
        root.dataset.theme,
        matchMedia("(prefers-color-scheme: dark)").matches,
      );
      selectedDesign.current = design.id;
      setSelectedId(design.id);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-design"],
    });
    const storage = (event) => {
      if (
        event.key !== designPreferenceKey &&
        event.key !== legacyThemePreferenceKey &&
        event.key !== null
      )
        return;
      // Read both latest values instead of interpreting adjacent events separately.
      unpersistedDesign.current = null;
      const next = storedDesign(selectedDesign.current);
      applyThemeWithPosition(next, pendingThemeFrame);
      selectedDesign.current = next.id;
      setSelectedId(next.id);
      setSaveError(false);
    };
    window.addEventListener("storage", storage);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", storage);
      if (pendingThemeFrame.current)
        cancelAnimationFrame(pendingThemeFrame.current);
    };
  }, []);

  function chooseDesign(design) {
    applyThemeWithPosition(design, pendingThemeFrame);
    selectedDesign.current = design.id;
    setSelectedId(design.id);
    let saved = false;
    try {
      localStorage.setItem(designPreferenceKey, design.id);
      saved = true;
    } catch {}
    try {
      localStorage.setItem(legacyThemePreferenceKey, design.mode);
    } catch {}
    unpersistedDesign.current = saved ? null : design.id;
    setSaveError(!saved);
    picker.current?.close();
  }
  const label = t(
    "选择主题与布局",
    "Choose theme and layout",
    "選擇主題與佈局",
  );
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="theme-toggle"
        aria-label={label}
        aria-haspopup="dialog"
        aria-controls="design-picker"
        aria-expanded={open}
        title={selected.code + " · " + t(...selected.label) + " · " + label}
        onClick={() => {
          picker.current?.showModal();
          setOpen(true);
        }}
      >
        <span className="theme-mode-id" aria-hidden="true">
          {selected.code}
        </span>
        <span className="theme-mode-name">{t(...selected.shortLabel)}</span>
        <svg
          width="13"
          height="13"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      <dialog
        ref={picker}
        id="design-picker"
        className="design-picker"
        aria-labelledby="design-picker-title"
        onCancel={(event) => {
          event.preventDefault();
          picker.current?.close();
        }}
        onClose={() => {
          setOpen(false);
          if (!document.querySelector("dialog[open]"))
            trigger.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) picker.current?.close();
        }}
      >
        <div className="design-picker-inner">
          <header className="design-picker-header">
            <div>
              <p>HOHOO / YOUR VIEW</p>
              <h2 id="design-picker-title">{label}</h2>
            </div>
            <button
              autoFocus
              type="button"
              className="design-picker-close"
              aria-label={t(
                "关闭主题选择",
                "Close theme picker",
                "關閉主題選擇",
              )}
              onClick={() => picker.current?.close()}
            >
              <span aria-hidden="true">×</span>
              <span>Esc</span>
            </button>
          </header>
          <p className="design-picker-intro">
            {t(
              "同一份内容，八种浏览方式。切换后保留阅读位置与筛选。",
              "One collection, eight ways to browse. Keep your reading position and filters.",
              "同一份內容，八種瀏覽方式。切換後保留閱讀位置與篩選。",
            )}
          </p>
          <div className="design-picker-options">
            {designThemes.map((design) => (
              <button
                type="button"
                key={design.id}
                className="design-picker-option"
                data-design={design.id}
                aria-pressed={selectedId === design.id}
                onClick={() => chooseDesign(design)}
              >
                <span
                  className="design-picker-preview"
                  data-preview={design.id}
                  aria-hidden="true"
                >
                  <span className="design-preview-header" />
                  <span className="design-preview-sidebar" />
                  <span className="design-preview-main">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="design-preview-dock" />
                </span>
                <span className="design-picker-copy">
                  <span className="design-picker-name">
                    <span>{design.code}</span>
                    {t(...design.label)}
                  </span>
                  <span className="design-picker-description">
                    {t(...design.description)}
                  </span>
                  <span className="design-picker-current">
                    {selectedId === design.id
                      ? t("当前主题", "Selected", "目前主題")
                      : t("使用此主题", "Use this theme", "使用此主題")}
                    {selectedId === design.id && (
                      <span aria-hidden="true"> ✓</span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="design-picker-note" role="status">
            {saveError
              ? t(
                  "本次选择已生效，浏览器暂未保存。",
                  "Your choice is active, but the browser could not save it.",
                  "本次選擇已生效，瀏覽器暫未儲存。",
                )
              : t(
                  "偏好保存在当前浏览器，随时可以切换。",
                  "Your preference stays in this browser. Switch any time.",
                  "偏好儲存在目前瀏覽器，隨時可以切換。",
                )}
          </p>
        </div>
      </dialog>
    </>
  );
}
