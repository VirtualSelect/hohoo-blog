import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseProgress,
  migrateProgress,
  updateProgress,
  emptyProgress,
} from '../src/utils/learning-progress.mjs';
test('legacy saves and completions migrate without invented timestamps', () => {
  const state = migrateProgress(
    JSON.stringify({
      saved: ['first-call', 'first-call', 'unknown'],
      completed: ['first-call'],
    }),
    ['first-call'],
  );
  assert.deepEqual(state.saved, ['first-call']);
  assert.deepEqual(state.items['first-call'], { status: 'completed' });
  assert.equal(state.lastOpened, undefined);
});
test('corrupt or future schemas reset safely and invalid entries are excluded', () => {
  assert.deepEqual(parseProgress('{', []), emptyProgress());
  assert.deepEqual(parseProgress('{"version":2}', []), emptyProgress());
  assert.deepEqual(
    parseProgress(
      JSON.stringify({
        version: 1,
        saved: ['bad'],
        items: { bad: { status: 'reading' } },
        lastOpened: 'bad',
      }),
      ['ok'],
    ),
    emptyProgress(),
  );
});
test('reading, completion and saving remain independent and resume is recorded', () => {
  const state = updateProgress(
    updateProgress(emptyProgress(), 'a', 'saved'),
    'a',
    'reading',
    '2026-09-11T00:00:00Z',
  );
  assert.equal(state.lastOpened, 'a');
  assert.equal(state.items.a.status, 'reading');
  assert.deepEqual(updateProgress(state, 'a', 'completed').saved, ['a']);
  assert.equal(updateProgress(state, 'a', 'saved').items.a.status, 'reading');
});
