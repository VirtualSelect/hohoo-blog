const test = require('node:test');
const assert = require('node:assert/strict');
const {
  translationStatus,
  writingEntries,
  localePrefix,
} = require('../src/utils/localization.cjs');
const { projectSignal } = require('../src/utils/radar-locale.cjs');
const { resolveManifest, revision } = require('../scripts/i18n/check.cjs');
test('Locale routes and translation availability are explicit', () => {
  assert.equal(localePrefix('zh-CN'), '');
  assert.equal(localePrefix('zh-TW'), '/zh-TW');
  assert.equal(translationStatus(null, 'en'), 'MISSING');
  assert.equal(translationStatus(null, 'zh-CN'), 'ORIGINAL');
  const m = {
    sourceRevision: 'a',
    translations: { en: { sourceRevision: 'a', status: 'AI_TRANSLATED' } },
  };
  assert.equal(translationStatus(m, 'en'), 'AI_TRANSLATED');
  assert.equal(
    translationStatus({ ...m, sourceRevision: 'b' }, 'en'),
    'OUTDATED',
  );
});
test('Writing excludes plans, external signals and missing translations', () => {
  const rows = [
    { id: 'doc', type: 'doc', status: 'published', date: '2026-09-12' },
    {
      id: 'blog',
      type: 'blog',
      status: 'published',
      translationStatus: 'MISSING',
    },
    { id: 'paper', type: 'paper', status: 'to-read' },
    { id: 'news', type: 'radar', status: 'published' },
    { id: 'draft', type: 'doc', status: 'planning' },
  ];
  assert.deepEqual(
    writingEntries(rows).map((x) => x.id),
    ['doc'],
  );
});
test('Radar projects only active locale, retains original title and multilingual keywords', () => {
  const signal = {
    title: 'Original title',
    summary: 'Original summary',
    translations: {
      en: { title: 'English title', summary: 'English summary' },
      zh: { title: '中文標題', summary: '中文摘要' },
    },
  };
  const en = projectSignal(signal, 'en');
  assert.equal(en.summary, 'English summary');
  assert.equal(en.originalTitle, 'Original title');
  assert.equal(en.translations, undefined);
  assert.ok(en.searchText.includes('中文標題'));
  const tw = projectSignal(signal, 'zh-TW');
  assert.equal(tw.translationStatus, 'ORIGINAL');
  assert.equal(tw.summary, 'Original summary');
});
test('Missing source and translation files are advisory and never crash publishing', () => {
  assert.equal(revision('missing-test-file.md'), null);
  const m = resolveManifest({
    sample: {
      file: 'missing-test-file.md',
      translations: {
        en: { file: 'missing-test-file.md', status: 'REVIEWED' },
      },
    },
  });
  assert.equal(m.sample.translations.en.status, 'MISSING');
});
