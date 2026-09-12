import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useLocation } from '@docusaurus/router';

export const MotionContext = createContext(false);
const storageKey = 'huhohoo.motion.v1';

export function ParticleProvider({ children }) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const { i18n } = useDocusaurusContext();
  const en = i18n.currentLocale === 'en';
  const { pathname } = useLocation();
  const isHome = /^\/(?:en\/?)?$/.test(pathname);
  useEffect(() => {
    try { setPaused(localStorage.getItem(storageKey) === 'paused'); } catch {}
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  function toggle() {
    const next = !paused;
    setPaused(next);
    try { localStorage.setItem(storageKey, next ? 'paused' : 'playing'); } catch {}
  }
  return (
    <MotionContext.Provider value={paused || reduced}>
      {children}
      {isHome && <button className="hh-motion-toggle" onClick={toggle} disabled={reduced} aria-pressed={paused || reduced}>
        <span aria-hidden="true">{paused || reduced ? '▷' : 'Ⅱ'}</span>{' '}
        {reduced ? (en ? 'Reduced motion' : '已减少动态效果') : paused ? (en ? 'Resume particles' : '播放粒子') : (en ? 'Pause particles' : '暂停粒子')}
      </button>}
    </MotionContext.Provider>
  );
}

export default function ParticleField({ orbit = false }) {
  const ref = useRef(null);
  const paused = useContext(MotionContext);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 1, height = 1, frame = 0, last = 0, phase = 0, visible = true;
    let color = '#55dce5';
    // Fixed seeds keep resize and static-motion rendering deterministic.
    const mobile = window.matchMedia('(max-width: 700px)').matches;
    const count = orbit ? (mobile ? 1300 : 2600) : (mobile ? 540 : 1200);
    const points = Array.from({ length: count }, (_, i) => ({
      x: ((i * 137.508) % 997) / 997,
      y: ((i * 73.31) % 991) / 991,
      size: 0.5 + (i % 5) * 0.3,
    }));
    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      const drift = phase * 0.12;
      // Open, asymmetric filaments: no closed orbits or regular point grid.
      function flow(t, strand, spread = 0) {
        const bend = Math.sin(t * 6.2 + drift + strand * 0.35);
        const envelope = Math.sin(Math.PI * t);
        return [
          width * (0.02 + t * 0.96) + Math.sin(t * 9 - drift) * spread * width * 0.025,
          height * (0.66 - t * 0.38 + bend * 0.24 + strand * 0.045) + spread * height * 0.085 * envelope,
        ];
      }
      if (orbit) {
        // Translucent filaments unify the point cloud into a soft flowing form.
        for (let strand = -3; strand <= 3; strand++) {
          ctx.globalAlpha = 0.06;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          for (let step = 0; step <= 80; step++) {
            const [x, y] = flow(step / 80, strand);
            if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      points.forEach((p, i) => {
        let x, y, alpha, radius = p.size * 0.7;
        if (orbit) {
          const t = (p.x + phase * 0.009) % 1;
          const strand = (i % 7) - 3;
          const spread = Math.sin(p.y * Math.PI * 2) * Math.cos(i * 2.4);
          [x, y] = flow(t, strand, spread);
          const envelope = Math.sin(Math.PI * t);
          alpha = envelope * (0.18 + p.y * 0.64);
          radius *= 0.5 + envelope * 0.8;
        } else if (i % 3 !== 0) {
          const t = (p.x + phase * 0.003) % 1;
          const spread = (p.y - 0.5);
          x = t * width;
          y = height * (0.76 - 0.36 * t + Math.sin(t * 7 + drift * 0.5) * 0.12);
          y += spread * height * (0.12 + Math.sin(t * Math.PI) * 0.18);
          alpha = Math.sin(t * Math.PI) * (0.08 + p.y * 0.3);
          radius *= 0.75;
        } else {
          x = p.x * width;
          y = (p.y * height + phase * (1 + i % 3)) % height;
          alpha = 0.12 + (i % 7) * 0.055;
        }
        if (i % 11 === 0) {
          ctx.globalAlpha = alpha * 0.07;
          ctx.beginPath();
          ctx.arc(x, y, radius * 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    function tick(now) {
      if (now - last >= 33) { phase += Math.min((now - last) / 1000, 0.05); draw(); last = now; }
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame);
      draw();
      if (!paused && !motion.matches && !document.hidden && visible) frame = requestAnimationFrame(tick);
    }
    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = width * ratio; canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    }
    function theme() {
      color = getComputedStyle(canvas).getPropertyValue('--hh-particle').trim();
      draw();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const themeObserver = new MutationObserver(theme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    intersection.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);
    resize(); theme(); sync();
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect(); themeObserver.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
    };
  }, [orbit, paused]);
  return <canvas ref={ref} className={orbit ? 'hh-particle-orbit' : 'hh-particle-background'} aria-hidden="true" />;
}
