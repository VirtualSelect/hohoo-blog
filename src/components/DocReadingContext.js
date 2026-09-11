import React, { useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
import { useDoc } from '@docusaurus/theme-common/internal';
import { usePluginData } from '@docusaurus/useGlobalData';
import tracks from '@site/data/learning-paths.json';
import { Related, useEnglish } from './ContentUI';
import useLearningProgress from './useLearningProgress';
import { learningSymbols } from '@site/src/utils/learning-progress.mjs';
export default function DocReadingContext({ position }) {
  const { metadata, frontMatter: f } = useDoc();
  const en = useEnglish();
  const { entries } = usePluginData('learning-index');
  const state = useLearningProgress();
  const recorded = useRef(null);
  const step = f.learning_step;
  const track = tracks.find((t) => t.steps.some((s) => s.id === step));
  const index = track?.steps.findIndex((s) => s.id === step);
  useEffect(() => {
    if (
      position === 'header' &&
      state.ready &&
      step &&
      recorded.current !== step
    ) {
      recorded.current = step;
      state.update(
        step,
        state.items[step]?.status === 'completed' ? 'completed' : 'reading',
      );
    }
  }, [step, state.ready, position]);
  if (position === 'header') {
    if (!f.domain && !step) return null;
    return (
      <div className="hh-reading-context">
        <p className="hh-eyebrow">
          {f.domain || track?.domain}
          {track && ' / ' + track.brand}
        </p>
        {metadata.description && <p>{metadata.description}</p>}
        <p className="hh-meta">
          {f.difficulty}
          {f.reading_minutes && ' · ' + f.reading_minutes + ' MIN'}
          {f.updated && ' · UPDATED ' + f.updated}
          {track && ' · PART ' + (index + 1) + ' / ' + track.steps.length}
        </p>
        <Related
          ids={f.prerequisites || []}
          title={en ? 'Prerequisites' : '前置知识'}
        />
      </div>
    );
  }
  return (
    <>
      {track && (
        <section className="hh-reading-context">
          <h2>{en ? 'You are here' : '当前学习位置'}</h2>
          <p className="hh-eyebrow">
            {track.brand} / {en ? track.en : track.title}
          </p>
          <ol start={Math.max(0, index - 1) + 1}>
            {track.steps.slice(Math.max(0, index - 1), index + 2).map((s) => {
              const article = entries.find((e) => e.stepId === s.id);
              return (
                <li
                  key={s.id}
                  aria-current={s.id === step ? 'step' : undefined}>
                  {learningSymbols[state.items[s.id]?.status || 'not-started']}{' '}
                  {s.id === step ? (
                    en ? (
                      s.en
                    ) : (
                      s.title
                    )
                  ) : (
                    <Link to={article?.permalink || '/learning#step-' + s.id}>
                      {en ? s.en : s.title}
                    </Link>
                  )}
                  {!article && ' · PLANNED'}
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            disabled={!state.ready}
            aria-pressed={state.items[step]?.status === 'completed'}
            onClick={() =>
              state.update(
                step,
                state.items[step]?.status === 'completed'
                  ? 'reading'
                  : 'completed',
              )
            }>
            ✓ {en ? 'Completed' : '已完成'}
          </button>
          {state.error && (
            <p role="status">
              {en
                ? 'Storage unavailable; this visit only.'
                : '存储不可用，仅本次访问保留。'}
            </p>
          )}
        </section>
      )}
      <Related ids={f.related || []} />
    </>
  );
}
