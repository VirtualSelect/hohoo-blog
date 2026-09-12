attribute float aSize;
attribute float aBrightness;
attribute float aPhase;
attribute float aProgress;
attribute float aBranch;
attribute float aPath;
attribute vec2 aSimulationUv;
uniform sampler2D uSimulation;
uniform float uUseSimulation;
uniform mat4 uFieldRotation;
uniform mat4 uFieldInverse;
uniform vec2 uPointer;
uniform float uPointerStrength;
uniform vec2 uScreenWorld;
uniform float uDpr;
uniform float uViewportHeight;
varying float vBrightness;
varying float vPhase;
varying float vStar;
/* SHAPE */
void main() {
  vec3 local = particleShape(aProgress, aPath, aBranch, aPhase);
  vec2 offset = texture2D(uSimulation, aSimulationUv).rg;
  local.xy += offset * uUseSimulation;
  vec4 world = uFieldRotation * vec4(local, 1.0);
  vec4 clip = projectionMatrix * viewMatrix * world;
  // Stage 1 fallback on devices without a floating-point color buffer.
  vec2 delta = (clip.xy / clip.w - uPointer) * uScreenWorld;
  float distance = length(delta);
  vec2 direction = delta / max(distance, 0.001);
  float force = (1.0 - smoothstep(0.0, 0.8, distance)) * uPointerStrength * (1.0 - uUseSimulation);
  world.xy += direction * force * 0.65;
  vec4 eye = viewMatrix * world;
  gl_Position = projectionMatrix * eye;
  float apparent = uViewportHeight * uDpr * 0.035 / max(1.0, -eye.z);
  gl_PointSize = clamp(aSize * apparent, 1.25, 64.0 * uDpr);
  vBrightness = aBrightness * (0.9 + 0.1 * sin(uTime * 0.6 * uFlow + aPhase * 6.283185));
  vBrightness *= mix(0.65, 1.1, exp(-abs(local.z) * 0.65));
  vBrightness *= mix(0.7, 1.15, exp(-length(local.xy) * 0.32));
  vPhase = aPhase;
  vStar = step(3.5, aBrightness);
}
