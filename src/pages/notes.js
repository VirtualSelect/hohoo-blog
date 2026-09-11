import React, { useState } from 'react';
import Layout from '@theme/Layout';
import {
  useContent,
  useEnglish,
  ContentRows,
} from '@site/src/components/ContentUI';
export default function Notes() {
  const en = useEnglish();
  const { entries } = useContent();
  const [query, setQuery] = useState('');
  const notes = entries.filter((e) => e.type === 'note');
  return (
    <Layout
      title={en ? 'Notes' : '短笔记'}
      description="围绕一个概念或问题的短笔记。">
      <main className="hh-page">
        <p className="hh-eyebrow">KNOWLEDGE / NOTES</p>
        <h1>{en ? 'One concept, one note.' : '一个概念，一篇短笔记。'}</h1>
        <p className="hh-lead">
          {en
            ? 'Short explanations with sources and connections.'
            : '记录概念、来源与适用边界，把零散理解连接起来。'}
        </p>
        {!!notes.length && (
          <label>
            {en ? 'Search notes' : '搜索笔记'}{' '}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        )}
        <ContentRows
          items={notes.filter((n) =>
            [n.title, n.description, ...(n.aliases || [])]
              .join(' ')
              .toLowerCase()
              .includes(query.toLowerCase()),
          )}
          empty="暂无已发布短笔记。"
        />
      </main>
    </Layout>
  );
}
