import test from 'node:test';
import assert from 'node:assert/strict';
import {timelineGroups} from '../src/utils/news-timeline.mjs';

test('groups newest entries first without changing input and respects page limit', () => {
  const items = [
    {id:'a', publishedAt:'2026-09-09T10:00:00Z'},
    {id:'b', publishedAt:'2026-09-10T10:00:00Z'},
    {id:'c', publishedAt:'2026-09-10T12:00:00Z'},
  ];
  assert.deepEqual(timelineGroups(items, 2).map(([date, rows]) => [date, rows.map(r => r.id)]), [['2026-09-10', ['c','b']]]);
  assert.equal(items[0].id, 'a');
});

test('weekly grouping uses Monday UTC across the year boundary', () => {
  const items = [
    {id:'a', publishedAt:'2026-01-04T23:59:59Z'},
    {id:'b', publishedAt:'2026-01-05T00:00:00Z'},
    {id:'c', publishedAt:'2025-12-29T00:00:00Z'},
  ];
  assert.deepEqual(timelineGroups(items, 12, 'week').map(([date, rows]) => [date, rows.map(r => r.id)]), [['2026-01-05',['b']], ['2025-12-29',['a','c']]]);
  assert.deepEqual(timelineGroups([]), []);
});
