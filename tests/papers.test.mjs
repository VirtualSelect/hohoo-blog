import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
test('paper sources, reading IDs and experiment links remain consistent',()=>{
 const papers=read('../data/papers.json'),projects=read('../data/experiments.json');
 assert.equal(new Set(papers.map(p=>p.id)).size,papers.length);
 assert.equal(new Set(papers.map(p=>p.slug)).size,papers.length);
 for(const p of papers){
  assert.equal(new URL(p.url).origin,'https://arxiv.org');
  assert.ok(p.url.includes(p.id.slice(6)));
  assert.ok(projects.some(project=>project.id===p.project&&project.paper===p.slug));
  for(const language of ['zh','en']) for(const key of ['question','method','evidence','boundary','prompt']) assert.ok(p[language][key]?.trim());
 }
 for(const project of projects) assert.ok(papers.some(p=>p.slug===project.paper));
});
