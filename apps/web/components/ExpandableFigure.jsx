"use client";
import { useRef, useState } from "react";
import { useText } from "./Shell";

// Native modal owns focus trapping and Escape. Heavy content mounts only on demand.
export default function ExpandableFigure({ title, children, renderExpanded }) {
  const t = useText();
  const dialog = useRef(null);
  const trigger = useRef(null);
  const [opened, setOpened] = useState(false);
  return (
    <figure className="expandable-figure">
      {children}
      <figcaption>
        <span>{title}</span>
        <button
          ref={trigger}
          type="button"
          onClick={() => {
            setOpened(true);
            dialog.current.showModal();
          }}
        >
          {t("展开查看", "Open view", "展開查看")} ↗
        </button>
      </figcaption>
      <dialog
        ref={dialog}
        className="figure-dialog"
        aria-label={title}
        onClose={() => {
          setOpened(false);
          trigger.current?.focus({ preventScroll: true });
        }}
      >
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={() => dialog.current.close()}>
            {t("关闭", "Close", "關閉")} ×
          </button>
        </header>
        {opened && (renderExpanded ? renderExpanded() : children)}
      </dialog>
    </figure>
  );
}
