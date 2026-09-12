import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createPathTexture } from './pathTexture';
import { createParticles, createBackgroundStars, createSharedUniforms } from './particles';
import { createSimulation } from './simulation';

export type SceneStatus = 'ready' | 'fallback' | 'lost';
export interface AstraScene {
  setPaused(value: boolean): void;
  rotate(x: number, y: number): void;
  scatter(): void;
  reset(): void;
  dispose(): void;
}

export async function createAstraScene(canvas: HTMLCanvasElement, section: HTMLElement, signal: AbortSignal,
  onStatus: (status: SceneStatus) => void, options: { pathUrl?: string; navHeight?: number; fadeOnScroll?: boolean } = {}): Promise<AstraScene> {
  const path = await createPathTexture(options.pathUrl || '/hohoo.svg', signal);
  if (signal.aborted) { path.dispose(); throw new DOMException('Aborted', 'AbortError'); }
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (error) { path.dispose(); throw error; }
  renderer.setClearColor(0x050505, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.info.autoReset = false;
  const mobileQuery = window.matchMedia('(max-width: 700px), (pointer: coarse)');
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const initialMobile = mobileQuery.matches;
  const maxCount = initialMobile ? 8192 : 32768;
  let mobile = initialMobile;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.z = 15; camera.updateMatrixWorld();
  const shared = createSharedUniforms(path);
  const particles = createParticles(maxCount, path, shared);
  const stars = createBackgroundStars(initialMobile);
  scene.add(stars.points, particles.points);
  const simulation = createSimulation(renderer, particles.side, maxCount, particles.metadataTexture, shared);
  particles.uniforms.uUseSimulation.value = simulation ? 1 : 0;
  if (simulation) particles.uniforms.uSimulation.value = simulation.texture;
  // HDR is used only where renderable half-float buffers are available.
  const target = new THREE.WebGLRenderTarget(1, 1, { type: simulation ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: false });
  const composer = new EffectComposer(renderer, target);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.95, 0.58, 0.92);
  bloom.enabled = Boolean(simulation);
  const output = new OutputPass();
  composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(output);

  // All vectors, matrices, sample buffers and handlers are allocated once.
  const euler = new THREE.Euler(0.015, -0.035, 0, 'YXZ');
  const intervals = new Float32Array(240);
  let width = 1, height = 1, sectionTop = 0, sectionTravel = 1;
  let dpr = 1, quality = 0, particleCount = maxCount, bloomScale = 0.7;
  let paused = false, reduced = reducedQuery.matches, visible = false, lost = false, disposed = false;
  let frame = 0, last = 0, renderCount = 0, sampleCount = 0, cpuMs = 0, accumulator = 0;
  let yaw = -0.035, pitch = 0.015, velocityX = 0, velocityY = 0;
  let dragId = -1, dragX = 0, dragY = 0, dragTime = 0;
  let pointerActive = false, pointerDeadline = 0, scrollTarget = 0, scrollCurrent = 0, burst = 0;
  let slowFrames = 0, qualityTimer = 0;

  function rotation() {
    euler.set(pitch, yaw, 0, 'YXZ');
    shared.uFieldRotation.value.makeRotationFromEuler(euler);
    shared.uFieldInverse.value.copy(shared.uFieldRotation.value).invert();
  }
  function scrollUniforms() {
    const p = reduced ? 0 : scrollCurrent;
    shared.uScatterProgress.value = p * p * 0.72;
    shared.uShapeProgress.value = 1 - p * p * 0.62;
    shared.uRotationProgress.value = p * 0.8;
    if (options.fadeOnScroll) {
      canvas.style.opacity = String(1 - p * p);
      section.style.setProperty('--astra-opacity', canvas.style.opacity);
    }
  }
  function draw(delta = 0) {
    renderer.info.reset(); rotation(); scrollUniforms();
    if (simulation && delta > 0) {
      accumulator = Math.min(accumulator + delta, 1 / 30);
      // Bounded fixed-step integration; this loop iterates at most twice, never over particles.
      while (accumulator >= 1 / 60) {
        simulation.step(1 / 60, burst);
        accumulator -= 1 / 60;
      }
      particles.uniforms.uSimulation.value = simulation.texture;
    }
    composer.render(delta); renderCount++;
  }
  function active() { return !disposed && !lost && visible && !document.hidden && !paused && !reduced; }
  function qualitySettings() {
    const base = mobile ? Math.min(maxCount, 8192) : maxCount;
    particleCount = Math.max(2048, Math.floor(base / (2 ** quality)));
    particles.geometry.setDrawRange(0, particleCount);
    if (simulation) simulation.uniforms.uCount.value = particleCount;
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2, quality === 2 ? 1 : quality === 1 ? 1.25 : 2);
    dpr = Math.min(dpr, renderer.capabilities.maxTextureSize / Math.max(width, height));
    bloomScale = (mobile ? 0.35 : 0.7) / (quality === 2 ? 1.5 : 1);
    renderer.setPixelRatio(dpr); renderer.setSize(width, height, false);
    composer.setPixelRatio(dpr); composer.setSize(width, height);
    bloom.setSize(Math.max(1, Math.round(width * dpr * bloomScale)), Math.max(1, Math.round(height * dpr * bloomScale)));
    particles.uniforms.uDpr.value = dpr; particles.uniforms.uViewportHeight.value = height;
  }
  function degrade() {
    qualityTimer = 0;
    if (disposed || quality >= 2) return;
    quality++; qualitySettings(); sampleCount = 0; slowFrames = 0;
  }
  function tick(now: number) {
    if (!active()) { frame = 0; return; }
    const elapsed = now - last;
    const delta = Math.min(elapsed / 1000, 1 / 30); last = now;
    const start = performance.now();
    shared.uTime.value += delta;
    if (dragId < 0) {
      yaw += velocityX * delta; pitch = THREE.MathUtils.clamp(pitch + velocityY * delta, -1.15, 1.15);
      const damping = Math.exp(-5 * delta); velocityX *= damping; velocityY *= damping;
    }
    scrollCurrent += (scrollTarget - scrollCurrent) * (1 - Math.exp(-7 * delta));
    const targetStrength = pointerActive && now < pointerDeadline && dragId < 0 ? 1 : 0;
    shared.uPointerStrength.value += (targetStrength - shared.uPointerStrength.value) * (1 - Math.exp(-9 * delta));
    burst *= Math.exp(-5 * delta);
    draw(delta);
    cpuMs = performance.now() - start;
    intervals[sampleCount % intervals.length] = elapsed; sampleCount++;
    slowFrames = elapsed > 23 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 120 && quality < 2 && !qualityTimer) qualityTimer = window.setTimeout(degrade, 0);
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0;
    shared.uFlow.value = reduced ? 0 : 1;
    if (disposed || lost || !visible || document.hidden) return;
    if (reduced) { scrollCurrent = 0; shared.uPointerStrength.value = 0; }
    draw();
    if (active()) { last = performance.now(); frame = requestAnimationFrame(tick); }
  }
  function readScroll() {
    scrollTarget = THREE.MathUtils.clamp((window.scrollY - sectionTop) / sectionTravel, 0, 1);
    // Scroll updates only the three form uniforms on the next frame, not object positions.
  }
  function resize() {
    const rect = canvas.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    const sectionRect = section.getBoundingClientRect(); sectionTop = sectionRect.top + window.scrollY;
    sectionTravel = Math.max(1, sectionRect.height - height - (options.navHeight ?? 64));
    mobile = mobileQuery.matches;
    camera.aspect = width / height;
    const halfWidth = 5.1, halfHeight = 2.5;
    camera.position.z = Math.max(halfHeight, halfWidth / camera.aspect) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    shared.uViewProjection.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const viewHalfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    shared.uScreenWorld.value.set(viewHalfHeight * camera.aspect, viewHalfHeight);
    qualitySettings(); readScroll(); sync();
  }
  function down(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0) return;
    dragId = event.pointerId; dragX = event.clientX; dragY = event.clientY; dragTime = event.timeStamp;
    velocityX = velocityY = 0; pointerActive = false;
    canvas.setPointerCapture(event.pointerId); canvas.dataset.dragging = 'true';
  }
  function move(event: PointerEvent) {
    if (dragId === event.pointerId) {
      const dx = event.clientX - dragX, dy = event.clientY - dragY;
      const seconds = Math.max(0.008, (event.timeStamp - dragTime) / 1000);
      const angleX = dx * 0.005, angleY = dy * 0.004;
      yaw += angleX; pitch = THREE.MathUtils.clamp(pitch + angleY, -1.15, 1.15);
      velocityX = THREE.MathUtils.clamp(angleX / seconds, -3, 3);
      velocityY = THREE.MathUtils.clamp(angleY / seconds, -2, 2);
      dragX = event.clientX; dragY = event.clientY; dragTime = event.timeStamp;
      if (paused || reduced) sync();
    } else if (event.pointerType !== 'touch' && !paused && !reduced) {
      const rect = canvas.getBoundingClientRect();
      shared.uPointer.value.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      pointerActive = true; pointerDeadline = performance.now() + 180;
    }
  }
  function up(event: PointerEvent) {
    if (event.pointerId !== dragId) return;
    dragId = -1; pointerActive = false; delete canvas.dataset.dragging;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (paused || reduced || event.type === 'pointercancel') velocityX = velocityY = 0;
  }
  function leave() { pointerActive = false; }
  function motionChange() { reduced = reducedQuery.matches; velocityX = velocityY = 0; simulation?.reset(); sync(); }
  function contextLost(event: Event) { event.preventDefault(); lost = true; cancelAnimationFrame(frame); onStatus('lost'); }
  function contextRestored() { onStatus('lost'); } // Explicit UI retry recreates all resources together.
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(canvas); resizeObserver.observe(section);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }); intersection.observe(canvas);
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('lostpointercapture', up); canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('webglcontextlost', contextLost); canvas.addEventListener('webglcontextrestored', contextRestored);
  window.addEventListener('scroll', readScroll, { passive: true });
  document.addEventListener('visibilitychange', sync); reducedQuery.addEventListener('change', motionChange);
  mobileQuery.addEventListener('change', resize);

  const debug = new URLSearchParams(window.location.search).has('debug');
  const diagnostics = {
    snapshot() {
      const n = Math.min(sampleCount, intervals.length);
      const sorted = Array.from(intervals.subarray(0, n)).sort((a, b) => a - b);
      const average = sorted.reduce((sum, value) => sum + value, 0) / Math.max(1, n);
      return { renderCount, frames: n, fps: average > 0 ? 1000 / average : 0, p95Ms: sorted[Math.floor(n * 0.95)] || 0,
        cpuMs, count: particleCount, maxCount, quality, mobile, dpr, bloomScale, simulation: Boolean(simulation),
        paused, reduced, visible, hidden: document.hidden, yaw, pitch, velocityX, velocityY,
        scatter: shared.uScatterProgress.value, shape: shared.uShapeProgress.value, rotation: shared.uRotationProgress.value,
        attributeVersion: (particles.geometry.getAttribute('position') as THREE.BufferAttribute).version, drawCalls: renderer.info.render.calls,
        textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries };
    },
    sampleSimulation: () => simulation?.readback() ?? null,
    loseContext: () => renderer.forceContextLoss(),
    restoreContext: () => renderer.forceContextRestore(),
  };
  const debugWindow = window as typeof window & { __astra?: typeof diagnostics };
  if (debug) debugWindow.__astra = diagnostics;
  resize(); onStatus(simulation ? 'ready' : 'fallback');
  return {
    setPaused(value) { paused = value; pointerActive = false; velocityX = velocityY = 0; sync(); },
    rotate(x, y) { yaw += x; pitch = THREE.MathUtils.clamp(pitch + y, -1.15, 1.15); velocityX = velocityY = 0; sync(); },
    scatter() { if (!paused && !reduced) burst = 3; },
    reset() { yaw = -0.035; pitch = 0.015; velocityX = velocityY = burst = 0; shared.uPointerStrength.value = 0; pointerActive = false; simulation?.reset(); sync(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); clearTimeout(qualityTimer);
      resizeObserver.disconnect(); intersection.disconnect();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('lostpointercapture', up); canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('webglcontextlost', contextLost); canvas.removeEventListener('webglcontextrestored', contextRestored);
      window.removeEventListener('scroll', readScroll); document.removeEventListener('visibilitychange', sync);
      reducedQuery.removeEventListener('change', motionChange); mobileQuery.removeEventListener('change', resize);
      simulation?.dispose(); particles.dispose(); stars.dispose(); path.dispose();
      bloom.dispose(); output.dispose(); renderPass.dispose(); composer.dispose(); renderer.dispose();
      if (debugWindow.__astra === diagnostics) delete debugWindow.__astra;
    },
  };
}
