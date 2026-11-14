"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useText } from "./Shell";
import {
  defaults,
  designs,
  artworkNames,
  aboutActions,
  secretNames,
  secretMessages,
  type ArtworkDesign,
} from "./theme-artwork-config";
import type { ArtworkScene } from "./theme-artwork-scene";
import styles from "./ThemeArtwork.module.css";
import ArtworkFallback from "./ArtworkFallback";

export default function ThemeArtwork({
  context,
  className = "",
}: {
  context: "home" | "about";
  className?: string;
}) {
  const t = useText();
  const root = useRef<HTMLDivElement>(null),
    stage = useRef<HTMLDivElement>(null),
    surface = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    scene = useRef<ArtworkScene | null>(null);
  const [design, setDesign] = useState<ArtworkDesign>("space"),
    [dark, setDark] = useState(true),
    [near, setNear] = useState(false),
    [enabled, setEnabled] = useState(true),
    [paused, setPaused] = useState(false),
    [expanded, setExpanded] = useState(false),
    [secret, setSecret] = useState(false),
    [reduced, setReduced] = useState(false),
    [status, setStatus] = useState<"idle" | "ready" | "fallback">("idle"),
    [fullscreen, setFullscreen] = useState(false),
    [freeDrag, setFreeDrag] = useState(false),
    [notice, setNotice] = useState("");
  const hintId = useId();
  const artworkLabel = secret
    ? t(...secretNames[design])
    : t(
        "可全向旋转的三维艺术装置，非实验数据。",
        "Three-dimensional artwork that rotates in every direction, not experimental data.",
        "可全向旋轉的三維藝術裝置，非實驗數據。",
      );
  const label = useRef(artworkLabel);
  label.current = artworkLabel;
  const kind = defaults[design];
  const current = useRef({ paused, expanded, secret });
  current.current = { paused, expanded, secret };
  useEffect(() => {
    const update = () => {
      const value = document.documentElement.dataset.design;
      setDesign(
        designs.includes(value as ArtworkDesign)
          ? (value as ArtworkDesign)
          : "space",
      );
      setDark(document.documentElement.dataset.theme === "dark");
      setExpanded(false);
      setSecret(false);
      setFreeDrag(false);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-design", "data-theme"],
    });
    const query = matchMedia("(prefers-reduced-motion:reduce)");
    const motion = () => setReduced(query.matches);
    motion();
    query.addEventListener("change", motion);
    return () => {
      observer.disconnect();
      query.removeEventListener("change", motion);
    };
  }, []);
  useEffect(() => {
    if (!enabled || !stage.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [enabled]);
  useEffect(() => {
    if (!near || !enabled) return;
    let cancelled = false;
    let owned: ArtworkScene | null = null;
    let element: HTMLCanvasElement | null = null;
    setStatus("idle");
    setNotice("");
    import("./theme-artwork-scene")
      .then(({ createArtworkScene }) => {
        if (cancelled || !surface.current || !stage.current) return;
        // Page restoration may preserve DOM after effects have released WebGL.
        // Each effect owns a fresh canvas; never reuse a context-lost surface.
        element = document.createElement("canvas");
        element.className = styles.canvas;
        element.tabIndex = 0;
        element.setAttribute("role", "img");
        element.setAttribute("aria-label", label.current);
        element.setAttribute("aria-describedby", hintId);
        element.setAttribute(
          "aria-keyshortcuts",
          "ArrowLeft ArrowRight ArrowUp ArrowDown Home",
        );
        surface.current.appendChild(element);
        canvas.current = element;
        owned = createArtworkScene(element, stage.current, {
          design,
          kind,
          context,
          dark,
          onReady() {
            if (!cancelled) setStatus("ready");
          },
          onFailure() {
            if (!cancelled) {
              owned?.dispose();
              if (scene.current === owned) scene.current = null;
              setStatus("fallback");
            }
          },
        });
        scene.current = owned;
        owned.pause(current.current.paused);
        owned.transform(current.current.expanded);
        owned.secret(current.current.secret);
      })
      .catch(() => {
        if (!cancelled) {
          owned?.dispose();
          if (scene.current === owned) scene.current = null;
          setStatus("fallback");
        }
      });
    return () => {
      cancelled = true;
      owned?.dispose();
      if (scene.current === owned) scene.current = null;
      element?.remove();
      if (canvas.current === element) canvas.current = null;
    };
  }, [near, enabled, design, dark, kind, context, hintId]);
  useEffect(() => {
    canvas.current?.setAttribute("aria-label", artworkLabel);
  }, [artworkLabel]);
  useEffect(() => {
    const changed = () =>
      setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  function toggleSecret(value: boolean) {
    setSecret(value);
    scene.current?.secret(value);
  }
  useEffect(() => {
    if (context !== "about") return;
    let sequence = "",
      last = 0;
    const key = (event: KeyboardEvent) => {
      // Modal controls own their keyboard input, including native Escape cancel.
      if (event.defaultPrevented || document.querySelector("dialog[open]")) {
        sequence = "";
        return;
      }
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          /INPUT|TEXTAREA|SELECT/.test(event.target.tagName))
      )
        return;
      if (event.key === "Escape") {
        setSecret(false);
        scene.current?.secret(false);
        return;
      }
      if (
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.key.length !== 1
      )
        return;
      const now = Date.now();
      sequence = (now - last > 2000 ? "" : sequence) + event.key.toLowerCase();
      last = now;
      sequence = sequence.slice(-5);
      if (sequence === "hohoo") {
        setSecret(true);
        scene.current?.secret(true);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [context]);
  function handleOrbitKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (
      event.target !== canvas.current ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const step = Math.PI / 12;
    const move: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (move[event.key]) {
      event.preventDefault();
      scene.current?.orbit(...move[event.key]);
    } else if (event.key === "Home") {
      event.preventDefault();
      scene.current?.resetView();
    }
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === root.current)
        await document.exitFullscreen();
      else if (root.current?.requestFullscreen)
        await root.current.requestFullscreen();
      else
        setNotice(
          t(
            "当前浏览器不支持全屏。",
            "Fullscreen is unavailable in this browser.",
            "目前瀏覽器不支援全螢幕。",
          ),
        );
    } catch {
      setNotice(
        t(
          "无法打开全屏，仍可在页面中操作。",
          "Fullscreen could not open. The artwork is still interactive here.",
          "無法開啟全螢幕，仍可在頁面中操作。",
        ),
      );
    }
  }
  return (
    <div
      ref={root}
      className={`theme-artwork ${styles.root} ${className}`}
      data-context={context}
      data-artwork={context === "about" ? design : kind}
      data-status={status}
      data-enabled={enabled}
      data-free-drag={freeDrag || fullscreen}
    >
      <div className={styles.stage} ref={stage}>
        <ArtworkFallback
          design={design}
          context={context}
          className={styles.fallback}
          hidden={status === "ready" && enabled}
        />
        <div
          ref={surface}
          className={styles.surface}
          onKeyDown={handleOrbitKey}
        />
      </div>
      <div className={styles.footer}>
        <div className={styles.interaction}>
          <p id={hintId}>
            <span className={styles.mouseHint}>
              {t(
                "拖动全向查看 · 方向键微调 · Home 复位",
                "Drag to explore · Arrow keys to rotate · Home to reset",
                "拖動全向查看 · 方向鍵微調 · Home 復位",
              )}
            </span>
            <span className={styles.touchHint}>
              {freeDrag || fullscreen
                ? t(
                    "在模型上滑动，全向查看",
                    "Drag the model in any direction",
                    "在模型上滑動，全向查看",
                  )
                : t(
                    "开启拖拽，或全屏查看",
                    "Enable dragging or enter full screen",
                    "開啟拖拽，或全螢幕查看",
                  )}
            </span>
          </p>
          {!fullscreen && (
            <button
              type="button"
              className={styles.touchToggle}
              disabled={!enabled || status !== "ready"}
              aria-pressed={freeDrag}
              onClick={() => setFreeDrag(!freeDrag)}
            >
              {freeDrag
                ? t("退出拖拽", "Stop dragging", "退出拖拽")
                : t("拖拽查看", "Enable dragging", "拖拽查看")}
            </button>
          )}
        </div>
        {secret && (
          <p className={styles.secret} role="status">
            {t(...secretMessages[design])}
          </p>
        )}
        {context === "home" && (
          <p className={styles.fixedCaption}>{t(...artworkNames[kind])}</p>
        )}
        <div
          className={styles.controls}
          role="group"
          aria-label={t("三维装置操作", "Artwork controls", "三維裝置操作")}
        >
          <button
            className={styles.primary}
            disabled={!enabled || status !== "ready" || secret}
            aria-pressed={expanded}
            onClick={() => {
              setExpanded(!expanded);
              scene.current?.transform(!expanded);
            }}
          >
            {expanded
              ? t("恢复形态", "Restore form", "恢復形態")
              : context === "about"
                ? t(...aboutActions[design])
                : t("展开装置", "Unfold artwork", "展開裝置")}{" "}
            <span aria-hidden="true">↗</span>
          </button>
          <button
            disabled={!enabled || status !== "ready" || reduced}
            aria-pressed={paused || reduced}
            onClick={() => {
              setPaused(!paused);
              scene.current?.pause(!paused);
            }}
          >
            {reduced
              ? t("静态", "Static", "靜態")
              : paused
                ? t("继续", "Resume", "繼續")
                : t("暂停", "Pause", "暫停")}
          </button>
          <button
            disabled={!enabled || status !== "ready"}
            onClick={() => scene.current?.resetView()}
          >
            {t("复位视角", "Reset view", "復位視角")}
          </button>
          <button onClick={toggleFullscreen}>
            {fullscreen
              ? t("退出全屏", "Exit full screen", "退出全螢幕")
              : t("全屏", "Full screen", "全螢幕")}{" "}
            <span aria-hidden="true">↗</span>
          </button>
          {context === "about" && (
            <button
              disabled={!enabled || status !== "ready"}
              aria-pressed={secret}
              onClick={() => toggleSecret(!secret)}
            >
              {secret
                ? t("返回主题场景", "Back to the scene", "返回主題場景")
                : t("探索彩蛋", "Discover a secret", "探索彩蛋")}
            </button>
          )}
          <button
            onClick={() => {
              setEnabled(!enabled);
              setStatus("idle");
              setFreeDrag(false);
            }}
          >
            {enabled
              ? t("关闭 3D", "Close 3D", "關閉 3D")
              : t("开启 3D", "Open 3D", "開啟 3D")}
          </button>
        </div>
        {(status === "fallback" || notice) && (
          <p className={styles.notice} role="status">
            {notice ||
              t(
                "当前显示静态示意；关闭后重新开启可重试。",
                "Showing a static illustration. Close and reopen to retry.",
                "目前顯示靜態示意；關閉後重新開啟可重試。",
              )}
          </p>
        )}
      </div>
    </div>
  );
}
