import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createSectionSearcher,
  passageExcerpt,
} from "../lib/section-search.mjs";
import { buildSearchSections } from "../lib/search-sections-build.mjs";

function prose(html) {
  return buildSearchSections(
    [{ metadata: { permalink: "/docs/example" }, frontMatter: {}, html }],
    [
      {
        id: "doc:example",
        href: "/docs/example",
        type: "doc",
        status: "published",
        title: "Example",
      },
    ],
  );
}

test("disclosure questions stay attached to answers and do not leak to adjacent prose", () => {
  const question = "小练习：864 行降到 432 行，能否说快了 50%？";
  const answer =
    "不能。少投影不等于所有开销都减少，原始计时仍需保留无缓存基线。";
  const sections = prose(`<h2 id="comparison">Comparison</h2>
    <p>这是折叠区之前的普通正文，应该保持自己的独立来源与文本编号。</p>
    <details><summary>小练习：<code>864</code> 行降到 <em>432</em> 行，能否说快了 50%？</summary>
    <p>${answer}</p></details>
    <p>这是折叠区之后的普通正文，不应该沿用练习中的问题或混入它的回答。</p>`);
  assert.equal(sections.length, 3);
  assert.equal(sections[1].context, question);
  assert.equal(sections[1].text, question + "\n" + answer);
  assert.equal(sections[1].href, "/docs/example#comparison");
  assert.equal(sections[0].context, undefined);
  assert.equal(sections[2].context, undefined);
  assert(!sections[2].text.includes(question));
  const short = prose(
    `<details><summary>${question}</summary><p>不能。</p></details>`,
  );
  assert.equal(short[0].text, question + "\n不能。");
});

test("nested and adjacent disclosures retain their own question on every bounded chunk", () => {
  const parent = "首先确认比较的是哪一类结果？";
  const child = "为什么？";
  const sections = prose(`<h2 id="context">Context</h2>
    <details><summary>${parent}</summary><p>${"父层解释。".repeat(8)}</p>
    <details><summary>${child}</summary><p>${"这是需要结合原题阅读的长答案。".repeat(90)}</p></details>
    <p>${"回到父层解释。".repeat(8)}</p></details>
    <details><summary>下一题</summary><p>${"另一题应当有独立的问题上下文。".repeat(3)}</p></details>
    <p>${"已经离开所有折叠区。".repeat(4)}</p>`);
  const children = sections.filter((p) => p.context === parent + "\n" + child);
  assert(children.length > 1);
  assert(
    children.every((p) => p.text.startsWith(parent + "\n" + child + "\n")),
  );
  assert(sections.every((p) => p.text.length <= 900));
  assert.equal(sections.filter((p) => p.context === parent).length, 2);
  assert.equal(sections.at(-2).context, "下一题");
  assert.equal(sections.at(-1).context, undefined);
});

test("excluded markup cannot supply question answers, headings or active content", () => {
  const sections = prose(`<h2 id="real">Real source</h2>
    <details><summary>为什么 &lt;标记&gt; 和 A&amp;B 需要按原文理解？</summary>
    <pre><code><h2 id="fake">CODE_SENTINEL</h2></code></pre>
    <table><tr><td>TABLE_SENTINEL</td></tr></table>
    <script>SCRIPT_SENTINEL</script><style>STYLE_SENTINEL</style><video>VIDEO_SENTINEL</video>
    <p>这里是实际的正文解释。<br>下一行仍属于同一问题，代码和表格不提供可引用证据。</p></details>
    <details><summary>EMPTY_QUESTION_SENTINEL</summary><pre><code>NO_ANSWER_SENTINEL</code></pre></details>`);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].context, "为什么 <标记> 和 A&B 需要按原文理解？");
  assert.equal(sections[0].href, "/docs/example#real");
  assert.match(sections[0].text, /正文解释。 下一行/);
  assert(!JSON.stringify(sections).includes("SENTINEL"));
  assert.throws(
    () =>
      prose(
        `<details><summary>${"长".repeat(900)}</summary><p>不能。</p></details>`,
      ),
    /context exceeds passage budget/,
  );
});

