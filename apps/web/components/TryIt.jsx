"use client";
import { useEffect, useRef, useState } from "react";
import { useText } from "./Shell";
import styles from "./LearningExercises.module.css";
/** @param {{ id: string, title: string, anchors?: string[], children: import('react').ReactNode }} props */
export default function TryIt({ id, title, anchors = [], children }) {
  const t = useText(),
    ref = useRef(null);
  const [mounted, setMounted] = useState(false);
  const anchorKey = anchors.join("|");
  useEffect(() => {
    const reveal = () => {
      let hash;
      try {
        hash = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      if (
        hash &&
        (hash === id || anchorKey.split("|").includes(hash)) &&
        !mounted
      ) {
        setMounted(true);
        return;
      }
      const target = hash && document.getElementById(hash);
      if (!target || !ref.current?.contains(target)) return;
      ref.current.open = true;
      for (
        let p = target.parentElement;
        p && p !== document.body;
        p = p.parentElement
      )
        if (p.tagName === "DETAILS") p.open = true;
      requestAnimationFrame(() =>
        target.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    };
    const repeatAnchor = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !link ||
        link.hasAttribute("download") ||
        (link.target && link.target !== "_self")
      )
        return;
      let url;
      try {
        url = new URL(link.href, window.location.href);
      } catch {
        return;
      }
      // The browser does not fire hashchange when a closed exercise's link
      // points to the fragment already in the address bar. Reuse its reveal
      // path without intercepting navigation or resetting mounted inputs.
      if (
        url.hash &&
        url.origin === location.origin &&
        url.pathname === location.pathname &&
        url.search === location.search &&
        url.hash === location.hash
      )
        reveal();
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    window.addEventListener("click", repeatAnchor);
    return () => {
      window.removeEventListener("hashchange", reveal);
      window.removeEventListener("click", repeatAnchor);
    };
  }, [mounted, id, anchorKey]);
  return (
    <details
      id={id}
      ref={ref}
      className={styles.exercise}
      onToggle={(event) => {
        if (event.currentTarget.open) setMounted(true);
      }}
    >
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
      {mounted ? children : null}
    </details>
  );
}
