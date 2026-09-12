import React, { useEffect, useRef, useState } from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

export default function AstraParticleHero({ en = false }) {
  const t = (zh, english) => en ? english : zh;
  const pathUrl = useBaseUrl('/img/hohoo-particles.svg');
  const canvas = useRef(null), section = useRef(null), scene = useRef(null), pausedRef = useRef(false);
  const [status, setStatus] = useState('loading');
  const [paused, setPaused] = useState(false), [reduced, setReduced] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches);
    change(); query.addEventListener('change', change);
    try { setPaused(localStorage.getItem('huhohoo.astra-motion.v1') === 'paused'); } catch {}
    return () => query.removeEventListener('change', change);
  }, []);
  useEffect(() => { pausedRef.current = paused; scene.current?.setPaused(paused); }, [paused]);
  useEffect(() => {
    const abort = new AbortController();
    setStatus('loading');
    import('./scene').then(({ createAstraScene }) => {
      if (abort.signal.aborted) return null;
      return createAstraScene(canvas.current, section.current, abort.signal,
        value => { if (!abort.signal.aborted) setStatus(value); },
        { pathUrl, navHeight: 72, fadeOnScroll: true });
    }).then(value => {
      if (!value) return;
      if (abort.signal.aborted) { value.dispose(); return; }
      scene.current = value; value.setPaused(pausedRef.current);
    }).catch(() => { if (!abort.signal.aborted) setStatus('error'); });
    return () => { abort.abort(); scene.current?.dispose(); scene.current = null; };
  }, [attempt, pathUrl]);
  const ready = status === 'ready' || status === 'fallback';
  function toggle() {
    const next = !paused; setPaused(next);
    try { localStorage.setItem('huhohoo.astra-motion.v1', next ? 'paused' : 'playing'); } catch {}
  }
  function keydown(event) {
    const current = scene.current;
    if (!current) return;
    switch (event.key) {
      case 'ArrowLeft': current.rotate(-.15, 0); break;
      case 'ArrowRight': current.rotate(.15, 0); break;
      case 'ArrowUp': current.rotate(0, -.12); break;
      case 'ArrowDown': current.rotate(0, .12); break;
      case ' ': current.scatter(); break;
      case 'r': case 'R': case 'Escape': current.reset(); break;
      default: return;
    }
    event.preventDefault();
  }
  return <section ref={section} className={styles.scrollSection} data-reduced={reduced} data-status={status} aria-label={t('Hohoo 粒子星群', 'Hohoo particle galaxy')}>
    <div className={styles.sticky}>
      <div className={styles.eyebrow}><span>ABOUT / HOOHOO</span><span>LEARNING IN PUBLIC. BUILDING IN PUBLIC.</span></div>
      <h1 className={styles.hidden}>{t('关于 Hohoo', 'About Hohoo')}</h1>
      <div className={styles.canvasWrap}>
        <canvas ref={canvas} className={styles.canvas} tabIndex={ready ? 0 : -1} onKeyDown={keydown} role="img"
          aria-label={t('由五条立体粒子星臂组成的 Hohoo', 'Hohoo formed by five particle arms')} aria-describedby="about-astra-help" />
        {!ready && <span className={styles.fallback} aria-hidden="true">Hohoo</span>}
      </div>
      <p id="about-astra-help" className={styles.hidden}>{t('拖动或方向键旋转，空格拨散，R 复位。', 'Drag or use arrow keys to rotate. Space scatters; R resets.')}</p>
      <div className={styles.bottom}>
        <p>{t('从 Java 到 AI，把好奇心变成实践。', 'From Java to AI. Turning curiosity into practice.')}</p>
        <div className={styles.controls}>
          <button disabled={!ready || reduced || paused} onClick={() => scene.current?.scatter()}>{t('拨散', 'Scatter')}</button>
          <button disabled={!ready} onClick={() => scene.current?.reset()}>{t('复位', 'Reset')}</button>
          <button disabled={!ready || reduced} aria-pressed={paused || reduced} onClick={toggle}>{reduced ? t('已减少动态效果', 'Reduced motion') : paused ? t('播放', 'Play') : t('暂停', 'Pause')}</button>
        </div>
      </div>
      {['error', 'lost'].includes(status) && <p className={styles.error} role="status">{t('视觉暂不可用，正文仍可阅读。', 'The visual is unavailable. You can still read below.')} <button onClick={() => setAttempt(v => v + 1)}>{t('重试', 'Retry')}</button></p>}
      <a className={styles.scrollLink} href="#about-content">{t('了解我', 'Get to know me')} ↓</a>
    </div>
  </section>;
}
