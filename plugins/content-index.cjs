const manifest = require('../scripts/i18n/check.cjs').resolveManifest();
const { translationStatus } = require('../src/utils/localization.cjs');
const digests = require('../data/radar-digests.json');
const projects = require('../data/projects.json');
const experiments = require('../data/experiments.json');
const notes = require('../data/notes.json');
const papers = require('../data/papers.json');
const dateOnly = (value) =>
  value
    ? (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10)
    : undefined;
function customEntries(prefix = '') {
  return [
    ...digests
      .filter((d) => d.status === 'published')
      .map((d) => ({
        ...d,
        type: 'radar-digest',
        date: dateOnly(d.publishedAt),
        href: prefix + '/radar/weekly/' + d.week,
      })),
    ...projects.map((p) => ({ ...p, href: prefix + '/projects/' + p.slug })),
    ...experiments.map((e) => ({
      ...e,
      id: 'lab:' + e.id,
      slug: e.id,
      type: 'lab',
      title: e.zh,
      titleEn: e.en,
      description: e.goalZh,
      descriptionEn: e.goalEn,
      href: prefix + '/labs/' + e.id,
    })),
    ...notes
      .filter((n) => n.status === 'published')
      .map((n) => ({ ...n, type: 'note', href: prefix + '/notes/' + n.slug })),
    ...papers.map((p) => ({
      ...p,
      type: 'paper',
      status: 'to-read',
      domain: p.categories[0],
      href: prefix + '/papers#' + p.slug,
      description: p.zh.question,
      descriptionEn: p.en.question,
    })),
  ];
}
function collectContent(allContent, prefix = '') {
  const locale = prefix.slice(1) || 'zh-CN';
  const entries = customEntries(prefix).map((e) => {
    const title =
      locale === 'en'
        ? e.titleEn || (e.type === 'lab' ? e.en : e.title)
        : locale === 'zh-TW'
          ? e.titleTw || e.title
          : e.title;
    const description =
      locale === 'en'
        ? e.descriptionEn || e.description
        : locale === 'zh-TW'
          ? e.descriptionTw || e.description
          : e.description;
    return {
      ...e,
      title,
      description,
      locale,
      sourceLocale: 'zh-CN',
      ...(e.type === 'note'
        ? { translationStatus: translationStatus(manifest[e.id], locale) }
        : {}),
    };
  });
  for (const content of Object.values(
    allContent['docusaurus-plugin-content-docs'] || {},
  )) {
    for (const version of content.loadedVersions || [])
      for (const doc of version.docs || []) {
        const f = doc.frontMatter || {};
        if (
          f.draft ||
          f.unlisted ||
          f.landing ||
          f.status === 'planning' ||
          doc.id === 'introduction' ||
          ['ai-apps/index', 'llm/index', 'embodied-ai/index'].includes(doc.id)
        )
          continue;
        entries.push({
          id: 'doc:' + doc.id,
          locale,
          sourceLocale: 'zh-CN',
          localization: manifest['doc:' + doc.id],
          translationStatus: translationStatus(
            manifest['doc:' + doc.id],
            locale,
          ),
          type: 'doc',
          title: doc.title,
          description: doc.description,
          href: doc.permalink,
          domain: f.domain,
          status: f.status || 'published',
          date: dateOnly(f.published_at || f.date),
          updated: dateOnly(f.updated),
          minutes: f.reading_minutes,
          stepId: f.learning_step,
          related: f.related || [],
          prerequisites: f.prerequisites || [],
        });
      }
  }
  for (const content of Object.values(
    allContent['docusaurus-plugin-content-blog'] || {},
  ))
    for (const post of content.blogPosts || []) {
      const m = post.metadata || {},
        f = m.frontMatter || {};
      if (f.draft || f.unlisted) continue;
      entries.push({
        id: 'blog:' + (f.slug || m.permalink.split('/').filter(Boolean).pop()),
        locale,
        sourceLocale: 'zh-CN',
        translationStatus: translationStatus(
          manifest[
            'blog:' + (f.slug || m.permalink.split('/').filter(Boolean).pop())
          ],
          locale,
        ),
        type: 'blog',
        title: m.title,
        description: m.description,
        href: m.permalink,
        status: 'published',
        date: dateOnly(m.date),
        minutes: m.readingTime
          ? Math.max(1, Math.ceil(m.readingTime))
          : undefined,
        related: f.related || [],
      });
    }
  validate(entries);
  return entries;
}
function validate(entries) {
  const ids = new Set(),
    routes = new Set();
  for (const e of entries) {
    if (ids.has(e.id) || routes.has(e.href))
      throw Error('Duplicate content: ' + e.id);
    ids.add(e.id);
    routes.add(e.href);
    if (!e.href || !e.title) throw Error('Missing content fields: ' + e.id);
    if (
      e.date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
        !Number.isFinite(Date.parse(e.date)) ||
        new Date(e.date).toISOString().slice(0, 10) !== e.date)
    )
      throw Error('Invalid date: ' + e.id);
    if (
      e.domain &&
      !['ai-apps', 'llm', 'embodied-ai', 'engineering', 'meta'].includes(
        e.domain,
      )
    )
      throw Error('Invalid domain: ' + e.id);
    if (
      ![
        'planning',
        'planned',
        'inconclusive',
        'learning',
        'building',
        'experiment',
        'published',
        'archived',
        'production',
        'running',
        'completed',
        'to-read',
        'reading',
        'read',
      ].includes(e.status)
    )
      throw Error('Invalid status: ' + e.id);
    if (
      e.type === 'lab' &&
      e.status === 'completed' &&
      (!e.result || !e.method)
    )
      throw Error('Completed lab requires evidence: ' + e.id);
    for (const field of ['repo', 'demo', 'url'])
      if (e[field] && !/^https?:\/\//.test(e[field]))
        throw Error('Invalid external URL: ' + e.id);
  }
  for (const e of entries)
    for (const id of [...(e.related || []), ...(e.prerequisites || [])])
      if (!ids.has(id)) throw Error('Unknown related content: ' + id);
}
function activity(entries) {
  return entries
    .filter(
      (e) =>
        e.date &&
        ['published', 'production', 'completed', 'read'].includes(e.status) &&
        e.type !== 'radar-item',
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
module.exports = function (context) {
  const prefix =
    context.i18n.currentLocale === context.i18n.defaultLocale
      ? ''
      : '/' + context.i18n.currentLocale;
  return {
    name: 'content-index',
    async loadContent() {
      return customEntries(prefix).filter((e) =>
        ['project', 'lab', 'note'].includes(e.type),
      );
    },
    async contentLoaded({ content, actions }) {
      for (const entry of content) {
        const data = await actions.createData(
          entry.type + '-' + entry.slug + '.json',
          JSON.stringify(entry),
        );
        actions.addRoute({
          path: entry.href,
          component: '@site/src/components/ContentDetail.js',
          exact: true,
          modules: { entry: data },
        });
      }
    },
    allContentLoaded({ allContent, actions }) {
      const entries = collectContent(allContent, prefix);
      // Detail bodies stay in route chunks, not every page's global data.
      const compact = entries.map(
        ({
          sections,
          design,
          experimentLog,
          architecture,
          screenshots,
          decisions,
          metrics,
          zh,
          en,
          ...entry
        }) => entry,
      );
      actions.setGlobalData({
        entries: compact,
        activity: activity(
          compact.filter((e) => e.translationStatus !== 'MISSING'),
        ),
      });
    },
  };
};
module.exports.collectContent = collectContent;
module.exports.validate = validate;
module.exports.activity = activity;
