import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const json = (path) => JSON.parse(read(path));
const digest = (value) => createHash("sha256").update(value).digest("hex");
const fingerprint = (value) => digest(JSON.stringify(value));
const fixture = "apps/web/tests/fixtures/";
const folder = "reports/section-search-review/";
const searchSource = "apps/web/lib/section-search.mjs";
const corpus = json(fixture + "section-search-corpus-v1.json");
const protocol = json(fixture + "section-search-comparison-v2.json");
const baseline = json("reports/section-search-comparison-v2.json");
const holdout = json(folder + "holdout.json");
const holdoutHash =
  "1cdf765a07c48266b134d94283b1a7ac32bea6f6c7f3b7ca60164ba791ca833d";
const pinnedCommit = "d0e650ef1198fe39743badd671f6a308dbc1b49f";
const pinnedFile = "apps/web/tests/fixtures/section-search-corpus-v1.json";
const corpusLines = read(pinnedFile).split(/\r?\n/);
const byId = new Map(corpus.map((p) => [p.id, p]));
const bySuffix = new Map(corpus.map((p) => [p.id.split(":").at(-1), p]));
assert.equal(bySuffix.size, corpus.length);
assert.equal(fingerprint(holdout), holdoutHash);
assert.equal(fingerprint(corpus), holdout.corpusHash);
assert.equal(fingerprint(protocol), baseline.protocolHash);
assert.equal(baseline.corpusHash, holdout.corpusHash);
assert.equal(baseline.algorithmHash, holdout.algorithmHash);

