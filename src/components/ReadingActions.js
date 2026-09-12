import { translate } from '@lab/runtime/Translate';
import React, { useEffect, useState } from 'react';
import {
  parseInbox,
  emptyInbox,
  legacyKey,
  readingKey,
  toggleInbox,
} from '@site/src/utils/reading-inbox.mjs';
import { learningSymbols } from '@site/src/utils/learning-progress.mjs';
import styles from './ReadingActions.module.css';
let memory = emptyInbox();
let volatileStorage = false;
const eventName = 'hohoo-news-reading-change';
export function useNewsReading() {
  const [state, setState] = useState(emptyInbox);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const refresh = (event) => {
      if (
        event?.type === 'storage' &&
        event.key !== readingKey &&
        event.key !== null
      )
        return;
      try {
        if (!volatileStorage) {
          memory = parseInbox(
            localStorage.getItem(readingKey),
            localStorage.getItem(legacyKey),
          );
          if (localStorage.getItem(readingKey) === null)
            localStorage.setItem(readingKey, JSON.stringify(memory));
        }
        setError(volatileStorage);
      } catch {
        volatileStorage = true;
        setError(true);
      }
      setState({
        ...memory,
      });
      setReady(true);
    };
    const local = () => {
      setState({
        ...memory,
      });
      setError(volatileStorage);
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener(eventName, local);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(eventName, local);
    };
  }, []);
  const toggle = (field, id) => {
    try {
      if (!volatileStorage)
        memory = parseInbox(
          localStorage.getItem(readingKey),
          localStorage.getItem(legacyKey),
        );
    } catch {
      volatileStorage = true;
      setError(true);
    }
    memory = toggleInbox(memory, field, id);
    try {
      if (!volatileStorage)
        localStorage.setItem(readingKey, JSON.stringify(memory));
    } catch {
      volatileStorage = true;
      setError(true);
    }
    window.dispatchEvent(new Event(eventName));
  };
  return {
    ...state,
    ready,
    error,
    toggle,
  };
}
export default function ReadingActions({ id, en, compact = false }) {
  const state = useNewsReading();
  return (
    <div className={compact ? styles.compact : styles.actions}>
      <button
        type="button"
        disabled={!state.ready}
        aria-pressed={state.saved.includes(id)}
        onClick={() => state.toggle('saved', id)}>
        {learningSymbols.saved}{' '}
        {state.saved.includes(id)
          ? en
            ? 'Saved'
            : translate({
                id: 'ui.2d2cdabf29',
                message: '\u5DF2\u6536\u85CF',
              })
          : en
            ? 'Save for later'
            : translate({
                id: 'ui.a89b395637',
                message: '\u7A0D\u540E\u8BFB',
              })}
      </button>
      <button
        type="button"
        disabled={!state.ready}
        aria-pressed={state.read.includes(id)}
        onClick={() => state.toggle('read', id)}>
        {learningSymbols[state.read.includes(id) ? 'completed' : 'not-started']}{' '}
        {state.read.includes(id)
          ? en
            ? 'Read'
            : translate({
                id: 'ui.642ec8b596',
                message: '\u5DF2\u8BFB',
              })
          : en
            ? 'Mark as read'
            : translate({
                id: 'ui.504ecf732d',
                message: '\u6807\u8BB0\u5DF2\u8BFB',
              })}
      </button>
      {!compact && (
        <button
          type="button"
          disabled={!state.ready}
          aria-pressed={state.reading.includes(id)}
          onClick={() => state.toggle('reading', id)}>
          ◐{' '}
          {state.reading.includes(id)
            ? en
              ? 'Reading'
              : translate({
                  id: 'ui.120875d028',
                  message: '\u9605\u8BFB\u4E2D',
                })
            : en
              ? 'Start reading'
              : translate({
                  id: 'ui.f3be3e4b09',
                  message: '\u5F00\u59CB\u9605\u8BFB',
                })}
        </button>
      )}
      {state.error && (
        <small role="status">
          {en
            ? 'Storage unavailable; kept for this visit only.'
            : translate({
                id: 'ui.e33095f165',
                message:
                  '\u5B58\u50A8\u4E0D\u53EF\u7528\uFF0C\u4EC5\u5728\u672C\u6B21\u8BBF\u95EE\u4E2D\u4FDD\u7559\u3002',
              })}
        </small>
      )}
    </div>
  );
}
