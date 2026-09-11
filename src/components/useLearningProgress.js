import { useEffect, useState } from 'react';
import tracks from '@site/data/learning-paths.json';
import {
  learningKey,
  legacyLearningKey,
  emptyProgress,
  parseProgress,
  migrateProgress,
  updateProgress,
} from '@site/src/utils/learning-progress.mjs';
const ids = tracks.flatMap((t) => t.steps.map((s) => s.id));
const eventName = 'huhohoo-learning-change';
let memory = emptyProgress(),
  volatile = false;
function read() {
  if (volatile) return memory;
  try {
    const raw = localStorage.getItem(learningKey);
    memory =
      raw === null
        ? migrateProgress(localStorage.getItem(legacyLearningKey), ids)
        : parseProgress(raw, ids);
    if (raw === null) localStorage.setItem(learningKey, JSON.stringify(memory));
  } catch {
    volatile = true;
  }
  return memory;
}
export default function useLearningProgress() {
  const [state, setState] = useState(emptyProgress),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    const refresh = (e) => {
      if (e?.type === 'storage' && e.key !== learningKey && e.key !== null)
        return;
      setState({ ...read() });
      setError(volatile);
      setReady(true);
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener(eventName, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(eventName, refresh);
    };
  }, []);
  const update = (id, action) => {
    if (!ids.includes(id)) return;
    memory = updateProgress(read(), id, action);
    try {
      if (!volatile) localStorage.setItem(learningKey, JSON.stringify(memory));
    } catch {
      volatile = true;
    }
    window.dispatchEvent(new Event(eventName));
  };
  return { ...state, ready, error, update };
}
