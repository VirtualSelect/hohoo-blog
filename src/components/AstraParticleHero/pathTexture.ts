import * as THREE from 'three';

export interface PathAtlas {
  texture: THREE.DataTexture;
  size: THREE.Vector2;
  lengths: Float32Array;
  totalLength: number;
  dispose(): void;
}

/** Setup only. Each SVG stroke gets a separate row: no interpolation across pen lifts. */
export async function createPathTexture(url: string, signal: AbortSignal): Promise<PathAtlas> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Path asset unavailable (${response.status})`);
  const documentSvg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
  const sources = documentSvg.querySelectorAll('path');
  if (!sources.length || documentSvg.querySelector('parsererror')) throw new Error('Invalid SVG path asset');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
  document.body.appendChild(svg);
  const paths: SVGPathElement[] = [];
  const lengths = new Float32Array(sources.length);
  const samples = 1024;
  const data = new Float32Array(samples * sources.length * 4);
  let totalLength = 0;
  try {
    sources.forEach((source, row) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', source.getAttribute('d') || '');
      svg.appendChild(path); paths.push(path);
      const length = path.getTotalLength();
      if (!Number.isFinite(length) || length <= 0) throw new Error('Empty SVG stroke');
      lengths[row] = length; totalLength += length;
      for (let i = 0; i < samples; i++) {
        const distance = i / (samples - 1) * length;
        const point = path.getPointAtLength(distance);
        const before = path.getPointAtLength(Math.max(0, distance - 0.25));
        const after = path.getPointAtLength(Math.min(length, distance + 0.25));
        const dx = after.x - before.x, dy = -(after.y - before.y);
        const magnitude = Math.hypot(dx, dy) || 1;
        const offset = (row * samples + i) * 4;
        data[offset] = (point.x - 361) / 72;
        data[offset + 1] = -(point.y - 110) / 72;
        data[offset + 2] = dx / magnitude;
        data[offset + 3] = dy / magnitude;
      }
    });
  } finally { svg.remove(); }
  const texture = new THREE.DataTexture(data, samples, sources.length, THREE.RGBAFormat, THREE.FloatType);
  // Shader interpolation avoids relying on OES_texture_float_linear.
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false; texture.needsUpdate = true;
  return { texture, size: new THREE.Vector2(samples, sources.length), lengths, totalLength, dispose: () => texture.dispose() };
}
