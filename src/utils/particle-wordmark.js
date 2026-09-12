/** Canvas-only 3D point cloud. Text is sampled once, never drawn as a solid label. */
export function createWordmarkScene(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const mask = document.createElement('canvas');
  mask.width = 1000; mask.height = 250;
  const ink = mask.getContext('2d', { willReadFrequently: true });
  if (!ink) return null;
  ink.font = '500 230px Arial, sans-serif';
  ink.textAlign = 'center'; ink.textBaseline = 'middle';
  ink.fillStyle = '#fff';
  ink.fillText('Hohoo', 500, 137);
  const pixels = ink.getImageData(0, 0, 1000, 250).data;
  let seed = 813;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  const points = [];
  const step = window.innerWidth < 700 ? 3 : 2;
  for (let y = 8; y < 242; y += step) {
    for (let x = 8; x < 992; x += step) {
      if (pixels[(y * 1000 + x) * 4 + 3] < 100) continue;
      // Keep outlines denser, with luminous star clusters inside the strokes.
      const edge = [[-3, 0], [3, 0], [0, -3], [0, 3]].some(([dx, dy]) => pixels[((y + dy) * 1000 + x + dx) * 4 + 3] < 100);
      if (!edge && random() > 0.5) continue;
      const light = random();
      points.push({ x: x - 500 + random() * step, y: y - 137 + random() * step,
        z: (random() - 0.5) * 42, sx: 0, sy: 0, vx: 0, vy: 0,
        px: 0, py: 0, light, color: random() < 0.13 ? 2 : random() < 0.35 ? 1 : 0,
        radius: light > 0.985 ? 2.3 : light > 0.9 ? 1.1 : 0.35 + random() * 0.55 });
    }
  }
  const stars = Array.from({ length: 160 }, () => ({x: random(), y: random(), r: 0.3 + random(), alpha: 0.12 + random() * 0.4}));
  const sprites = ['#e8f6ff', '#6cbcf0', '#efb38d'].map(color => {
    const sprite = document.createElement('canvas'); sprite.width = 64; sprite.height = 64;
    const c = sprite.getContext('2d');
    const glow = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, '#fff'); glow.addColorStop(0.06, color);
    glow.addColorStop(0.17, color + 'a0'); glow.addColorStop(0.4, color + '28'); glow.addColorStop(1, color + '00');
    c.fillStyle = glow; c.fillRect(0, 0, 64, 64); return sprite;
  });
  const colors = ['#d3ecff', '#58a5d4', '#d69a74'];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1, height = 1, scale = 1, yaw = -0.08, pitch = 0.04;
  let paused = false, visible = true, frame = 0, last = 0, time = 0;
  let pointer = null, drag = null, impulseUntil = 0;

  function draw(advance = false) {
    ctx.clearRect(0, 0, width, height);
    for (const star of stars) {
      ctx.globalAlpha = star.alpha; ctx.fillStyle = '#a8cde0';
      ctx.beginPath(); ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2); ctx.fill();
    }
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const activePointer = pointer && !drag && performance.now() < impulseUntil;
    for (const p of points) {
      const rx = p.x * cy + p.z * sy;
      const rz = -p.x * sy + p.z * cy;
      const ry = p.y * cp - rz * sp;
      const depth = p.y * sp + rz * cp;
      const perspective = 1100 / (1100 + depth);
      const tx = width / 2 + rx * scale * perspective;
      const ty = height / 2 + ry * scale * perspective;
      if (advance) {
        if (activePointer) {
          const dx = tx + p.sx - pointer.x, dy = ty + p.sy - pointer.y;
          const distance = Math.hypot(dx, dy);
          const reach = Math.min(100, width * 0.15);
          if (distance < reach) {
            const force = (1 - distance / reach) * 3.8;
            p.vx += dx / Math.max(distance, 1) * force;
            p.vy += dy / Math.max(distance, 1) * force;
          }
        }
        p.vx = (p.vx - p.sx * 0.019) * 0.87;
        p.vy = (p.vy - p.sy * 0.019) * 0.87;
        p.sx += p.vx; p.sy += p.vy;
      }
      p.px = tx + p.sx; p.py = ty + p.sy;
      const alpha = 0.42 + p.light * 0.52;
      ctx.globalAlpha = alpha;
      const size = p.radius * Math.max(0.68, scale) * perspective;
      if (p.light > 0.97) {
        const bloom = size * (10 + Math.sin(time * 0.6 + p.x) * 1.2);
        ctx.drawImage(sprites[p.color], p.px - bloom / 2, p.py - bloom / 2, bloom, bloom);
      } else {
        ctx.fillStyle = colors[p.color];
        ctx.beginPath(); ctx.arc(p.px, p.py, size, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function canAnimate() { return !paused && !reduced.matches && visible && !document.hidden; }
  function tick(now) {
    if (now - last >= 32) { time += Math.min((now - last) / 1000, 0.05); last = now; draw(true); }
    frame = requestAnimationFrame(tick);
  }
  function sync() { cancelAnimationFrame(frame); draw(); if (canAnimate()) { last = performance.now(); frame = requestAnimationFrame(tick); } }
  function resize() {
    const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Fit all five letters, including rotated depth, in portrait and landscape.
    scale = Math.min(width * 0.88 / 680, height * 0.7 / 270);
    draw();
  }
  function local(event) { const r = canvas.getBoundingClientRect(); return { x: event.clientX - r.left, y: event.clientY - r.top }; }
  function down(event) {
    if (!event.isPrimary || event.button !== 0) return;
    drag = { id: event.pointerId, ...local(event) };
    canvas.setPointerCapture(event.pointerId); pointer = null;
  }
  function move(event) {
    const next = local(event);
    if (drag && drag.id === event.pointerId) {
      yaw += (next.x - drag.x) * 0.006; pitch = Math.max(-1.1, Math.min(1.1, pitch + (next.y - drag.y) * 0.004));
      drag = { id: event.pointerId, ...next }; draw();
    } else if (event.pointerType !== 'touch') {
      pointer = next; impulseUntil = performance.now() + 110;
    }
  }
  function up(event) {
    if (drag?.id !== event.pointerId) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    drag = null; pointer = null;
  }
  function leave() { if (!drag) pointer = null; }
  function reset() { yaw = -0.08; pitch = 0.04; pointer = null; for (const p of points) { p.sx = p.sy = p.vx = p.vy = 0; } draw(); }
  function scatter() {
    if (!canAnimate()) return;
    pointer = null;
    for (const p of points) { const a = random() * Math.PI * 2; p.vx += Math.cos(a) * 18; p.vy += Math.sin(a) * 18; }
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }); io.observe(canvas);
  const listeners = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: up, lostpointercapture: up, pointerleave: leave };
  for (const [name, listener] of Object.entries(listeners)) canvas.addEventListener(name, listener);
  document.addEventListener('visibilitychange', sync); reduced.addEventListener('change', sync);
  resize(); sync();
  return {
    setPaused(value) { paused = value; sync(); },
    rotate(x, y) { yaw += x; pitch = Math.max(-1.1, Math.min(1.1, pitch + y)); draw(); },
    reset, scatter,
    destroy() {
      cancelAnimationFrame(frame); ro.disconnect(); io.disconnect();
      for (const [name, listener] of Object.entries(listeners)) canvas.removeEventListener(name, listener);
      document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync);
    },
  };
}
