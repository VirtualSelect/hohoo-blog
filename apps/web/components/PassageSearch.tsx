"use client";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSite } from "../runtime/context";
import { useText } from "./Shell";
import Link from "../runtime/Link";
import { passageCitation } from "../lib/passage-citation.mjs";
import {
  createSectionSearcher,
  passageExcerpt,
  searchTerms,
} from "../lib/section-search.mjs";

interface Passage {
  id: string;
  documentId: string;
  title: string;
  heading: string;
  href: string;
  type: string;
  topic?: string;
  text: string;
  contentHash: string;
  context?: string;
}

function CitationCopy({ passage }: { passage: Passage }) {
  const { sectionSearchUrl, locale } = useSite();
  const t = useText();
  const [status, setStatus] = useState("");
  const citation = passageCitation(passage, sectionSearchUrl, locale);
  async function copy() {
    try {
      await navigator.clipboard.writeText(citation);
      setStatus("copied");
    } catch {
      setStatus("manual");
    }
  }
  return (
    <div className="passage-citation">
      <button
        type="button"
        onClick={copy}
        aria-label={t(
          `复制引用：${passage.heading || passage.title}`,
          `Copy citation: ${passage.heading || passage.title}`,
          `複製引用：${passage.heading || passage.title}`,
        )}
      >
        {t("复制引用", "Copy citation", "複製引用")}
      </button>
      <span role="status">
        {status === "copied"
          ? t(
              "已复制原文与出处",
              "Excerpt and source copied",
              "已複製原文與出處",
            )
          : status === "manual"
            ? t(
                "未能访问剪贴板，请手动复制下方内容。",
                "Clipboard unavailable. Copy the text below.",
                "無法存取剪貼簿，請手動複製下方內容。",
              )
            : ""}
      </span>
      {status === "manual" && (
        <textarea
          readOnly
          rows={6}
          aria-label={t("引用文本", "Citation text", "引用文字")}
          value={citation}
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const terms = [
    ...new Set(searchTerms(query.replace(/\b(type|topic):[\w-]+/gi, ""))),
  ].sort((a, b) => b.length - a.length);
  if (!terms.length) return text;
  const expression = new RegExp(
    "(" +
      terms
        .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|") +
      ")",
    "gi",
  );
  return text
    .split(expression)
    .map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

export default function PassageSearch({
  query,
  onClose,
}: {
  query: string;
  onClose: () => void;
}) {
  const { sectionSearchUrl, locale } = useSite();
  const t = useText();
  const [passages, setPassages] = useState<Passage[]>([]);
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const deferredQuery = useDeferredValue(query);
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    fetch(sectionSearchUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Passage index unavailable");
        return response.json();
      })
      .then((records: unknown) => {
        if (
          !Array.isArray(records) ||
          !records.every(
            (record) =>
              record &&
              typeof record.text === "string" &&
              typeof record.heading === "string" &&
              typeof record.title === "string" &&
              typeof record.documentId === "string" &&
              typeof record.id === "string" &&
              (record.context === undefined ||
                (typeof record.context === "string" &&
                  record.context.length > 0 &&
                  record.text.startsWith(record.context + "\n"))) &&
              /^[a-f0-9]{64}$/.test(record.contentHash || "") &&
              typeof record.href === "string" &&
              record.href.startsWith("/") &&
              !record.href.startsWith("//"),
          )
        )
          throw new Error("Invalid passage index");
        // Validate provenance before rendering so a corrupt asset uses the error state.
        for (const record of records)
          passageCitation(record, sectionSearchUrl, locale);
        setPassages(records);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [sectionSearchUrl, locale, attempt]);
  const search = useMemo(() => createSectionSearcher(passages), [passages]);
  const results: Passage[] = useMemo(
    () => search(deferredQuery),
    [search, deferredQuery],
  );
  return (
    <section
      className="passage-search"
      aria-label={t("正文段落检索", "Passage search", "正文段落檢索")}
      aria-busy={status === "loading" || query !== deferredQuery}
    >
      <p className="hh-meta">
        {t(
          "检索本站已发布教程与随笔的正文；关键词匹配，不生成回答。",
          "Find passages in published tutorials and essays. Keyword matching; no generated answers.",
          "檢索本站已發佈教學與隨筆的正文；關鍵字匹配，不生成回答。",
        )}
      </p>
      {status === "loading" ? (
        <p role="status">
          {t("正在加载段落索引…", "Loading passages…", "正在載入段落索引…")}
        </p>
      ) : status === "error" ? (
        <p role="status">
          <button onClick={() => setAttempt((value) => value + 1)}>
            {t(
              "段落加载失败，重试",
              "Passages unavailable. Retry",
              "段落載入失敗，重試",
            )}
          </button>
        </p>
      ) : !query.trim() ? (
        <p>
          {t(
            "试试“缓存 更慢”“读取超时”或“MuJoCo 阻尼”。支持 type:doc 和 topic:llm。",
            "Try “cache slower”, “read timeout” or “MuJoCo damping”. Filters: type:doc and topic:llm.",
            "試試「快取 更慢」「讀取超時」或「MuJoCo 阻尼」。支援 type:doc 和 topic:llm。",
          )}
        </p>
      ) : (
        <>
          <p className="hh-meta" role="status">
            {t(
              `显示 ${results.length} 个匹配段落，最多12个，每篇最多2个。`,
              `Showing ${results.length} passages; up to 12, at most 2 per article.`,
              `顯示 ${results.length} 個符合段落，最多12個，每篇最多2個。`,
            )}
          </p>
          {!results.length && (
            <p className="empty">
              {t(
                "没有匹配段落。试试两个具体关键词，或切回标题与摘要查找其他内容。",
                "No matching passages. Try two specific keywords, or switch to titles and summaries for other content.",
                "沒有匹配段落。試試兩個具體關鍵字，或切回標題與摘要尋找其他內容。",
              )}
            </p>
          )}
          {results.map((passage) => (
            <article className="passage-item" key={passage.id}>
              <Link
                className="search-result passage-result"
                to={passage.href}
                onClick={onClose}
              >
                <small className="passage-source">{passage.title}</small>
                <strong>
                  {passage.heading ||
                    t("正文开篇", "Opening passage", "正文開篇")}{" "}
                  ↗
                </strong>
                {passage.context && (
                  <p className="passage-question">
                    <Highlight text={passage.context} query={deferredQuery} />
                  </p>
                )}
                <p>
                  <Highlight
                    text={passageExcerpt(
                      passage.context
                        ? passage.text.slice(passage.context.length + 1)
                        : passage.text,
                      deferredQuery,
                    )}
                    query={deferredQuery}
                  />
                </p>
              </Link>
              <details className="passage-inspect">
                <summary>
                  {t("核对完整摘录", "Inspect full excerpt", "核對完整摘錄")}
                  <span className="sr-only">
                    : {passage.title}
                    {passage.heading ? ` / ${passage.heading}` : ""}
                  </span>
                </summary>
                <p className="passage-inspect-note">
                  {t(
                    "以下为索引保留的完整段落；更完整的上下文请查看原文。",
                    "The full indexed passage is shown below. Open the source for its wider context.",
                    "以下為索引保留的完整段落；更完整的上下文請查看原文。",
                  )}
                </p>
                <blockquote cite={passage.href}>
                  <Highlight text={passage.text} query={deferredQuery} />
                </blockquote>
                <Link to={passage.href} onClick={onClose}>
                  {t("到原文核对", "Check the source", "到原文核對")} ↗
                </Link>
              </details>
              <CitationCopy passage={passage} />
            </article>
          ))}
        </>
      )}
      <details className="passage-method">
        <summary>
          {t("检索范围与边界", "Scope and limitations", "檢索範圍與邊界")}
        </summary>
        <p>
          {t(
            "“复制引用”包含完整段落、原文小节链接、索引快照与内容指纹。指纹用于识别摘录版本，不证明结论正确；旧索引可能随部署清理，请同时保留引用文本。未发布的本地预览尚不能通过线上快照地址访问。",
            "“Copy citation” includes the full passage, source section, index snapshot and content fingerprint. A fingerprint identifies an excerpt version; it does not establish correctness. Old index assets may be pruned, so retain the quoted text. Local preview snapshots are not available on the public site until deployed.",
            "「複製引用」包含完整段落、原文小節連結、索引快照與內容指紋。指紋用於辨識摘錄版本，不證明結論正確；舊索引可能隨部署清理，請同時保留引用文字。未發佈的本地預覽尚無法透過線上快照網址存取。",
          )}
        </p>
        <p>
          {t(
            "怎么搜更有效：先用两个具体词，如“缓存 更慢”；结果太杂时加 topic:llm。折叠练习的摘录保留原题与解答，打开原文后可展开核对。先读摘录，再核对比较条件与适用范围，避免把局部结论当成通用建议。",
            "Start with two specific terms such as “cache slower”; add topic:llm to narrow the scope. Exercise excerpts retain the original question and answer; open the source to expand and check them. Verify comparison conditions and limitations before applying a conclusion.",
            "怎麼搜更有效：先用兩個具體詞，如「快取 成本」；結果太雜時加 topic:llm。折疊練習的摘錄保留原題與解答，開啟原文後可展開核對。先讀摘錄，再核對比較條件與適用範圍，避免把局部結論當成通用建議。",
          )}
        </p>
        <p>
          {t(
            "实现方式：构建时提取正文和真实标题锚点，同一小节相邻段落合并；浏览器用中文相邻双字、英文词项与词频排序。标题只提供较低权重，因此正文证据优先。这是可检查的词项检索，尚未实现向量检索或生成回答。",
            "At build time, prose is extracted with its real heading anchors and adjacent paragraphs are grouped. The browser ranks Chinese character pairs and English words using term frequencies, with lower weight for article titles. This is inspectable lexical retrieval, without vectors or generated answers.",
            "實作方式：建構時擷取正文和真實標題錨點，同一小節相鄰段落合併；瀏覽器用中文相鄰雙字、英文詞項與詞頻排序。標題只提供較低權重，因此正文證據優先。這是可檢查的詞項檢索，尚未實作向量檢索或生成回答。",
          )}
        </p>
        <p>
          {t(
            "摘录来自当前语言的原文，点击可到对应小节。排序按关键词相关性，不能说明结论正确或资料完整。资讯、未来计划、代码块和表格不在本模式范围内；英文与繁体使用各自索引，问题不会发送给第三方。",
            "Excerpts come from the current language and link to their source section. Lexical ranking does not establish correctness or completeness. News, future plans, code blocks and tables are excluded. Each language has its own index. Queries stay in your browser.",
            "摘錄來自目前語言的原文，點擊可到對應小節。排序依關鍵字相關性，不能說明結論正確或資料完整。資訊、未來計畫、程式碼區塊和表格不在本模式範圍內；英文與繁體使用各自索引，問題不會傳送給第三方。",
          )}
        </p>
      </details>
    </section>
  );
}