// Fixed curation, including comparison passages for questions with few or no results.
const choices = {
  "lexical-gap": [
    "19e775a321babe4b42ce",
    "e0263f69e2f828393651",
    "67c06f893fcfb9d66bf2",
  ],
  "group-size-cost": [
    "39e6d06089e3a6cf5428",
    "e819886563ed39abf216",
    "03f48c23dc0c378fde41",
  ],
  "flagged-stale-samples": [
    "ac6a093e186662a8d55d",
    "e01388bfea0c8fc577ff",
    "25eab8af0616400e5c52",
  ],
  "check-in-silence": [
    "6142d536215bd0782808",
    "e01388bfea0c8fc577ff",
    "25eab8af0616400e5c52",
  ],
  "absent-payment-deployment": [
    "464f006d0eb7595e08ea",
    "24b988c331b066b9c824",
    "7815b3da996c56fa9458",
  ],
  "absent-hardware-safety": [
    "c6e695e9da6070ade99c",
    "a077b8a892834685d4c3",
    "3b002d71d2edebb81c48",
  ],
  "absent-packed-benchmark": [
    "7aa9bb745ac7b601bf40",
    "d80e2acb192202c4910c",
    "9e887ac7b9e4e4788da7",
  ],
  "absent-answer-quality": [
    "85c28bd2dc26861125da",
    "1d119273f33282e03bcb",
    "e0decc1c88c53ae90e69",
  ],
  "absent-calibration": [
    "1ae5c21a2b50044f7c75",
    "4243f6edb8a171c285d4",
    "e6fe8588b4a051358c33",
  ],
  "remote-duplication": [
    "1d26796473efbbc7ddbf",
    "98abd02f2433cd79d5cf",
    "fe6f6eef478528944680",
  ],
  "residual-age": [
    "f9b2f83a597f40b602c8",
    "3ba3afe0264aa995ab00",
    "03f48c23dc0c378fde41",
  ],
  "release-packet-order": [
    "4fa13d0a39f08e7a5e46",
    "468fc36f1292bf56be5f",
    "f17759bb9af5e3236b59",
  ],
};
const challenges = [
  ...baseline.summary.baseline.misses,
  ...baseline.summary.baseline.noAnswerWithCandidates,
];
assert(challenges.every((id) => id in choices));
function shuffle(ids, scope) {
  const key = (id) => digest(`review-v2/form-1/${scope}/${id}`);
  return [...ids].sort((a, b) =>
    key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0,
  );
}
function anonymousText(text) {
  return text
    .replace(/^固定版本代码 · 原始证据 · 实验档案 /, "")
    .replace(/ 配套代码 · 原始记录与审计 · 实验档案$/, "");
}
function archiveLink(passage) {
  const line =
    corpusLines.findIndex((line) =>
      line.includes('"id": "' + passage.id + '"'),
    ) + 1;
  assert(line > 0);
  return `https://github.com/VirtualSelect/hohoo-blog/blob/${pinnedCommit}/${pinnedFile}#L${line}`;
}
const questions = shuffle(Object.keys(choices), "questions").map((id, i) => {
  const number = `Q${String(i + 1).padStart(2, "0")}`;
  const row = baseline.rows.find((q) => q.id === id);
  const list = shuffle(choices[id], id).map((suffix, j) => {
    const passage = bySuffix.get(suffix);
    assert(passage, suffix);
    const text = anonymousText(passage.text);
    assert(passage.text.includes(text));
    assert(!/https?:\/\/|\/docs\/|github\.com|hohoo/i.test(text), suffix);
    const rank =
      row.baseline.retrieved.findIndex((p) => p.id === passage.id) + 1;
    const labeled = row.expected.some(
      (e) => e.href === passage.href && text.includes(e.quote),
    );
    const equivalents = row.baseline.retrieved.flatMap((result, index) => {
      const other = byId.get(result.id);
      return other.id !== passage.id && anonymousText(other.text) === text
        ? [{ passage: other, rank: index + 1 }]
        : [];
    });
    return {
      slot: `${number}-${"ABC"[j]}`,
      passage,
      text,
      rank,
      labeled,
      equivalents,
    };
  });
  assert.equal(new Set(list.map((x) => x.passage.id)).size, 3);
  assert.equal(
    new Set(list.map((x) => x.text.trim().replace(/\s+/gu, " "))).size,
    3,
    `${id} 有重复的展示文字`,
  );
  if (row.baseline.retrieved.length)
    assert(
      list.some(
        (x) => x.rank === 1 || x.equivalents.some((other) => other.rank === 1),
      ),
    );
  if (row.expected.length) assert(list.some((x) => x.labeled));
  if (!challenges.includes(id))
    assert(
      row.baseline.firstRelevantRank >= 1 &&
        row.baseline.firstRelevantRank <= 5,
    );
  return { number, row, list };
});
const keyHash = fingerprint(
  questions.map(({ number, row, list }) => [
    number,
    row.id,
    list.map((x) => [
      x.slot,
      x.passage.id,
      x.passage.contentHash,
      x.rank,
      x.labeled,
      x.equivalents.map((other) => [other.passage.id, other.rank]),
    ]),
  ]),
);
assert.equal(
  keyHash,
  "947051b480c646aa063e374b823a0c6c0130724155c30301f3c89836e25c4cb6",
  "映射与已发行题面不一致",
);
const answerLine = /^- (Q\d\d-[ABC]) \| ([^|\n]+?) \| ([^\n]+)$/gm;
const pending = "- $1 | 待填 | 待填";
function form() {
  const parts = [
    "# 段落判读表",
    "",
    "请保存一份副本，在每个段落下的两处「待填」作答。顺序已打乱。同一道题可以有多段能回答，也可以一段都没有。请逐段独立阅读，先不查原文、搜索或与他人讨论。",
    "",
    "判定填「足以回答」「只能解释边界」或「无关」。前两类请抄一段能支持判断的原话，至少六个文字或数字。若只说明实验边界，选「只能解释边界」。",
    "",
    "选「无关」时，按「段内短语 → 题中所求」填写第三栏。箭头左侧从段落中摘取它实际讨论的对象；右侧从题目中摘取所求对象或条件。两侧各至少三个文字或数字。完成后把副本交给主持人。",
    "",
  ];
  for (const { number, row, list } of questions) {
    parts.push(`## ${number}　${row.query}`, "");
    for (const { slot, text } of list)
      parts.push(
        `**${slot.at(-1)}**`,
        "",
        `> ${text}`,
        "",
        `- ${slot} | 待填 | 待填`,
        "",
      );
  }
  return parts.join("\n");
}
function checkHoldout() {
  const previous = json("reports/section-search-evaluation-v1.json");
  const seenDocs = new Set(),
    seenQuestions = new Set();
  for (const row of [...previous.rows, ...baseline.rows]) {
    seenQuestions.add(row.query);
    for (const evidence of [
      ...row.expected,
      ...(row.retrieved || []),
      ...(row.baseline?.retrieved || []),
      ...(row.bodyCoverage?.retrieved || []),
    ])
      seenDocs.add(evidence.href.split("#")[0]);
  }
  const selected = new Set();
  for (const q of holdout.questions) {
    const p = byId.get(q.pointer);
    assert(p && p.text.includes(q.quote), q.id);
    assert(
      !seenQuestions.has(q.query) && !seenDocs.has(p.href.split("#")[0]),
      q.id,
    );
    assert(!selected.has(p.documentId), q.id);
    selected.add(p.documentId);
    assert(
      q.support.length
        ? q.support.every((id) => byId.has(id)) && q.support.includes(p.id)
        : q.missing,
      q.id,
    );
  }
}
function holdoutForm() {
  return [
    "# 正文检索留出题",
    "",
    "请在冻结语料中独立查找每题所求的证据。能回答时，记下段落编号和原话；找不到直接依据时，记下缺少的资料或测量条件。请在提交判定前保留自己的初稿。",
    "",
    ...holdout.questions.flatMap(({ query }, index) => [
      `## H${String(index + 1).padStart(2, "0")}　${query}`,
      "",
      "判读记录",
      "",
    ]),
  ].join("\n");
}

function checkSearchFingerprint() {
  assert.equal(
    digest(read(searchSource).replace(/\r\n/g, "\n")),
    holdout.algorithmHash,
    "当前检索源码与冻结基线不一致，请使用固定版本的源码运行。",
  );
}

