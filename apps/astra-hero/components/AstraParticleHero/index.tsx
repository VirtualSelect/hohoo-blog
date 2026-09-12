'use client';

import { useEffect, useRef, useState } from 'react';
import type { AstraScene, SceneStatus } from './scene';
import styles from './styles.module.css';

export default function AstraParticleHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<AstraScene | null>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [status, setStatus] = useState<SceneStatus | 'loading' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches);
    change(); query.addEventListener('change', change);
    try { setPaused(localStorage.getItem('huhohoo.astra-motion.v1') === 'paused'); } catch { /* Storage is optional. */ }
    return () => query.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    pausedRef.current = paused; sceneRef.current?.setPaused(paused);
  }, [paused]);
  useEffect(() => {
    const abort = new AbortController();
    setStatus('loading');
    import('./scene').then(({ createAstraScene }) => {
      if (abort.signal.aborted || !canvasRef.current || !sectionRef.current) return null;
      return createAstraScene(canvasRef.current, sectionRef.current, abort.signal, state => {
        if (!abort.signal.aborted) setStatus(state);
      });
    }).then(scene => {
      if (!scene) return;
      if (abort.signal.aborted) { scene.dispose(); return; }
      sceneRef.current = scene; scene.setPaused(pausedRef.current);
    }).catch(error => {
      if (!abort.signal.aborted) { console.error('Particle scene unavailable:', error); setStatus('error'); }
    });
    return () => { abort.abort(); sceneRef.current?.dispose(); sceneRef.current = null; };
  }, [attempt]);

  const ready = status === 'ready' || status === 'fallback';
  function toggle() {
    setPaused(value => {
      const next = !value;
      try { localStorage.setItem('huhohoo.astra-motion.v1', next ? 'paused' : 'playing'); } catch { /* Optional preference. */ }
      return next;
    });
  }
  function keydown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    const scene = sceneRef.current;
    if (!scene) return;
    switch (event.key) {
      case 'ArrowLeft': scene.rotate(-0.15, 0); break;
      case 'ArrowRight': scene.rotate(0.15, 0); break;
      case 'ArrowUp': scene.rotate(0, -0.12); break;
      case 'ArrowDown': scene.rotate(0, 0.12); break;
      case ' ': scene.scatter(); break;
      case 'Escape': case 'r': case 'R': scene.reset(); break;
      default: return;
    }
    event.preventDefault();
  }

  return (
    <section ref={sectionRef} className={styles.scrollSection} aria-label="Hohoo 粒子星群" data-reduced={reduced} data-status={status}>
      <div className={styles.sticky}>
        <div className={styles.eyebrow}><span>HOOHOO / AI LAB</span><span>LEARNING IN PUBLIC. BUILDING IN PUBLIC.</span></div>
        <div className={styles.canvasWrap}>
          <canvas ref={canvasRef} className={styles.canvas} tabIndex={ready ? 0 : -1} onKeyDown={keydown}
            role="img" aria-label="由五条立体粒子星臂组成的 Hohoo" aria-describedby="astra-help" />
          {!ready && <div className={styles.fallback} aria-hidden="true">Hohoo</div>}
          <h1 className="srOnly">Hohoo’s AI Lab — 探索智能，构建可能。</h1>
        </div>
        <div className={styles.bottom}>
          <div>
            <p id="astra-help" className={styles.help}>掠过拨散 · 按住旋转 · 滚动探索</p>
            <p className={styles.keyboard}>方向键旋转 / 空格拨散 / R 复位 · 触屏横向拖动</p>
          </div>
          <div className={styles.controls}>
            <button onClick={() => sceneRef.current?.rotate(-0.2, 0)} disabled={!ready} aria-label="向左旋转">←</button>
            <button onClick={() => sceneRef.current?.rotate(0.2, 0)} disabled={!ready} aria-label="向右旋转">→</button>
            <button onClick={() => sceneRef.current?.scatter()} disabled={!ready || reduced || paused}>拨散</button>
            <button onClick={() => sceneRef.current?.reset()} disabled={!ready}>复位</button>
            <button onClick={toggle} disabled={!ready || reduced} aria-pressed={paused || reduced}>
              {reduced ? '已减少动态效果' : paused ? '播放' : '暂停'}
            </button>
          </div>
        </div>
        {(status === 'error' || status === 'lost') && <p className={styles.error} role="status">
          交互视觉暂不可用，正文仍可阅读。 <button onClick={() => setAttempt(value => value + 1)}>重新加载视觉</button>
        </p>}
        <a href="#explore" className={styles.scrollLink}>继续探索 <span aria-hidden="true">↓</span></a>
      </div>
    </section>
  );
}
