"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useText } from "./Shell";
import { useSite } from "../runtime/context";
import ThemeWindows from "./ThemeWindows";
import { runThemePassage } from "../lib/theme-passage.mjs";
import {
  roamingPreferenceKey,
  documentThemeVisitKey,
  visitThemePreferenceKey,
  readRoamingState,
  localDayKey,
  chooseRoamingTheme,
  recordDesignVisit,
} from "../lib/theme-roaming.mjs";
import {
  designThemes,
  designPreferenceKey,
  legacyThemePreferenceKey,
  resolveDesignPreference,
} from "../lib/design-themes.mjs";

// Share the before-paint choice with remounted route headers. A new Document
// starts a new visit; client navigation and other tabs cannot advance this one.
function rememberDocumentChoice(designId, state, unsaved = false) {
  document[documentThemeVisitKey] = { designId, state, unsaved };
  try {
    sessionStorage.setItem(visitThemePreferenceKey, designId);
  } catch {}
}

function setDesignAttributes(design) {
  const root = document.documentElement;
  if (root.dataset.design !== design.id) root.dataset.design = design.id;
  if (root.dataset.theme !== design.mode) root.dataset.theme = design.mode;
}

function storedRoaming() {
  try {
    return readRoamingState(localStorage.getItem(roamingPreferenceKey));
  } catch {
    return readRoamingState(null);
  }
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

function consistentRoaming(state, currentId) {
  if (!state.daily || state.dailyId === currentId) return state;
  const repaired = recordDesignVisit(state, currentId, state.dailyId, {
    mode: "fixed",
  });
  try {
    localStorage.setItem(roamingPreferenceKey, JSON.stringify(repaired));
  } catch {}
  return repaired;
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
  const [arrival, setArrival] = useState(null);
  const arrivalTimer = useRef(0);
  const [roaming, setRoaming] = useState(() => readRoamingState(null));
  const roamingState = useRef(roaming);
  const storageTimer = useRef(0);
  const cancelPassage = useRef(null);
  const pendingThemeFrame = useRef(0);
  const selectedDesign = useRef(null);
  const trigger = useRef(null);
  const picker = useRef(null);
  const selected =
    designThemes.find((design) => design.id === selectedId) || designThemes[1];
  const previous = designThemes.find(
    (design) => design.id === roaming.previousId,
  );

  useLayoutEffect(() => {
    cancelPassage.current?.();
    clearTimeout(arrivalTimer.current);
    setArrival(null);
    const session = document[documentThemeVisitKey];
    setSaveError(Boolean(session?.unsaved));
    // Restore the full design before paint when a static root is replaced.
    const sessionChoice = session?.designId;
    const next = sessionChoice
      ? resolveDesignPreference(sessionChoice, null, false)
      : storedDesign(selectedDesign.current);
    const savedRoaming = consistentRoaming(
      session?.state || storedRoaming(),
      next.id,
    );
    roamingState.current = savedRoaming;
    setRoaming(savedRoaming);
    rememberDocumentChoice(next.id, savedRoaming, Boolean(session?.unsaved));
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
        event.key !== roamingPreferenceKey &&
        event.key !== null
      )
        return;
      // A preference spans two keys. Coalesce adjacent cross-process storage
      // events before interpreting a partly written daily record.
      clearTimeout(storageTimer.current);
      storageTimer.current = window.setTimeout(() => {
        // Only explicit choices sync to another reader. A new tab's automatic
        // arrival keeps the existing document and its next navigation stable.
        // Inspect the source before repairing a partially written preference.
        const savedRoaming = storedRoaming();
        if (savedRoaming.source === "automatic") return;
        const next = storedDesign(selectedDesign.current);
        const nextRoaming = consistentRoaming(savedRoaming, next.id);
        rememberDocumentChoice(next.id, nextRoaming);
        roamingState.current = nextRoaming;
        setRoaming(nextRoaming);
        cancelPassage.current?.();
        clearTimeout(arrivalTimer.current);
        setArrival(null);
        applyThemeWithPosition(next, pendingThemeFrame);
        selectedDesign.current = next.id;
        setSelectedId(next.id);
        setSaveError(false);
      }, 60);
    };
    window.addEventListener("storage", storage);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", storage);
      clearTimeout(storageTimer.current);
      cancelPassage.current?.();
      clearTimeout(arrivalTimer.current);
      if (pendingThemeFrame.current)
        cancelAnimationFrame(pendingThemeFrame.current);
    };
  }, []);

  function saveChoice(design, nextRoaming) {
    clearTimeout(storageTimer.current);
    selectedDesign.current = design.id;
    setSelectedId(design.id);
    roamingState.current = nextRoaming;
    setRoaming(nextRoaming);
    let saved = false;
    try {
      localStorage.setItem(designPreferenceKey, design.id);
      saved = true;
    } catch {}
    try {
      localStorage.setItem(legacyThemePreferenceKey, design.mode);
    } catch {}
    let roamingSaved = false;
    try {
      localStorage.setItem(roamingPreferenceKey, JSON.stringify(nextRoaming));
      roamingSaved = true;
    } catch {}
    rememberDocumentChoice(design.id, nextRoaming, !saved || !roamingSaved);
    setSaveError(!saved || !roamingSaved);
  }

  function chooseDesign(design) {
    const currentId = selectedDesign.current || selectedId;
    const nextRoaming = recordDesignVisit(
      roamingState.current,
      design.id,
      currentId,
    );
    picker.current?.close();
    cancelPassage.current?.();
    const apply = () => applyThemeWithPosition(design, pendingThemeFrame);
    if (design.id === currentId) apply();
    else cancelPassage.current = runThemePassage(design.id, apply);
    saveChoice(design, nextRoaming);
    clearTimeout(arrivalTimer.current);
    setArrival(null);
    if (currentId !== design.id) {
      setArrival({ design, previousId: currentId });
      arrivalTimer.current = window.setTimeout(() => setArrival(null), 8000);
    }
  }

  function changeArrivalMode(mode) {
    saveChoice(
      selected,
      recordDesignVisit(roamingState.current, selected.id, selected.id, {
        mode,
        day: mode === "daily" ? localDayKey() : null,
      }),
    );
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
              <p>HOHOO / EIGHT WINDOWS</p>
              <h2 id="design-picker-title">
                {t(
                  "换一扇窗，继续探索。",
                  "A new window. The same curiosity.",
                  "換一扇窗，繼續探索。",
                )}
              </h2>
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
              "八种风景，同一份内容。挑选一扇窗口，或让下一站带来一点意外。",
              "Eight views, one collection. Pick a window, or let your next stop surprise you.",
              "八種風景，同一份內容。挑選一扇視窗，或讓下一站帶來一點意外。",
            )}
          </p>
          {open && (
            <ThemeWindows
              selectedId={selectedId}
              onChoose={chooseDesign}
              t={t}
            />
          )}
          <div className="theme-roaming-actions">
            <button
              className="theme-roaming-random"
              type="button"
              onClick={() => {
                const id = chooseRoamingTheme(
                  selectedId,
                  roamingState.current.visited,
                );
                chooseDesign(designThemes.find((design) => design.id === id));
              }}
            >
              <span aria-hidden="true">⤨</span>
              {t("带我去别处", "Take me somewhere new", "帶我去別處")}
              <span aria-hidden="true">↗</span>
            </button>
            <button
              className="theme-roaming-back"
              type="button"
              disabled={!previous || previous.id === selectedId}
              onClick={() => previous && chooseDesign(previous)}
            >
              {previous
                ? t("返回", "Back to", "返回") + " " + t(...previous.shortLabel)
                : t("返回上一主题", "Back to previous theme", "返回上一主題")}
              <span aria-hidden="true">↶</span>
            </button>
          </div>
          <div className="theme-roaming-settings">
            <fieldset className="theme-roaming-frequency">
              <legend>
                {t("到访时的风景", "Your arrival view", "到訪時的風景")}
              </legend>
              <div className="theme-roaming-modes">
                {[
                  ["visit", ["每次访问", "Every visit", "每次訪問"]],
                  ["daily", ["每日风景", "Daily view", "每日風景"]],
                  ["fixed", ["固定主题", "Keep theme", "固定主題"]],
                ].map(([mode, copy]) => (
                  <label key={mode} className="theme-roaming-mode">
                    <input
                      type="radio"
                      name="theme-arrival-mode"
                      value={mode}
                      checked={roaming.mode === mode}
                      onChange={() => changeArrivalMode(mode)}
                      aria-describedby="theme-arrival-hint"
                    />
                    <span>{t(...copy)}</span>
                  </label>
                ))}
              </div>
              <p id="theme-arrival-hint" className="theme-roaming-hint">
                {roaming.mode === "visit"
                  ? t(
                      "重新打开或刷新时换一扇窗，站内翻页保持当前风景。",
                      "A new view when you reopen or refresh. Keep it while browsing the site.",
                      "重新開啟或重新整理時換一扇窗，站內翻頁保持目前風景。",
                    )
                  : roaming.mode === "daily"
                    ? t(
                        "今天留在这里，明天首次到访再换新风景。",
                        "Stay here today. Discover a new view on tomorrow’s first visit.",
                        "今天留在這裡，明天首次到訪再換新風景。",
                      )
                    : t(
                        "下次到访也保留当前主题，随时可以手动更换。",
                        "Keep this theme on future visits. You can still change it anytime.",
                        "下次到訪也保留目前主題，隨時可以手動更換。",
                      )}
              </p>
            </fieldset>
            {roaming.mode !== "fixed" && (
              <button
                type="button"
                className="theme-roaming-pin"
                onClick={() => changeArrivalMode("fixed")}
              >
                {t("留在这里", "Stay here", "留在這裡")}
                <span aria-hidden="true">⌁</span>
              </button>
            )}
          </div>
          <p className="design-picker-note" role="status">
            {saveError
              ? t(
                  "选择已生效，部分偏好暂未保存。",
                  "Your choice is active, but some preferences could not be saved.",
                  "選擇已生效，部分偏好暫未儲存。",
                )
              : t(
                  "切换保留阅读位置与筛选。偏好只保存在当前浏览器。",
                  "Keep your reading position and filters. Preferences stay in this browser.",
                  "切換保留閱讀位置與篩選。偏好只儲存在目前瀏覽器。",
                )}
          </p>
        </div>
      </dialog>
      {arrival && !open && (
        <div className="theme-roaming-arrival">
          <span role="status">
            {t("已到达", "Now in", "已到達")} {arrival.design.code} ·{" "}
            {t(...arrival.design.shortLabel)}
          </span>
          <button
            type="button"
            onClick={() =>
              chooseDesign(
                designThemes.find((design) => design.id === arrival.previousId),
              )
            }
          >
            {t("返回上一主题", "Return to previous theme", "返回上一主題")} ↶
          </button>
          <button
            type="button"
            aria-label={t(
              "关闭切换提示",
              "Dismiss theme notice",
              "關閉切換提示",
            )}
            onClick={() => {
              clearTimeout(arrivalTimer.current);
              setArrival(null);
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
