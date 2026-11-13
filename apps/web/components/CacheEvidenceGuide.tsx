"use client";
import Link from "../runtime/Link";
import { useText } from "./Shell";
import evidence from "../generated/question-evidence.json";
import type { ContentEntry } from "../lib/site-types";
import s from "./CacheEvidenceGuide.module.css";

export default function CacheEvidenceGuide({
  entries,
}: {
  entries: ContentEntry[];
}) {
  const t = useText();
  const study = evidence.cacheTradeoffs;
  const article = (slug: string) =>
    entries.find((entry) => entry.id === "doc:llm/" + slug);
  const read = (slug: string) => {
    const entry = article(slug);
    return entry ? <Link to={entry.href}>{entry.title} →</Link> : null;
  };
  return (
    <section
      className={s.root}
      id="cache-guide"
      aria-labelledby="cache-guide-title"
    >
      <header>
        <p className="hh-eyebrow">
          {t("LLM / 结论怎么读", "LLM / READ THE EVIDENCE", "LLM / 結論怎麼讀")}
        </p>
        <h2 id="cache-guide-title">
          {t(
            "缓存优化，先问清这三件事。",
            "Three checks before a cache optimization.",
            "快取最佳化，先問清這三件事。",
          )}
        </h2>
        <p>
          {t(
            "数值等价、内存账和实际耗时分别验收。以下是不同协议的归档结果，不能跨实验拼成性能榜。",
            "Check numerical equivalence, memory accounting and elapsed time separately. These archived studies use different protocols; their numbers are not a shared leaderboard.",
            "數值等價、記憶體帳與實際耗時分別驗收。以下是不同協議的歸檔結果，不能跨實驗拼成效能榜。",
          )}
        </p>
      </header>
      <details
        className={s.panel}
        name="llm-cache-checks"
        id="cache-correctness"
      >
        <summary>
          <span className={s.number}>01</span>
          <strong>
            {t(
              "算出来是否一样？",
              "Are the outputs equivalent?",
              "算出來是否一樣？",
            )}
          </strong>
          <span className={s.toggle} aria-hidden="true" />
        </summary>
        <div className={s.body}>
          <p>
            {t(
              "先比较同一个模型、输入和位置规则下的完整计算与增量计算。形状相同不足以通过；追加Token时的因果掩码必须考虑已有缓存的偏移。",
              "Compare full and incremental computation for the same model, input and position rules. Equal shapes are insufficient; causal masking for new tokens must include the cache offset.",
              "先比較同一模型、輸入與位置規則下的完整計算與增量計算。形狀相同不足以通過；追加Token時的因果遮罩必須考慮既有快取偏移。",
            )}
          </p>
          <p className={s.boundary}>
            {t(
              "结果相同也不代表有权复用：模型、位置规则或会话scope改变后，旧缓存仍可能必须失效。",
              "Equal outputs do not establish permission to reuse: model, position-rule or session-scope changes can invalidate the cache.",
              "結果相同也不代表有權重用：模型、位置規則或會話scope改變後，舊快取仍可能必須失效。",
            )}
          </p>
          <p>
            <strong>{t("读完能做", "What you can check", "讀完能做")}</strong> ·{" "}
            {t(
              "先检查对应输出与最大误差，再单独验证失效条件；数值检查未通过时停止比较速度。",
              "Check corresponding outputs and maximum error, then test invalidation separately. Resolve numerical failures before comparing speed.",
              "先檢查對應輸出與最大誤差，再單獨驗證失效條件；數值檢查未通過時停止比較速度。",
            )}
          </p>
          <nav
            aria-label={t(
              "数值与失效阅读",
              "Correctness and invalidation reading",
              "數值與失效閱讀",
            )}
          >
            {read("kv-cache-equivalence")}
            {read("prefix-cache-invalidation")}
          </nav>
        </div>
      </details>
      <details className={s.panel} name="llm-cache-checks" id="cache-memory">
        <summary>
          <span className={s.number}>02</span>
          <strong>
            {t(
              "省下的是哪种内存？",
              "Which memory gets smaller?",
              "省下的是哪種記憶體？",
            )}
          </strong>
          <span className={s.toggle} aria-hidden="true" />
        </summary>
        <div className={s.body}>
          <p>
            {t(
              "缓存负载、临时工作数组和整个进程的峰值不是同一本账。4-bit还要保存scale；分块解码缩小指定数组，也可能增加执行工作。",
              "Cache payload, temporary arrays and process peak memory are different accounts. Four-bit storage still needs scales; block decoding can shrink selected arrays while adding execution work.",
              "快取負載、暫時工作陣列與整個程序峰值不是同一本帳。4-bit仍要儲存scale；分塊解碼縮小指定陣列，也可能增加執行工作。",
            )}
          </p>
          <table>
            <caption>
              {t("同一反量化协议", "One decoding protocol", "同一反量化協議")} ·
              N={study.shape.tokens}, D={study.shape.dimensions}, Q=
              {study.shape.queries}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t("比较项", "Measure", "比較項")}</th>
                <th scope="col">{t("全量解码", "Full decode", "全量解碼")}</th>
                <th scope="col">
                  {t("分块", "Blocked", "分塊")} {study.shape.blockTokens} Token
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  {t("指定K/V数组", "Selected K/V arrays", "指定K/V陣列")}
                </th>
                <td>{study.arrays.full.toLocaleString("en-US")} B</td>
                <td>{study.arrays.block.toLocaleString("en-US")} B</td>
              </tr>
              <tr>
                <th scope="row">
                  {t("本机耗时中位数", "Local median time", "本機耗時中位數")}
                </th>
                <td>{study.timing!.full} μs</td>
                <td>{study.timing!.block} μs</td>
              </tr>
            </tbody>
          </table>
          <p className={s.boundary}>
            {t(
              "这里数组字节来自形状与dtype，不是实测进程RSS或显存峰值。计时仅覆盖本文的CPU反量化与注意力路径；数组更小，但本机实现更慢。",
              "Array bytes are derived from shapes and dtypes, not measured process RSS or GPU peaks. Timing covers this CPU decoding-and-attention path: smaller arrays, slower execution in the recorded run.",
              "此處陣列位元組來自形狀與dtype，不是實測程序RSS或顯存峰值。計時僅涵蓋本文CPU反量化與注意力路徑；陣列更小，但本機實作更慢。",
            )}
          </p>
          <nav
            aria-label={t(
              "内存与量化阅读",
              "Memory and quantization reading",
              "記憶體與量化閱讀",
            )}
          >
            {read("kv-packed-groups")}
            {read("kv-block-decode-cost")}
          </nav>
          <p className={s.sources}>
            <a href={study.source.code} target="_blank" rel="noreferrer">
              {t("固定代码", "Pinned code", "固定程式碼")} ↗
            </a>
            <a href={study.source.evidence} target="_blank" rel="noreferrer">
              {t("原始记录", "Source records", "原始記錄")} ↗
            </a>
          </p>
        </div>
      </details>
      <details
        className={s.panel}
        name="llm-cache-checks"
        id="cache-latency"
        open
      >
        <summary>
          <span className={s.number}>03</span>
          <strong>
            {t(
              "实际更快了吗？",
              "Does it actually run faster?",
              "實際更快了嗎？",
            )}
          </strong>
          <span className={s.toggle} aria-hidden="true" />
        </summary>
        <div className={s.body}>
          <p>
            {t(
              "命中前8个Token，只续算后4个，并没有消除签名、查找、复制与分段调用。应比较总查询，而不是只看省下的投影行数。",
              "Reusing eight tokens and continuing with four does not remove signature, lookup, copying and segmented-call overhead. Compare the total query, not only saved projection rows.",
              "命中前8個Token，只續算後4個，沒有消除簽章、查找、複製與分段呼叫。應比較總查詢，而不只看省下的投影列數。",
            )}
          </p>
          <table>
            <caption>
              {t(
                "归档中位数 · 两层NumPy教学模型 · 本机CPU",
                "Archived medians · two-layer NumPy teaching model · local CPU",
                "歸檔中位數 · 兩層NumPy教學模型 · 本機CPU",
              )}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t("路径", "Path", "路徑")}</th>
                <th scope="col">{t("总查询", "Total query", "總查詢")}</th>
              </tr>
            </thead>
            <tbody>
              {evidence.cache.map((row) => (
                <tr key={row.mode}>
                  <th scope="row">
                    {row.mode === "full"
                      ? t("完整重算", "Full recompute", "完整重算")
                      : row.mode === "rehash"
                        ? t("每次重算签名", "Rehash each query", "每次重算簽章")
                        : t(
                            "初始化固定签名",
                            "Freeze signature at initialization",
                            "初始化固定簽章",
                          )}
                  </th>
                  <td>{row.total} μs</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={s.boundary}>
            {t(
              "固定签名比每次重算签名快，但仍未胜过完整重算。不同片段的中位数不能相加成总时长；这里也没有测真实模型生成、GPU吞吐或线上SLA。",
              "Freezing the signature improves on rehashing, yet still loses to full recomputation. Component medians cannot be added into a total median. These runs do not measure real-model generation, GPU throughput or a production SLA.",
              "固定簽章比每次重算簽章快，但仍未勝過完整重算。不同片段中位數不能相加成總時長；此處也沒有測真實模型生成、GPU吞吐或線上SLA。",
            )}
          </p>
          <nav
            aria-label={t(
              "缓存计时阅读",
              "Cache timing reading",
              "快取計時閱讀",
            )}
          >
            {read("prefix-cache-admission")}
            {read("cache-cost-profile")}
          </nav>
          <p className={s.sources}>
            <a
              href={evidence.sources.cache.code}
              target="_blank"
              rel="noreferrer"
            >
              {t("固定代码", "Pinned code", "固定程式碼")} ↗
            </a>
            <a
              href={evidence.sources.cache.evidence}
              target="_blank"
              rel="noreferrer"
            >
              {t("原始记录", "Source records", "原始記錄")} ↗
            </a>
          </p>
        </div>
      </details>
    </section>
  );
}
