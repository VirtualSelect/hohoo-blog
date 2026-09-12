precision highp float;
varying vec2 vUv;
uniform sampler2D uState;
uniform sampler2D uMetadata;
uniform float uDelta;
uniform mat4 uFieldRotation;
uniform mat4 uFieldInverse;
uniform mat4 uViewProjection;
uniform vec2 uPointer;
uniform vec2 uScreenWorld;
uniform float uPointerStrength;
uniform float uBurst;
uniform float uCount;
uniform float uSide;
/* SHAPE */
void main() {
  float id = floor(vUv.y * uSide) * uSide + floor(vUv.x * uSide);
  if (id >= uCount) { gl_FragColor = vec4(0.0); return; }
  vec4 state = texture2D(uState, vUv);
  vec4 meta = texture2D(uMetadata, vUv);
  vec2 offset = state.rg;
  vec2 velocity = state.ba;
  vec3 base = particleShape(meta.r, meta.g, meta.b, meta.a);
  vec4 world = uFieldRotation * vec4(base + vec3(offset, 0.0), 1.0);
  vec4 clip = uViewProjection * world;
  vec2 delta = (clip.xy / clip.w - uPointer) * uScreenWorld;
  float distance = length(delta);
  vec2 radial = delta / max(distance, 0.005);
  float strength = (1.0 - smoothstep(0.0, 0.8, distance)) * uPointerStrength;
  vec2 repulsion = (uFieldInverse * vec4(radial * strength * 14.0, 0.0, 0.0)).xy;
  float angle = hash11(meta.a * 173.0 + meta.r) * 6.283185;
  vec2 burst = vec2(cos(angle), sin(angle)) * uBurst * 11.0;
  // Semi-implicit spring integration, with frame-independent exponential drag.
  velocity += (-offset * 8.0 + repulsion + burst) * uDelta;
  velocity *= exp(-4.5 * uDelta);
  offset += velocity * uDelta;
  offset = clamp(offset, vec2(-3.0), vec2(3.0));
  gl_FragColor = vec4(offset, velocity);
}
