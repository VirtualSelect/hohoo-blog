"use client";

import { useEffect, useRef, useState } from "react";
import { useText } from "./Shell";
import type { SignalScene } from "./signal-sculpture-scene";
import styles from "./SignalSculpture.module.css";

export default function SignalSculpture() {
  const t = useText();
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<SignalScene | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [near, setNear] = useState(false);
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [status, setStatus] = useState<"idle" | "ready" | "fallback">("idle");
  const preferences = useRef({ paused, expanded });
  preferences.current = { paused, expanded };

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!enabled || !host.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [enabled]);
  useEffect(() => {
    if (!enabled || !near) return;
    let cancelled = false;
    setStatus("idle");
    import("./signal-sculpture-scene")
      .then(({ createSignalScene }) => {
        if (cancelled || !canvas.current || !host.current) return;
        scene.current = createSignalScene(canvas.current, host.current, () => {
          if (!cancelled) {
            scene.current?.dispose();
            scene.current = null;
            setStatus("fallback");
          }
        });
        scene.current.setPaused(preferences.current.paused);
        scene.current.setExpanded(preferences.current.expanded);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          scene.current?.dispose();
          scene.current = null;
          setStatus("fallback");
        }
      });
    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [enabled, near]);

  return (
    <section
      className={styles.section}
      aria-labelledby="signal-sculpture-title"
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>INTERACTIVE OBJECT / 001</p>
          <h2 id="signal-sculpture-title">
            {t("信号环", "Signal loop", "訊號環")} <span>↗</span>
          </h2>
        </div>
        <button
          className={styles.toggle}
          aria-expanded={enabled}
          aria-controls="signal-sculpture-body"
          onClick={() => setEnabled(!enabled)}
        >
          {enabled
            ? t("关闭 3D", "Close 3D", "關閉 3D")
            : t("开启 3D", "Open 3D", "開啟 3D")}
        </button>
      </header>
      <div id="signal-sculpture-body" hidden={!enabled}>
        {enabled && (
          <>
            <div className={styles.stage} ref={host}>
              <div className={styles.coordinates} aria-hidden="true">
                <span>HOHOO / SIGNAL LOOP</span>
                <span>FORM · MOTION · SPACE</span>
              </div>
              <svg
                className={styles.fallback}
                viewBox="0 0 700 400"
                aria-hidden="true"
                style={{
                  visibility: status === "ready" ? "hidden" : "visible",
                }}
              >
                <g
                  fill="none"
                  stroke="currentColor"
                  transform="translate(350 200)"
                >
                  {[0, 60, 120].map((angle) => (
                    <g key={angle} transform={`rotate(${angle})`}>
                      <ellipse rx="190" ry="72" />
                      <ellipse rx="184" ry="66" opacity=".35" />
                      <ellipse rx="196" ry="78" opacity=".35" />
                    </g>
                  ))}
                  <path d="M0-55 48-28 48 28 0 55-48 28-48-28Z M0-55 0 55M-48-28 48 28M48-28-48 28" />
                </g>
              </svg>
              <canvas
                ref={canvas}
                className={styles.canvas}
                aria-hidden="true"
                style={{
                  visibility: status === "ready" ? "visible" : "hidden",
                }}
              />
              <div className={styles.caption}>
                <span aria-hidden="true">✦</span>{" "}
                {t(
                  "让想法进入轨道。",
                  "Put ideas into orbit.",
                  "讓想法進入軌道。",
                )}
              </div>
            </div>
            <div className={styles.bottom}>
              <p className={styles.description}>
                {t(
                  "可交互的概念装置，不代表实验数据。",
                  "An interactive concept object, not experimental data.",
                  "可互動的概念裝置，不代表實驗數據。",
                )}
              </p>
              <div className={styles.controls}>
                <button
                  disabled={status !== "ready" || reduced}
                  aria-pressed={paused || reduced}
                  onClick={() => {
                    setPaused(!paused);
                    scene.current?.setPaused(!paused);
                  }}
                >
                  {reduced
                    ? t("静态模式", "Static mode", "靜態模式")
                    : paused
                      ? t("继续旋转", "Resume", "繼續旋轉")
                      : t("暂停旋转", "Pause", "暫停旋轉")}
                </button>
                <button
                  disabled={status !== "ready"}
                  aria-pressed={expanded}
                  onClick={() => {
                    setExpanded(!expanded);
                    scene.current?.setExpanded(!expanded);
                  }}
                >
                  {expanded
                    ? t("收拢环层", "Collapse", "收攏環層")
                    : t("展开环层", "Expand", "展開環層")}
                </button>
                <button
                  disabled={status !== "ready"}
                  onClick={() => scene.current?.turn()}
                >
                  {t("转动 30°", "Turn 30°", "轉動 30°")}
                </button>
              </div>
            </div>
            {status === "fallback" && (
              <p className={styles.notice} role="status">
                {t(
                  "当前显示静态示意。可关闭后重新开启 3D。",
                  "Showing the static illustration. Close and reopen 3D to retry.",
                  "目前顯示靜態示意。可關閉後重新開啟 3D。",
                )}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
