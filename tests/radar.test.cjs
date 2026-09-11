const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isoWeek, signals } = require('../src/utils/radar.cjs');
const config = {
  sources: [
    { id: 'agg', aggregator: true },
    { id: 'official', type: 'official' },
  ],
};
test('ISO weeks follow UTC year boundaries', () => {
  assert.equal(isoWeek('2026-01-01T12:00:00Z'), '2026-W01');
  assert.equal(isoWeek('2027-01-01T12:00:00Z'), '2026-W53');
});
test('duplicate title and publication day clusters choose official coverage', () => {
  const base = {
    title: 'Tool calling released',
    url: 'https://example.com/one',
    publishedAt: '2026-09-11T00:00:00Z',
  };
  const items = signals(
    [
      { ...base, id: '1', sourceId: 'agg' },
      { ...base, id: '2', sourceId: 'official' },
    ],
    config,
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].id, '2');
  assert.equal(items[0].coverage.length, 1);
  assert.equal(items[0].domain, 'agents');
  assert.equal(items[0].whyItMatters, undefined);
});
test('invalid sources and unsafe URLs fail instead of rendering', () => {
  assert.throws(
    () =>
      signals(
        [
          {
            sourceId: 'missing',
            url: 'https://example.com',
            title: 'A',
            publishedAt: '2026-09-11',
          },
        ],
        config,
      ),
    /Unknown/,
  );
  assert.throws(
    () =>
      signals(
        [{ sourceId: 'agg', url: 'javascript:alert(1)', title: 'A' }],
        config,
      ),
    /Unsafe/,
  );
});
