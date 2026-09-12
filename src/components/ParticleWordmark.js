import React, { useContext, useEffect, useRef, useState } from 'react';
import { MotionContext } from './ParticleField';
import { createWordmarkScene } from '../utils/particle-wordmark';
import styles from './ParticleWordmark.module.css';

export default function ParticleWordmark({ en }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const paused = useContext(MotionContext);
  const [ready, setReady] = useState(false);
  const t = (zh, english) => en ? english : zh;

  useEffect(() => {
    const scene = createWordmarkScene(canvasRef.current);
    sceneRef.current = scene;
    setReady(Boolean(scene));
    return () => { scene?.destroy(); sceneRef.current = null; };
  }, []);
  useEffect(() => { sceneRef.current?.setPaused(paused); }, [paused]);

  function onKeyDown(event) {
    const actions = {
      ArrowLeft: () => sceneRef.current?.rotate(-0.16, 0),
      ArrowRight: () => sceneRef.current?.rotate(0.16, 0),
      ArrowUp: () => sceneRef.current?.rotate(0, -0.12),
      ArrowDown: () => sceneRef.current?.rotate(0, 0.12),
      ' ': () => sceneRef.current?.scatter(),
      r: () => sceneRef.current?.reset(),
      Escape: () => sceneRef.current?.reset(),
    };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  }

  return (
    <section className={styles.scene} aria-label={t('Hohoo 交互粒子星群', 'Hohoo interactive constellation')}>
      <div className={styles.caption}><span>HOOHOO’S AI LAB</span><span>LEARNING IN PUBLIC · BUILDING IN PUBLIC</span></div>
      <div className={styles.stage}>
        {!ready && <span className={styles.fallback}>Hohoo</span>}
        <canvas ref={canvasRef} className={styles.canvas} tabIndex={0}
          role="img" aria-label={t('由星光粒子组成的 Hohoo', 'Hohoo formed entirely from star particles')}
          aria-describedby="wordmark-help" onKeyDown={onKeyDown} />
      </div>
      <div className={styles.controls}>
        <p id="wordmark-help">{t('掠过拨散 · 按住拖动旋转 · 自动聚回', 'Hover to scatter · Drag to rotate · Returns to form')}<br />
          <span>{t('触屏横向拖动；键盘方向键旋转，空格拨散，R 复位', 'Touch: drag horizontally. Keyboard: arrows rotate, Space scatters, R resets.')}</span>
        </p>
        <div className={styles.buttons}>
          <button onClick={() => sceneRef.current?.rotate(-0.22, 0)} disabled={!ready} aria-label={t('向左旋转粒子', 'Rotate particles left')}>←</button>
          <button onClick={() => sceneRef.current?.rotate(0.22, 0)} disabled={!ready} aria-label={t('向右旋转粒子', 'Rotate particles right')}>→</button>
          <button onClick={() => sceneRef.current?.scatter()} disabled={!ready || paused}>{t('拨散', 'Scatter')}</button>
          <button onClick={() => sceneRef.current?.reset()} disabled={!ready}>{t('复位', 'Reset')}</button>
        </div>
      </div>
    </section>
  );
}
