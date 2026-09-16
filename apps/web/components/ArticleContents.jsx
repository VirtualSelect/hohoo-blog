"use client";
import { useEffect, useState } from "react";
import { useText } from "./Shell";

export default function ArticleContents({ headings, mobile = false }) {
  const t = useText();
  const [active, setActive] = useState("");
  useEffect(() => {
    let frame;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let current = headings[0]?.id || "";
        for (const heading of headings) {
          const element = document.getElementById(heading.id);
          if (element && element.getBoundingClientRect().top <= 150)
            current = heading.id;
        }
        setActive(current);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
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
    <details className="mobile-toc">
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
