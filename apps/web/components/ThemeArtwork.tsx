"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, Ref } from "react";
import { useText } from "./Shell";
import { defaults, designs, type ArtworkDesign } from "./theme-artwork-config";
import type { ArtworkScene } from "./theme-artwork-scene";
import styles from "./ThemeArtwork.module.css";
import { secretNotes } from "./encore-catalog";
import { objectNotes } from "./theme-artwork-catalog";
import "./theme-exhibition.css";

export default function ThemeArtwork({
  context,
  className = "",
  secret = false,
  onSecretChange,
  secretTriggerRef,
}: {
  context: "home" | "about";
  className?: string;
  secret?: boolean;
  onSecretChange?: (active: boolean) => void;
  secretTriggerRef?: Ref<HTMLButtonElement>;
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
    [travel, setTravel] = useState(0),
    [posterPhase, setPosterPhase] = useState(100),
    [posterRun, setPosterRun] = useState(0),
    [reduced, setReduced] = useState(false),
    [status, setStatus] = useState<"idle" | "ready" | "fallback">("idle"),
    [fullscreen, setFullscreen] = useState(false),
    [freeDrag, setFreeDrag] = useState(false),
    [notice, setNotice] = useState("");
  const hintId = useId();
  const progress = useRef<HTMLInputElement>(null);
  const progressLabel = useRef<HTMLSpanElement>(null);
  const note = secretNotes[design];
  const live = enabled && status === "ready";
  const posterPose =
    posterPhase < 25 ? "closed" : posterPhase < 75 ? "half" : "open";

  const details = objectNotes[design][context];
  const expanded = travel > 0;
  const artworkLabel = secret
    ? t(...note.title)
    : t(
        "可全向旋转的三维艺术装置，非实验数据。",
        "Three-dimensional artwork that rotates in every direction, not experimental data.",
        "可全向旋轉的三維藝術裝置，非實驗數據。",
      );
  const label = useRef(artworkLabel);
  label.current = artworkLabel;
  const kind = defaults[design];
  const current = useRef({ paused, travel, secret });
  current.current = { paused, travel, secret };
  useEffect(() => {
    const update = () => {
      const value = document.documentElement.dataset.design;
      setDesign(
        designs.includes(value as ArtworkDesign)
          ? (value as ArtworkDesign)
          : "space",
      );
      setDark(document.documentElement.dataset.theme === "dark");
      setTravel(0);
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
        owned.setAmount(current.current.travel / 100);
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
  }, [near, enabled, design, dark, context, hintId]);
  useEffect(() => {
    canvas.current?.setAttribute("aria-label", artworkLabel);
  }, [artworkLabel]);
  useEffect(() => {
    const changed = () =>
      setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useEffect(() => {
    scene.current?.secret(secret);
  }, [secret]);

  useEffect(() => {
    if (!secret || !live || !stage.current) return;
    const host = stage.current;
    const sync = () => {
      const percent = Math.round(
        Number(host.dataset.secretProgress || 0) * 100,
      );
      if (progress.current) progress.current.value = String(percent);
      if (progressLabel.current)
        progressLabel.current.textContent = percent + "%";
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(host, {
      attributes: true,
      attributeFilter: ["data-secret-progress"],
    });
    return () => observer.disconnect();
  }, [secret, live, design, dark]);

  useEffect(() => {
    if (!secret || live) return;
    if (reduced || paused) {
      setPosterPhase(100);
      return;
    }
    setPosterPhase(0);
    const halfway = window.setTimeout(() => setPosterPhase(50), 900);
    const finish = window.setTimeout(() => setPosterPhase(100), 2100);
    return () => {
      clearTimeout(halfway);
      clearTimeout(finish);
    };
  }, [secret, live, posterRun, design, reduced, paused]);
  function scrubReveal(input: HTMLInputElement) {
    scene.current?.seekSecret(input.valueAsNumber / 100);
  }
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
      data-studio-theme={design}
      ref={root}
      className={`theme-artwork ${styles.root} ${className}`}
      data-context={context}
      data-artwork={context === "about" ? design : kind}
      data-status={status}
      data-enabled={enabled}
      data-free-drag={freeDrag || fullscreen}
    >
      {context === "home" && (
        <header className="rev3-caption">
          <p className="rev3-kicker">
            {t("工作室藏品", "Studio objects", "工作室藏品")}
          </p>
          <h2 id="home-artwork-title">{t(...details.name)}</h2>
          <p className="rev3-description">{t(...details.description)}</p>
        </header>
      )}
      <div className={`${styles.stage} rev3-stage`} ref={stage}>
        {(status !== "ready" || !enabled) && (
          <img
            className={`${styles.fallback} rev3-poster`}
            src={
              secret
                ? `/media/theme-secrets/${design}-${posterPose}.webp`
                : `/media/theme-objects-v3/${design}-${context}${expanded ? "-open" : ""}.webp`
            }
            alt={
              secret
                ? t(...note.title) +
                  " · " +
                  (posterPose === "closed"
                    ? t("收拢", "Closed", "收攏")
                    : posterPose === "half"
                      ? t("展开中", "Opening", "展開中")
                      : t(...note.description))
                : t(...details.name)
            }
            width="1080"
            height="720"
            loading="lazy"
            decoding="async"
          />
        )}
        <div
          ref={surface}
          className={styles.surface}
          onKeyDown={handleOrbitKey}
        />
      </div>
      <div className={`${styles.footer} rev3-console`}>
        {context === "about" && (
          <h3 className="rev3-name">
            {t(...(secret ? note.title : details.name))}
          </h3>
        )}
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
            {t(...note.description)}
          </p>
        )}
        {secret && live && (
          <label className="rev3-travel">
            <span>{t("揭晓进度", "Reveal", "揭曉進度")}</span>
            <input
              ref={progress}
              type="range"
              min="0"
              max="100"
              step="1"
              defaultValue="0"
              aria-label={t(
                "彩蛋揭晓进度",
                "Secret reveal progress",
                "彩蛋揭曉進度",
              )}
              onPointerDown={(event) => scrubReveal(event.currentTarget)}
              onKeyDown={(event) => {
                if (
                  [
                    "Home",
                    "End",
                    "PageUp",
                    "PageDown",
                    "ArrowLeft",
                    "ArrowRight",
                    "ArrowUp",
                    "ArrowDown",
                  ].includes(event.key)
                )
                  scrubReveal(event.currentTarget);
              }}
              onInput={(event) => scrubReveal(event.currentTarget)}
            />
            <span
              className="rev3-travel-value"
              ref={progressLabel}
              aria-hidden="true"
            >
              0%
            </span>
          </label>
        )}
        {!secret && status === "ready" && enabled && (
          <label className="rev3-travel">
            <span>{t("手动行程", "Manual travel", "手動行程")}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={travel}
              aria-label={t(...details.motion)}
              onChange={(event) => {
                const value = Number(event.currentTarget.value);
                setTravel(value);
                scene.current?.setAmount(value / 100);
              }}
            />
            <output>{travel}%</output>
          </label>
        )}
        <div
          className={styles.controls}
          role="group"
          aria-label={t("三维装置操作", "Artwork controls", "三維裝置操作")}
        >
          {context === "about" && (
            <button
              type="button"
              ref={secretTriggerRef}
              className={secret ? undefined : styles.primary}
              onClick={() => onSecretChange?.(!secret)}
            >
              {secret
                ? t("返回主题场景", "Back to the scene", "返回主題場景")
                : t(...note.trigger)}
            </button>
          )}
          <button
            className={
              context === "home" || secret ? styles.primary : undefined
            }
            aria-pressed={secret ? undefined : expanded}
            onClick={() => {
              if (secret) {
                if (!live && (reduced || paused)) {
                  setPosterPhase((value) => (value === 100 ? 0 : value + 50));
                } else if (live && (reduced || paused)) {
                  const phase = scene.current?.secretProgress() ?? 1;
                  scene.current?.seekSecret(
                    phase >= 0.99 ? 0 : phase < 0.5 ? 0.5 : 1,
                  );
                } else if (live) {
                  scene.current?.replaySecret();
                } else {
                  setPosterRun((value) => value + 1);
                }
                return;
              }
              setTravel(expanded ? 0 : 100);
              scene.current?.transform(!expanded);
            }}
          >
            {secret
              ? reduced || paused
                ? t("下一幕", "Next pose", "下一幕")
                : t("再看一次", "Replay", "再看一次")
              : expanded
                ? t("恢复形态", "Restore form", "恢復形態")
                : t(...details.motion)}{" "}
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
            className={styles.utility}
            disabled={!enabled || status !== "ready"}
            onClick={() => scene.current?.resetView()}
          >
            {t("复位视角", "Reset view", "復位視角")}
          </button>
          <button className={styles.utility} onClick={toggleFullscreen}>
            {fullscreen
              ? t("退出全屏", "Exit full screen", "退出全螢幕")
              : t("全屏", "Full screen", "全螢幕")}{" "}
            <span aria-hidden="true">↗</span>
          </button>
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