function reveal(path) {
  const submitted = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  assert.equal(
    submitted.replace(answerLine, pending).trimEnd(),
    form().trimEnd(),
    "题面被改动，请只填写待填处。",
  );
  const answers = new Map(
    [...submitted.matchAll(answerLine)].map(([, slot, verdict, reason]) => [
      slot,
      { verdict: verdict.trim(), reason: reason.trim() },
    ]),
  );
  const key = [];
  for (const { number, row, list } of questions) {
    key.push(
      `\n## ${number} · ${row.id}`,
      `\n${row.query}`,
      `\nv2 标注：${row.expected.map((e) => e.quote).join("／") || "语料缺少直接依据"}`,
    );
    for (const { slot, passage, text, rank, labeled, equivalents } of list) {
      const response = answers.get(slot);
      assert(
        response &&
          ["足以回答", "只能解释边界", "无关"].includes(response.verdict),
        `${slot} 尚缺判定`,
      );
      if (response.verdict === "无关") {
        const parts = response.reason.split("→").map((part) => part.trim());
        assert(
          parts.length === 2 &&
            parts[0] !== parts[1] &&
            parts.every(
              (part) => (part.match(/[\p{L}\p{N}]/gu) || []).length >= 3,
            ),
          `${slot} 请填写两段不同的短语，各至少三个文字或数字`,
        );
        assert(
          text.includes(parts[0]) && row.query.includes(parts[1]),
          `${slot} 箭头两侧请分别从摘录与题目逐字引用`,
        );
      } else {
        assert(
          (response.reason.match(/[\p{L}\p{N}]/gu) || []).length >= 6,
          `${slot} 引文至少六个文字或数字`,
        );
        assert(
          text.includes(response.reason),
          `${slot} 所填引文未逐字出现在摘录中`,
        );
      }
      key.push(
        `\n- ${slot} · ${response.verdict} · ${rank ? `原前五第 ${rank} 名` : "不在原前五"} · ${labeled ? "v2 指定证据" : "v2 未指定"} · [${passage.title} / ${passage.heading || "导言"}](${archiveLink(passage)})`,
      );
      for (const other of equivalents)
        key.push(
          `  - 同文摘录还见于原前五第 ${other.rank} 名 · [${other.passage.title} / ${other.passage.heading || "导言"}](${archiveLink(other.passage)})`,
        );
    }
  }
  console.log(
    `# 段落复核揭盲\n\n初判文件 SHA-256：${digest(submitted)}\n\n映射 SHA-256：${keyHash}\n${key.join("\n")}`,
  );
}
checkHoldout();
const [mode, path, ...extra] = process.argv.slice(2);
const expectsPath = mode === "--reveal" || mode === "--evaluate-holdout";
const usage =
  "用法：--check / --print-form / --reveal 已填判读表.md / --print-holdout / --holdout-review-template / --evaluate-holdout 人工复核稿.json";
assert(!extra.length && (expectsPath ? path : !path), usage);
if (mode === "--print-form") process.stdout.write(form());
else if (mode === "--print-holdout") process.stdout.write(holdoutForm());
else if (mode === "--holdout-review-template") {
  console.log(
    JSON.stringify(
      {
        holdoutHash,
        reviewedAt: "",
        questions: holdout.questions.map(({ id }) => ({
          id,
          evidence: [],
          missing: "",
        })),
      },
      null,
      2,
    ),
  );
} else if (mode === "--check") {
  assert.equal(
    read(folder + "participant.md").replace(/\r\n/g, "\n"),
    form(),
    "已发行题面与复现结果不一致",
  );
  assert.equal(
    read(folder + "holdout-questions.md").replace(/\r\n/g, "\n"),
    holdoutForm(),
    "留出题面与冻结题目不一致",
  );
  checkSearchFingerprint();
  console.log(
    `${questions.length} 题，${questions.length * 3} 段；映射 ${keyHash}；留出题 ${holdout.questions.length} 道，冻结 ${holdoutHash}。`,
  );
} else if (mode === "--reveal") reveal(path);
else if (mode === "--evaluate-holdout") {
  checkSearchFingerprint();
  const review = JSON.parse(readFileSync(path, "utf8"));
  const { evaluateReviewedHoldout } = await import(
    "./section-search-holdout.mjs"
  );
  const { summary, rows } = evaluateReviewedHoldout({
    holdout,
    holdoutHash,
    corpus,
    review,
  });
  console.log(
    JSON.stringify(
      {
        version: 1,
        classification: "review-supplied-offline-holdout",
        locale: holdout.locale,
        topK: holdout.topK,
        holdoutHash,
        corpusHash: holdout.corpusHash,
        algorithmHash: holdout.algorithmHash,
        reviewHash: fingerprint(review),
        reviewedAt: review.reviewedAt,
        summary,
        rows,
      },
      null,
      2,
    ),
  );
} else throw new Error(usage);
