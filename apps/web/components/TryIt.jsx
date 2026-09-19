"use client";
import { useEffect, useRef } from "react";
import { useText } from "./Shell";
import styles from "./LearningExercises.module.css";
export default function TryIt({ id, title, children }) {
  const t = useText(),
    ref = useRef(null);
  useEffect(() => {
    const reveal = () => {
      let hash;
      try {
        hash = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const target = hash && document.getElementById(hash);
      if (!target || !ref.current?.contains(target)) return;
      ref.current.open = true;
      for (
        let p = target.parentElement;
        p && p !== ref.current;
        p = p.parentElement
      )
        if (p.tagName === "DETAILS") p.open = true;
      requestAnimationFrame(() =>
        target.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);
  return (
    <details id={id} ref={ref} className={styles.exercise}>
      <summary>
        {t("动手试试", "Try it", "動手試試")} · {title}
      </summary>
      <p className={styles.muted}>
        {t(
          "按需展开，在浏览器里探索。",
          "Expand to explore in your browser.",
          "按需展開，在瀏覽器裡探索。",
        )}{" "}
        <a href={"#" + id}>
          {t("直达此实验", "Link to this exercise", "直達此實驗")} ↗
        </a>
      </p>
      {children}
    </details>
  );
}