test("published translated prose keeps real anchors and excludes code, tables, plans and fallbacks", () => {
  const entry = {
    id: "doc:test",
    href: "/docs/test",
    type: "doc",
    status: "published",
    title: "Cache",
    domain: "llm",
  };
  const doc = {
    metadata: { permalink: entry.href },
    frontMatter: {},
    html: '<h2 id="measured">Actual result</h2><p>Cache &amp; buffer are measured separately in this experiment.</p><pre><code>SECRET_CODE_SENTINEL</code></pre><table><tr><td>TABLE_SENTINEL</td></tr></table><h3 id="limits">Limits</h3><p>These results only apply to the tested local environment.</p>',
  };
  const passages = buildSearchSections([doc], [entry]);
  assert.equal(passages.length, 2);
  assert.equal(passages[0].href, "/docs/test#measured");
  assert.equal(passages[1].heading, "Actual result / Limits");
  assert.match(passages[0].text, /Cache & buffer/);
  assert(!JSON.stringify(passages).includes("SENTINEL"));
  for (const variant of [
    { ...doc, sourceFallback: true },
    { ...doc, frontMatter: { landing: true } },
  ])
    assert.deepEqual(buildSearchSections([variant], [entry]), []);
  for (const variant of [
    { ...entry, status: "planning" },
    { ...entry, translationStatus: "MISSING" },
  ])
    assert.deepEqual(buildSearchSections([doc], [variant]), []);
});

test("Chinese body terms, English terms, filters and empty matches are handled without a model", () => {
  const passages = [
    {
      id: "a",
      documentId: "java",
      title: "Java 会话",
      heading: "读取超时",
      text: "读取超时不能证明服务端没有处理请求，不能直接重试。",
      type: "doc",
      topic: "ai-apps",
      href: "/docs/java#timeout",
    },
    {
      id: "b",
      documentId: "cache",
      title: "Cache costs",
      heading: "Profiling",
      text: "Cache reuse can be slower when copy costs exceed saved projection work.",
      type: "doc",
      topic: "llm",
      href: "/docs/cache#profile",
    },
  ];
  const search = createSectionSearcher(passages);
  assert.equal(search("读取超时")[0].documentId, "java");
  assert.equal(search("CACHE slower topic:llm")[0].documentId, "cache");
  assert.deepEqual(search("读取超时 topic:rag"), []);
  assert.deepEqual(search("读取超时 type:radar"), []);
  assert.deepEqual(search("没有任何对应证据的独角兽"), []);
  assert.deepEqual(search("topic:llm"), []);
  assert.deepEqual(search(""), []);
  assert.deepEqual(
    createSectionSearcher([
      { ...passages[0], title: "Supernova interferometer", heading: "Limits" },
    ])("supernova interferometer"),
    [],
  );
  const excerpt = passageExcerpt(
    "x".repeat(300) + " 读取超时 " + "x".repeat(400),
    "读取超时",
  );
  assert.match(excerpt, /读取超时/);
  assert(excerpt.length < 245);
});

for (const locale of ["zh-CN", "zh-TW", "en"]) {
  test(
    locale +
      ": generated passage citations resolve to published article headings",
    () => {
      const data = JSON.parse(
        fs.readFileSync(
          new URL(`../generated/${locale}.json`, import.meta.url),
          "utf8",
        ),
      );
      const passages = JSON.parse(
        fs.readFileSync(
          new URL("../public" + data.sectionSearchUrl, import.meta.url),
          "utf8",
        ),
      );
      assert(passages.length > 100);
      const exercise = passages.find(
        (p) =>
          p.documentId === "doc:llm/prefix-cache-admission" &&
          /864/.test(p.context || "") &&
          /432/.test(p.context),
      );
      assert(
        exercise,
        "The actual cache exercise must include its original question.",
      );
      assert(exercise.text.startsWith(exercise.context + "\n"));
      assert.match(exercise.text, /6\.723/);
      assert(
        fs.statSync(
          new URL("../public" + data.sectionSearchUrl, import.meta.url),
        ).size < 1_000_000,
      );
      const docs = new Map(
        data.documents.map((doc) => [doc.metadata.permalink, doc]),
      );
      for (const passage of passages) {
        const [url, anchor] = passage.href.split("#");
        const doc = docs.get(url);
        assert(
          doc && !doc.sourceFallback && !doc.frontMatter.landing,
          passage.href,
        );
        assert(
          !url.includes("/news/") && ["doc", "blog"].includes(passage.type),
        );
        assert(passage.text.length <= 900);
        if (anchor)
          assert(
            doc.headings.some((heading) => heading.id === anchor),
            passage.href,
          );
      }
      const search = createSectionSearcher(passages);
      const query =
        locale === "en"
          ? "cache slower"
          : locale === "zh-TW"
            ? "快取 成本"
            : "缓存 更慢";
      const results = search(query);
      assert(
        results.length &&
          results.some((result) => /cache|kv-/.test(result.href)),
      );
      const counts = new Map();
      for (const result of results)
        counts.set(result.documentId, (counts.get(result.documentId) || 0) + 1);
      assert([...counts.values()].every((count) => count <= 2));
    },
  );
}
