const { test } = require('node:test');
const assert = require('node:assert/strict');
const { signals, verification } = require('../src/utils/radar.cjs');
const config = {
  sources: [
    { id: 'agg', aggregator: true },
    { id: 'official', type: 'official', hosts: ['official.example'] },
  ],
};
const item = {
  id: 'a',
  sourceId: 'agg',
  url: 'https://aggregator.example/item',
  title: 'A new model release',
  publishedAt: '2026-09-10T00:00:00Z',
};
test('aggregator and copied coverage never imply verification', () => {
  const [s] = signals(
    [item, { ...item, id: 'b', url: 'https://other.example/item' }],
    config,
  );
  assert.equal(s.sourceType, 'aggregator');
  assert.equal(s.verificationStatus, 'single-source');
  assert.equal(s.coverage.length, 1);
  assert.equal(
    verification({
      ...s,
      verification: { status: 'cross-checked', checkedAt: '2026-09-11' },
    }),
    'single-source',
  );
});
test('URL tracking deduplicates and an official report wins without fabricating fact checks', () => {
  const [s] = signals(
    [
      item,
      { ...item, id: 'b', url: item.url + '?utm_source=rss' },
      {
        ...item,
        id: 'c',
        sourceId: 'official',
        url: 'https://official.example/release',
      },
    ],
    config,
  );
  assert.equal(s.sourceType, 'official');
  assert.equal(s.verificationStatus, 'single-source');
  assert.equal(s.coverage.length, 2);
  assert.ok(s.eventId);
  assert.equal(s.eventId, s.clusterId);
  const [wrongHost] = signals([{ ...item, sourceId: 'official' }], config);
  assert.equal(wrongHost.sourceType, 'community');
});
test('verification needs provenance and evidence, not publication approval', () => {
  assert.equal(
    verification({ sourceType: 'official', status: 'approved' }),
    'single-source',
  );
  assert.equal(
    verification({
      sourceType: 'official',
      verification: {
        status: 'primary-confirmed',
        checkedBy: 'reviewer',
        checkedAt: '2026-09-11',
        evidence: [
          {
            url: 'https://official.example/release',
            kind: 'primary',
            note: 'Release specification checked',
          },
        ],
      },
    }),
    'primary-confirmed',
  );
});
test('planned experiments have design and no fabricated result or execution log', () => {
  for (const e of require('../data/experiments.json')) {
    assert.equal(e.status, 'planning');
    assert.ok(e.design.zh.hypothesis);
    assert.ok(e.design.en.variables.controlled);
    assert.equal(e.result, undefined);
    assert.deepEqual(e.experimentLog, []);
  }
});
test('search supports type and topic restrictions', async () => {
  const { searchEntries } = await import('../src/utils/search.mjs');
  const rows = [
    { id: 'a', type: 'paper', topic: 'llm', title: 'RAG' },
    { id: 'b', type: 'lab', topic: 'embodied-ai', title: 'Action' },
  ];
  assert.deepEqual(
    searchEntries(rows, 'type:paper RAG').map((e) => e.id),
    ['a'],
  );
  assert.deepEqual(
    searchEntries(rows, 'topic:embodied').map((e) => e.id),
    ['b'],
  );
  assert.equal(searchEntries(rows, 'type:note').length, 0);
});
test('later official discovery is retained as coverage without changing saved IDs', () => {
  const { attachCoverage } = require('../src/utils/radar.cjs');
  const records = attachCoverage(
    [item],
    [
      {
        ...item,
        id: 'b',
        sourceId: 'official',
        url: 'https://official.example/release',
      },
    ],
    config,
  );
  assert.equal(records[0].id, 'a');
  assert.equal(records[0].coverage.length, 1);
  const [event] = signals(records, config);
  assert.equal(event.id, 'b');
  assert.equal(event.eventId, records[0].eventId);
  assert.equal(event.verificationStatus, 'single-source');
});
test('reading inbox migration preserves old saves without inventing dates', async () => {
  const { parseInbox, toggleInbox } = await import(
    '../src/utils/reading-inbox.mjs'
  );
  const id = '0123456789abcdefabcd';
  const old = parseInbox(null, JSON.stringify({ saved: [id], read: [id] }));
  assert.deepEqual(old.savedAt, {});
  assert.deepEqual(old.read, [id]);
  const reading = toggleInbox(old, 'reading', id);
  assert.deepEqual(reading.read, []);
  assert.deepEqual(reading.reading, [id]);
  assert.deepEqual(
    parseInbox(JSON.stringify({ ...reading, version: 99 })).saved,
    [],
  );
  assert.throws(() => parseInbox('bad'));
});
