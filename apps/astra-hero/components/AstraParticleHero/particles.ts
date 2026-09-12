import * as THREE from 'three';
import type { PathAtlas } from './pathTexture';
import vertexSource from './shaders/particle.vert';
import fragmentSource from './shaders/particle.frag';
import shapeSource from './shaders/shape.glsl';

export type SharedUniforms = ReturnType<typeof createSharedUniforms>;
export function createSharedUniforms(path: PathAtlas) {
  return {
    uPathTexture: { value: path.texture }, uPathSize: { value: path.size },
    uTime: { value: 0 }, uFlow: { value: 1 },
    uScatterProgress: { value: 0 }, uShapeProgress: { value: 1 }, uRotationProgress: { value: 0 },
    uFieldRotation: { value: new THREE.Matrix4() }, uFieldInverse: { value: new THREE.Matrix4() },
    uViewProjection: { value: new THREE.Matrix4() },
    uPointer: { value: new THREE.Vector2(100, 100) }, uPointerStrength: { value: 0 },
    uScreenWorld: { value: new THREE.Vector2(1, 1) },
  };
}

export function createParticles(count: number, path: PathAtlas, shared: SharedUniforms) {
  const side = 2 ** Math.ceil(Math.log2(Math.ceil(Math.sqrt(count))));
  const geometry = new THREE.BufferGeometry();
  const attributes = {
    aSize: new Float32Array(count), aBrightness: new Float32Array(count),
    aPhase: new Float32Array(count), aProgress: new Float32Array(count),
    aBranch: new Float32Array(count), aPath: new Float32Array(count),
  };
  const uv = new Float32Array(count * 2);
  const metadata = new Float32Array(side * side * 4);
  let seed = 61423;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  for (let i = 0; i < count; i++) {
    const progress = random(), phase = random(), branch = i % 5;
    let remaining = random() * path.totalLength, row = 0;
    while (row < path.lengths.length - 1 && remaining > path.lengths[row]) remaining -= path.lengths[row++];
    const stellar = random();
    attributes.aSize[i] = stellar > 0.994 ? 4.7 : stellar > 0.96 ? 2.0 : 0.45 + random() * 0.7;
    attributes.aBrightness[i] = stellar > 0.994 ? 5.5 : stellar > 0.96 ? 1.8 : 0.28 + random() * 0.55;
    attributes.aPhase[i] = phase; attributes.aProgress[i] = progress;
    attributes.aBranch[i] = branch; attributes.aPath[i] = row;
    uv[i * 2] = (i % side + 0.5) / side; uv[i * 2 + 1] = (Math.floor(i / side) + 0.5) / side;
    metadata[i * 4] = progress; metadata[i * 4 + 1] = row;
    metadata[i * 4 + 2] = branch; metadata[i * 4 + 3] = phase;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  for (const [name, array] of Object.entries(attributes)) geometry.setAttribute(name, new THREE.BufferAttribute(array, 1));
  geometry.setAttribute('aSimulationUv', new THREE.BufferAttribute(uv, 2));
  const metadataTexture = new THREE.DataTexture(metadata, side, side, THREE.RGBAFormat, THREE.FloatType);
  metadataTexture.needsUpdate = true; metadataTexture.generateMipmaps = false;
  const zero = new THREE.DataTexture(new Float32Array(4), 1, 1, THREE.RGBAFormat, THREE.FloatType);
  zero.needsUpdate = true;
  const uniforms = {
    ...shared, uSimulation: { value: zero as THREE.Texture }, uUseSimulation: { value: 0 },
    uDpr: { value: 1 }, uViewportHeight: { value: 800 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: vertexSource.replace('/* SHAPE */', shapeSource), fragmentShader: fragmentSource,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material); points.frustumCulled = false;
  return { points, geometry, uniforms, side, metadataTexture,
    dispose() { geometry.dispose(); material.dispose(); metadataTexture.dispose(); zero.dispose(); },
  };
}

export function createBackgroundStars(mobile: boolean) {
  const count = mobile ? 220 : 550;
  const positions = new Float32Array(count * 3);
  let seed = 433;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - 0.5) * 25;
    positions[i * 3 + 1] = (random() - 0.5) * 16;
    positions[i * 3 + 2] = -3 - random() * 5;
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0x7493ad, size: 0.012, transparent: true, opacity: 0.38, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  return { points, dispose() { geometry.dispose(); material.dispose(); } };
}
