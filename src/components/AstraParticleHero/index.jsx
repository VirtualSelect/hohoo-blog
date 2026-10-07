import { uiLabel } from "@site/src/utils/ui-labels";
import React, { useEffect, useRef, useState } from "react";
import useBaseUrl from "@lab/runtime/base-url";
import { useSite } from "@lab/runtime/context";
import styles from "./styles.module.css";
export default function AstraParticleHero({ en = false }) {
  const { locale, messages } = useSite();
  // Translation lookup is pure: conditional controls must not call context hooks.
  const translate = ({ id, message }) => messages[id]?.message || message || id;
  const t = (zh, english, tw = zh) =>
    en ? english : locale === "zh-TW" ? tw : zh;
  const [active, setActive] = useState(false);
  const trigger = useRef(null);
  const pathUrl = useBaseUrl("/img/hohoo-particles.svg");
  const canvas = useRef(null),
    section = useRef(null),
    scene = useRef(null),
    pausedRef = useRef(false);
  const [status, setStatus] = useState("loading");
  const [paused, setPaused] = useState(false),
    [reduced, setReduced] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    change();
    query.addEventListener("change", change);
    try {
      setPaused(localStorage.getItem("huhohoo.astra-motion.v1") === "paused");
    } catch {}
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    pausedRef.current = paused;
    scene.current?.setPaused(paused);
  }, [paused]);
  useEffect(() => {
    if (!active) return;
    const abort = new AbortController();
    setStatus("loading");
    import("./scene")
      .then(({ createAstraScene }) => {
        if (abort.signal.aborted) return null;
        return createAstraScene(
          canvas.current,
          section.current,
          abort.signal,
          (value) => {
            if (!abort.signal.aborted) setStatus(value);
          },
          {
            pathUrl,
            navHeight: 72,
            fadeOnScroll: false,
          },
        );
      })
      .then((value) => {
        if (!value) return;
        if (abort.signal.aborted) {
          value.dispose();
          return;
        }
        scene.current = value;
        value.setPaused(pausedRef.current);
      })
      .catch(() => {
        if (!abort.signal.aborted) setStatus("error");
      });
    return () => {
      abort.abort();
      scene.current?.dispose();
      scene.current = null;
    };
  }, [active, attempt, pathUrl]);
  const ready = active && (status === "ready" || status === "fallback");
  function close() {
    setActive(false);
    trigger.current?.focus();
  }
  function toggle() {
    const next = !paused;
    setPaused(next);
    try {
      localStorage.setItem(
        "huhohoo.astra-motion.v1",
        next ? "paused" : "playing",
      );
    } catch {}
  }
  function keydown(event) {
    const current = scene.current;
    if (!current) return;
    switch (event.key) {
      case "ArrowLeft":
        current.rotate(-0.15, 0);
        break;
      case "ArrowRight":
        current.rotate(0.15, 0);
        break;
      case "ArrowUp":
        current.rotate(0, -0.12);
        break;
      case "ArrowDown":
        current.rotate(0, 0.12);
        break;
      case " ":
        if (!paused && !reduced) current.scatter();
        break;
      case "r":
      case "R":
      case "Escape":
        if (event.key === "Escape") close();
        else current.reset();
        break;
      default:
        return;
    }
    event.preventDefault();
  }
  return (
    <section
      ref={section}
      className={styles.scrollSection}
      data-active={active}
      data-reduced={reduced}
      data-status={status}
      aria-label={t(
        translate({
          id: "ui.c67dfe0378",
          message: "Hohoo \u7C92\u5B50\u661F\u7FA4",
        }),
        "Hohoo particle galaxy",
      )}
    >
      <div className={styles.sticky}>
        <div className={styles.eyebrow}>
          <span>{uiLabel("ABOUT / HOOHOO")}</span>
          <span>{uiLabel("LEARNING IN PUBLIC. BUILDING IN PUBLIC.")}</span>
        </div>
        <h1 className={styles.hidden}>
          {t(
            translate({
              id: "ui.a3910125df",
              message: "\u5173\u4E8E Hohoo",
            }),
            "About Hohoo",
          )}
        </h1>
        <div id="about-astra-canvas" className={styles.canvasWrap}>
          <canvas
            ref={canvas}
            className={styles.canvas}
            tabIndex={ready ? 0 : -1}
            onKeyDown={keydown}
            role="img"
            aria-label={t(
              translate({
                id: "ui.f62aab6ed9",
                message:
                  "\u7531\u4E94\u6761\u7ACB\u4F53\u7C92\u5B50\u661F\u81C2\u7EC4\u6210\u7684 Hohoo",
              }),
              "Hohoo formed by five particle arms",
            )}
            aria-describedby="about-astra-help"
          />
          {!ready && (
            <span className={styles.fallback} aria-hidden="true">
              Hohoo
            </span>
          )}
        </div>
        <p id="about-astra-help" className={styles.hidden}>
          {t(
            translate({
              id: "ui.21ed5cda95",
              message:
                "\u62D6\u52A8\u6216\u65B9\u5411\u952E\u65CB\u8F6C\uFF0C\u7A7A\u683C\u62E8\u6563\uFF0CR \u590D\u4F4D\u3002",
            }),
            "Drag or use arrow keys to rotate. Space scatters; R resets.",
          )}
        </p>
        <div className={styles.bottom}>
          <p>
            {t(
              translate({
                id: "ui.31c778eb3b",
                message:
                  "\u4ECE Java \u5230 AI\uFF0C\u628A\u597D\u5947\u5FC3\u53D8\u6210\u5B9E\u8DF5\u3002",
              }),
              "From Java to AI. Turning curiosity into practice.",
            )}
          </p>
          <div className={styles.controls}>
            <button
              ref={trigger}
              aria-expanded={active}
              aria-controls="about-astra-canvas"
              onClick={() => (active ? close() : setActive(true))}
            >
              {active
                ? t("收起粒子名片", "Close particle portrait", "收起粒子名片")
                : t("展开粒子名片", "Open particle portrait", "展開粒子名片")}
            </button>
            {active && (
              <>
                <button
                  disabled={!ready || reduced || paused}
                  onClick={() => scene.current?.scatter()}
                >
                  {t(
                    translate({
                      id: "ui.e28092170e",
                      message: "\u62E8\u6563",
                    }),
                    "Scatter",
                  )}
                </button>
                <button
                  disabled={!ready}
                  onClick={() => scene.current?.reset()}
                >
                  {t(
                    translate({
                      id: "ui.52a5c38f0e",
                      message: "\u590D\u4F4D",
                    }),
                    "Reset",
                  )}
                </button>
                <button
                  disabled={!ready || reduced}
                  aria-pressed={paused || reduced}
                  onClick={toggle}
                >
                  {reduced
                    ? t(
                        translate({
                          id: "ui.58a67dbe6f",
                          message: "\u5DF2\u51CF\u5C11\u52A8\u6001\u6548\u679C",
                        }),
                        "Reduced motion",
                      )
                    : paused
                      ? t(
                          translate({
                            id: "ui.21925350de",
                            message: "\u64AD\u653E",
                          }),
                          "Play",
                        )
                      : t(
                          translate({
                            id: "ui.130448bce6",
                            message: "\u6682\u505C",
                          }),
                          "Pause",
                        )}
                </button>
              </>
            )}
          </div>
          <p className={styles.help}>
            {active
              ? t(
                  "拖动或方向键旋转 · 空格拨散 · R 复位 · Esc 收起",
                  "Drag / arrows: rotate · Space: scatter · R: reset · Esc: close",
                  "拖動或方向鍵旋轉 · 空格撥散 · R 復位 · Esc 收起",
                )
              : t(
                  "Astra · 按需开启，无需离开关于页。",
                  "Astra · Open on demand, right here on the About page.",
                  "Astra · 按需開啟，無需離開關於頁。",
                )}
          </p>
        </div>
        {active && ["error", "lost"].includes(status) && (
          <p className={styles.error} role="status">
            {t(
              translate({
                id: "ui.bbc9b4405e",
                message:
                  "\u89C6\u89C9\u6682\u4E0D\u53EF\u7528\uFF0C\u6B63\u6587\u4ECD\u53EF\u9605\u8BFB\u3002",
              }),
              "The visual is unavailable. You can still read below.",
            )}{" "}
            <button onClick={() => setAttempt((v) => v + 1)}>
              {t(
                translate({
                  id: "ui.e2d53a6d3a",
                  message: "\u91CD\u8BD5",
                }),
                "Retry",
              )}
            </button>
          </p>
        )}
        <a className={styles.scrollLink} href="#about-content">
          {t(
            translate({
              id: "ui.67e90169b8",
              message: "\u4E86\u89E3\u6211",
            }),
            "Get to know me",
          )}{" "}
          ↓
        </a>
      </div>
    </section>
  );
}
