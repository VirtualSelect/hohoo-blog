"use client";

import { useState, useId, useCallback } from "react";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import WritingList from "@site/src/components/WritingList";
import UrlStateSync from "./UrlStateSync";
import type { ContentEntry } from "../lib/site-types";

export default function WritingExplorer({ items }: { items: ContentEntry[] }) {
  const t = useText();
  const [selectedId, setSelectedId] = useState<string>();
  const previewId = useId();
  const selected = items.find((item) => item.id === selectedId) || items[0];
  const sync = useCallback(() => {
    const value = new URLSearchParams(location.search).get("preview");
    setSelectedId(value && value.length <= 512 ? value : undefined);
  }, []);
  function choose(id: string) {
    setSelectedId(id);
    const url = new URL(location.href);
    url.searchParams.set("preview", id);
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  return (
    <div className="writing-explorer">
      <UrlStateSync onChange={sync} />
      <WritingList
        items={items}
        onPreview={choose}
        selectedId={selected?.id}
        previewId={previewId}
      />
      {selected && (
        <aside
          className="writing-preview"
          id={previewId}
          aria-label={t(
            "选中文章预览",
            "Selected article preview",
            "所選文章預覽",
          )}
        >
          <p className="hh-eyebrow">READING / PREVIEW</p>
          <h2>{selected.title}</h2>
          <p>{selected.description}</p>
          {selected.date && (
            <time dateTime={selected.date}>{selected.date}</time>
          )}
          <Link to={selected.href}>
            {t("阅读正文", "Read the article", "閱讀正文")}{" "}
            <span aria-hidden="true">↗</span>
          </Link>
        </aside>
      )}
    </div>
  );
}
