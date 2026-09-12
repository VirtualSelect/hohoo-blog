import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEnglish } from '@site/src/components/ContentUI';
export default function SearchBar() {
  const en = useEnglish(),
    [open, setOpen] = useState(false),
    [Dialog, setDialog] = useState(null),
    [error, setError] = useState(false);
  const trigger = useRef(null);
  useEffect(() => {
    const handle = (e) => {
      if (
        e.type === 'hohoo-search' ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handle);
    window.addEventListener('hohoo-search', handle);
    return () => {
      window.removeEventListener('keydown', handle);
      window.removeEventListener('hohoo-search', handle);
    };
  }, []);
  useEffect(() => {
    if (open && !Dialog) {
      setError(false);
      import('@site/src/components/SearchDialog')
        .then((m) => setDialog(() => m.default))
        .catch(() => setError(true));
    }
  }, [open, Dialog]);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  return (
    <>
      <button
        type="button"
        className="hh-search-trigger"
        ref={trigger}
        onClick={() => setOpen(true)}
        aria-label={en ? 'Search site' : '全站搜索'}
        aria-haspopup="dialog">
        {en ? 'Search' : '搜索'} <kbd>⌘ / Ctrl K</kbd>
      </button>
      {open &&
        Dialog &&
        createPortal(<Dialog onClose={close} />, document.body)}
      {open && !Dialog && (
        <span role="status">
          {error ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTimeout(() => setOpen(true), 0);
              }}>
              {en ? 'Retry search' : '重试搜索'}
            </button>
          ) : en ? (
            'Loading…'
          ) : (
            '加载中…'
          )}
        </span>
      )}
    </>
  );
}
