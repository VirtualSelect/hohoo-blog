"use client";
import { useEffect, useRef, useState } from "react";
import { designThemes } from "../lib/design-themes.mjs";

export default function ThemeWindows({ selectedId, onChoose, t }) {
  const initialIndex = Math.max(
    0,
    designThemes.findIndex((item) => item.id === selectedId),
  );
  const [index, setIndex] = useState(initialIndex);
  const track = useRef(null);
  const frame = useRef(0);
  const drag = useRef(null);

  function moveTo(nextIndex, smooth = true) {
    const element = track.current;
    const card = element?.children[nextIndex];
    if (!card) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollTo({
      left: card.offsetLeft - (element.clientWidth - card.clientWidth) / 2,
      behavior: smooth && !reduced ? "smooth" : "instant",
    });
    setIndex(nextIndex);
  }

  useEffect(() => {
    moveTo(initialIndex, false);
    return () => cancelAnimationFrame(frame.current);
  }, []);

  function onScroll() {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const element = track.current;
      if (!element) return;
      const center =
        element.getBoundingClientRect().left + element.clientWidth / 2;
      let closest = 0;
      let distance = Infinity;
      [...element.children].forEach((card, i) => {
        const rect = card.getBoundingClientRect();
        const delta = Math.abs(rect.left + rect.width / 2 - center);
        if (delta < distance) {
          distance = delta;
          closest = i;
        }
      });
      setIndex(closest);
    });
  }

  return (
    <section
      className="theme-windows"
      aria-label={t("八扇主题窗口", "Eight theme windows", "八扇主題視窗")}
    >
      <div className="theme-windows-tools">
        <p>
          <span>{String(index + 1).padStart(2, "0")}</span> / 08{" "}
          <span className="theme-windows-hint">
            {t(
              "左右滑动，寻找喜欢的风景",
              "Slide to find your next view",
              "左右滑動，尋找喜歡的風景",
            )}
          </span>
        </p>
        <div>
          <button
            type="button"
            disabled={index === 0}
            aria-label={t(
              "上一个主题预览",
              "Previous theme preview",
              "上一個主題預覽",
            )}
            onClick={() => moveTo(Math.max(0, index - 1))}
          >
            ←
          </button>
          <button
            type="button"
            disabled={index === designThemes.length - 1}
            aria-label={t(
              "下一个主题预览",
              "Next theme preview",
              "下一個主題預覽",
            )}
            onClick={() => moveTo(Math.min(designThemes.length - 1, index + 1))}
          >
            →
          </button>
        </div>
      </div>
      <div
        className="theme-windows-track"
        ref={track}
        onScroll={onScroll}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse" || event.button !== 0) return;
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            left: event.currentTarget.scrollLeft,
            moved: false,
          };
        }}
        onPointerMove={(event) => {
          const gesture = drag.current;
          if (!gesture || event.buttons !== 1) return;
          const delta = event.clientX - gesture.x;
          if (
            !gesture.moved &&
            (Math.abs(delta) < 8 ||
              Math.abs(delta) < Math.abs(event.clientY - gesture.y))
          )
            return;
          if (!gesture.moved) {
            gesture.moved = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.style.scrollSnapType = "none";
            event.currentTarget.dataset.dragging = "true";
          }
          event.preventDefault();
          event.currentTarget.scrollLeft = gesture.left - delta;
        }}
        onPointerUp={(event) => {
          event.currentTarget.style.scrollSnapType = "";
          delete event.currentTarget.dataset.dragging;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={(event) => {
          drag.current = null;
          event.currentTarget.style.scrollSnapType = "";
          delete event.currentTarget.dataset.dragging;
        }}
        onClickCapture={(event) => {
          if (!drag.current?.moved) return;
          drag.current = null;
          event.preventDefault();
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          const steps = {
            ArrowLeft: Math.max(0, index - 1),
            ArrowRight: Math.min(7, index + 1),
            Home: 0,
            End: 7,
          };
          if (!(event.key in steps)) return;
          event.preventDefault();
          const next = steps[event.key];
          moveTo(next);
          track.current?.children[next]
            ?.querySelector("button")
            ?.focus({ preventScroll: true });
        }}
      >
        {designThemes.map((design, i) => (
          <article
            className="theme-window"
            data-window={design.id}
            key={design.id}
          >
            <button
              className="theme-window-select"
              type="button"
              aria-pressed={selectedId === design.id}
              aria-label={
                t("使用", "Use", "使用") +
                " " +
                design.code +
                " · " +
                t(...design.label)
              }
              onClick={() => onChoose(design)}
              onFocus={() => moveTo(i)}
            >
              <span className="theme-window-image">
                <span className="theme-window-chrome" aria-hidden="true">
                  <span>● ● ●</span>
                  <span>hohoo / {design.id}</span>
                  <span>↗</span>
                </span>
                <img
                  src={"/media/theme-previews/" + design.id + ".jpg"}
                  alt={
                    t(...design.label) +
                    t("首页预览", " home preview", "首頁預覽")
                  }
                  width="640"
                  height="425"
                  loading={Math.abs(initialIndex - i) <= 1 ? "eager" : "lazy"}
                  draggable="false"
                />
              </span>
              <span className="theme-window-copy">
                <span className="theme-window-heading">
                  <span className="theme-window-code">{design.code}</span>
                  <strong>{t(...design.label)}</strong>
                  <span className="theme-window-enter">
                    {selectedId === design.id
                      ? t("正在这里 ✓", "You are here ✓", "正在這裡 ✓")
                      : t("走进这扇窗 ↗", "Step inside ↗", "走進這扇窗 ↗")}
                  </span>
                </span>
                <span className="theme-window-description">
                  {t(...design.description)}
                </span>
              </span>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
