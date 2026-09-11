const {test} = require('node:test');
const assert = require('node:assert/strict');
const {collectEntries} = require('../plugins/learning-index.cjs');
const content = docs => ({'docusaurus-plugin-content-docs': {default: {loadedVersions: [{docs}]}}});
const doc = (step = 'first-call', date = '2026-09-11', extra = {}) => ({
  id: step, title: 'Test article', description: 'Test description', permalink: '/en/docs/test',
  frontMatter: {learning_step: step, published_at: date, reading_minutes: 12, ...extra},
});
test('only published route articles appear, newest first, with the actual locale URL', () => {
  const result = collectEntries(content([
    {id: 'overview', frontMatter: {}},
    doc('first-call', '2026-09-10'),
    doc('structured-output', '2026-09-11'),
    doc('blog-rag', '2026-09-11', {draft: true}),
    doc('evaluation', '2026-09-11', {unlisted: true}),
  ]));
  assert.deepEqual(result.map(entry => entry.stepId), ['structured-output', 'first-call']);
  assert.equal(result[0].permalink, '/en/docs/test');
  assert.equal(result[0].minutes, 12);
});
test('empty content has no fabricated entries', () => assert.deepEqual(collectEntries({}), []));
test('invalid metadata and duplicate route assignments fail the build', () => {
  for (const date of ['', '2026-02-30', 'invalid', '2026-9-1']) {
    assert.throws(() => collectEntries(content([doc('first-call', date)])), /published_at/);
  }
  for (const minutes of [0, -1, '15', NaN]) {
    assert.throws(() => collectEntries(content([doc('first-call', '2026-09-11', {reading_minutes: minutes})])), /reading_minutes/);
  }
  assert.throws(() => collectEntries(content([doc('unknown')])), /Unknown/);
  assert.throws(() => collectEntries(content([doc(), doc()])), /Duplicate/);
});
