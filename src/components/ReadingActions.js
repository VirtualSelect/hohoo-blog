import React, { useEffect, useState } from 'react';
import {
  parseReadingState,
  readingKey,
  toggleReadingState,
} from '@site/src/utils/reading-state.mjs';
import { learningSymbols } from '@site/src/utils/learning-progress.mjs';
import styles from './ReadingActions.module.css';

let memory = { saved: [], read: [] };
let volatileStorage = false;
const eventName = 'hohoo-news-reading-change';
export function useNewsReading() {
  const [state, setState] = useState({ saved: [], read: [] });
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
        if (!volatileStorage)
          memory = parseReadingState(localStorage.getItem(readingKey));
        setError(volatileStorage);
      } catch {
        volatileStorage = true;
        setError(true);
      }
      setState({ ...memory });
      setReady(true);
    };
    const local = () => {
      setState({ ...memory });
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
        memory = parseReadingState(localStorage.getItem(readingKey));
    } catch {
      volatileStorage = true;
      setError(true);
    }
    memory = toggleReadingState(memory, field, id);
    try {
      if (!volatileStorage)
        localStorage.setItem(readingKey, JSON.stringify(memory));
    } catch {
      volatileStorage = true;
      setError(true);
    }
    window.dispatchEvent(new Event(eventName));
  };
  return { ...state, ready, error, toggle };
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
            : '已收藏'
          : en
            ? 'Save for later'
            : '稍后读'}
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
            : '已读'
          : en
            ? 'Mark as read'
            : '标记已读'}
      </button>
      {state.error && (
        <small role="status">
          {en
            ? 'Storage unavailable; kept for this visit only.'
            : '存储不可用，仅在本次访问中保留。'}
        </small>
      )}
    </div>
  );
}
