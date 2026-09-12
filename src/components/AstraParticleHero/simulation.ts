import * as THREE from 'three';
import type { SharedUniforms } from './particles';
import vertexSource from './shaders/simulation.vert';
import fragmentSource from './shaders/simulation.frag';
import shapeSource from './shaders/shape.glsl';

/** Stage 2: RG = local offset; BA = velocity. No per-particle CPU read/write. */
export function createSimulation(renderer: THREE.WebGLRenderer, side: number, count: number, metadata: THREE.Texture, shared: SharedUniforms) {
  if (!renderer.extensions.has('EXT_color_buffer_float')) return null;
  const options = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter, depthBuffer: false, stencilBuffer: false };
  let read = new THREE.WebGLRenderTarget(side, side, options);
  let write = new THREE.WebGLRenderTarget(side, side, options);
  const uniforms = { ...shared, uState: { value: read.texture }, uMetadata: { value: metadata },
    uDelta: { value: 1 / 60 }, uBurst: { value: 0 }, uCount: { value: count }, uSide: { value: side } };
  const material = new THREE.ShaderMaterial({ uniforms,
    vertexShader: vertexSource, fragmentShader: fragmentSource.replace('/* SHAPE */', shapeSource), depthTest: false, depthWrite: false });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const scene = new THREE.Scene(); scene.add(new THREE.Mesh(geometry, material));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const savedColor = new THREE.Color();
  function reset() {
    const target = renderer.getRenderTarget();
    renderer.getClearColor(savedColor); const alpha = renderer.getClearAlpha();
    renderer.setClearColor(0, 0);
    renderer.setRenderTarget(read); renderer.clear();
    renderer.setRenderTarget(write); renderer.clear();
    renderer.setRenderTarget(target); renderer.setClearColor(savedColor, alpha);
  }
  reset();
  return {
    uniforms,
    get texture() { return read.texture; },
    step(delta: number, burst: number) {
      uniforms.uState.value = read.texture; uniforms.uDelta.value = delta; uniforms.uBurst.value = burst;
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(write); renderer.render(scene, camera); renderer.setRenderTarget(previous);
      const swap = read; read = write; write = swap;
    },
    reset,
    /** Opt-in diagnostics only: never called from the render loop. */
    readback() {
      const data = new Uint16Array(side * side * 4);
      renderer.readRenderTargetPixels(read, 0, 0, side, side, data);
      let offsetEnergy = 0, velocityEnergy = 0, invalid = 0;
      for (let i = 0; i < count; i++) {
        const x = THREE.DataUtils.fromHalfFloat(data[i * 4]), y = THREE.DataUtils.fromHalfFloat(data[i * 4 + 1]);
        const vx = THREE.DataUtils.fromHalfFloat(data[i * 4 + 2]), vy = THREE.DataUtils.fromHalfFloat(data[i * 4 + 3]);
        if (!Number.isFinite(x + y + vx + vy)) invalid++;
        offsetEnergy += x * x + y * y; velocityEnergy += vx * vx + vy * vy;
      }
      return { offsetEnergy: offsetEnergy / count, velocityEnergy: velocityEnergy / count, invalid };
    },
    dispose() { read.dispose(); write.dispose(); geometry.dispose(); material.dispose(); },
  };
}
