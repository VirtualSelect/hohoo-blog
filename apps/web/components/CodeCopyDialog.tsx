"use client";
import { useEffect, useId, useRef } from "react";
import { useText } from "./Shell";

export default function CodeCopyDialog({
  text,
  onClose,
}: {
  text: string | null;
  onClose: () => void;
}) {
  const t = useText();
  const titleId = useId();
  const fieldId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (text === null || !dialog.current) return;
    const node = dialog.current;
    node.showModal();
    field.current?.focus({ preventScroll: true });
    field.current?.select();
    return () => {
      if (node.open) node.close();
    };
  }, [text]);
  if (text === null) return null;
  return (
    <dialog
      ref={dialog}
      className="figure-dialog code-copy-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <header>
        <h2 id={titleId}>
          {t("手动复制代码", "Copy code manually", "手動複製程式碼")}
        </h2>
        <form method="dialog">
          <button type="submit">{t("关闭", "Close", "關閉")} ×</button>
        </form>
      </header>
      <p>
        {t(
          "浏览器未能自动复制。下方是完整代码，可使用系统复制操作；关闭后回到原来的阅读位置。",
          "Automatic copying was unavailable. Use your system's copy action on the complete code below. Closing returns you to your reading position.",
          "瀏覽器無法自動複製。下方是完整程式碼，可使用系統複製操作；關閉後回到原來的閱讀位置。",
        )}
      </p>
      <label htmlFor={fieldId}>
        {t("完整代码", "Complete code", "完整程式碼")}
      </label>
      <textarea
        ref={field}
        id={fieldId}
        readOnly
        rows={12}
        wrap="off"
        spellCheck={false}
        value={text}
        onFocus={(event) => event.currentTarget.select()}
      />
    </dialog>
  );
}
