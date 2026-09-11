import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseReadingState,toggleReadingState} from '../src/utils/reading-state.mjs';
const id='0123456789abcdefabcd';
test('stored state excludes malformed IDs and duplicates',()=>{
  assert.deepEqual(parseReadingState(JSON.stringify({saved:[id,id,'bad',null],read:'bad'})),{saved:[id],read:[]});
  assert.deepEqual(parseReadingState('null'),{saved:[],read:[]});
  assert.throws(()=>parseReadingState('broken JSON'));
});
test('saving and reading are independent reversible actions',()=>{
  const initial={saved:[],read:[]};
  const saved=toggleReadingState(initial,'saved',id);
  const read=toggleReadingState(saved,'read',id);
  assert.deepEqual(toggleReadingState(read,'saved',id),{saved:[],read:[id]});
  assert.deepEqual(toggleReadingState(saved,'saved',id),initial);
  assert.deepEqual(initial,{saved:[],read:[]});
  assert.equal(toggleReadingState(initial,'other',id),initial);
});
