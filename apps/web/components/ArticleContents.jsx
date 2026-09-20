"use client";
import { useEffect, useState } from "react";
import { useText } from "./Shell";

export default function ArticleContents({ headings, mobile = false }) {
  const t = useText();
  const [active, setActive] = useState("");
  useEffect(() => {
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean);
    if (!elements.length) return;
    const update = () => {
      const current = elements
        .filter((el) => el.getBoundingClientRect().top <= 150)
        .at(-1);
      setActive(current?.id || headings[0]?.id || "");
    };
    update();
    const observer = new IntersectionObserver(update, {
      rootMargin: "-150px 0px 0px 0px",
      threshold: 0,
    });
    elements.forEach((el) => observer.observe(el));
    // A large anchor jump can skip intersection boundaries entirely.
    let timer;
    const settled = () => {
      clearTimeout(timer);
      timer = setTimeout(update, 120);
    };
    window.addEventListener("scroll", settled, { passive: true });
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      window.removeEventListener("scroll", settled);
    };
  }, [headings]);
  if (!headings.length) return null;
  const navigation = (
    <nav aria-label={t("文章目录", "Table of contents", "文章目錄")}>
      {headings.map((heading) => (
        <a
          key={heading.id}
          href={"#" + heading.id}
          aria-current={active === heading.id ? "location" : undefined}
          className={heading.depth === 3 ? "subheading" : ""}
        >
          {heading.text}
        </a>
      ))}
    </nav>
  );
  return mobile ? (
    <details className="mobile-toc" id="article-toc">
      <summary>
        {t("本文目录", "On this page", "本文目錄")}{" "}
        <span>{headings.length}</span>
      </summary>
      {navigation}
    </details>
  ) : (
    <aside className="document-toc">
      <p className="eyebrow">{t("本文目录", "On this page", "本文目錄")}</p>
      {navigation}
    </aside>
  );
}
