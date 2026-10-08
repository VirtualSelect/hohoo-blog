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
uniform float uPointFloor;
uniform float uColorEnergy;
varying float vBrightness;
varying float vPhase;
varying float vStar;
varying vec3 vSpectrum;
varying vec3 vNebula;
/* SHAPE */
// Art-directed stellar colours, distributed throughout every letter rather
// than assigned by horizontal position. Colours stay stable during motion.
vec3 stellarColor(float phase, float branch) {
  if (phase < 0.60) {
    return mix(vec3(0.16, 0.48, 0.90), vec3(0.67, 0.85, 1.0), phase / 0.60);
  }
  if (phase < 0.89) {
    return vec3(0.89, 0.95, 1.0);
  }
  return mix(vec3(1.0, 0.43, 0.16), vec3(1.0, 0.79, 0.57), branch / 4.0);
}
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
  gl_PointSize = clamp(aSize * apparent, uPointFloor, 64.0 * uDpr);
  vBrightness = aBrightness * (0.9 + 0.1 * sin(uTime * 0.6 * uFlow + aPhase * 6.283185));
  vBrightness *= mix(0.65, 1.1, exp(-abs(local.z) * 0.65));
  vBrightness *= mix(0.7, 1.15, exp(-length(local.xy) * 0.32));
  vPhase = aPhase;
  vStar = step(3.5, aBrightness);
  vSpectrum = vec3(1.0);
  vNebula = vec3(1.0);
  if (uSpectralMode > 0.5) {
    float time = uTime * uFlow;
    float glimmer = 0.5 + 0.5 * sin(time * (0.75 + aPhase * 0.7) + aPhase * 31.41593);
    vSpectrum = stellarColor(aPhase, aBranch);
    vNebula = vSpectrum * vec3(0.55, 0.70, 0.85);
    // Each star waxes independently over seconds; no whole-field flashing.
    float sparkle = pow(0.5 + 0.5 * sin(time * (1.1 + aPhase * 0.9)
                                      + aPhase * 62.83185 + aBranch), 6.0);
    float beacon = step(3.5, aBrightness);
    float middle = step(1.0, aBrightness) * (1.0 - beacon);
    vBrightness *= 0.32 + glimmer * 0.75 + uColorEnergy * 0.3;
    vBrightness *= 1.0 + middle * sparkle * 1.8 + beacon * sparkle * 3.0;
    vStar *= 0.45 + sparkle * 0.8;
    float cluster = starCluster(starProgress(aProgress, aPath, aBranch), aPath);
    vBrightness *= 0.65 + cluster * 0.65;
    // Keep the faint dust small. Only rare beacons get a visible halo footprint.
    gl_PointSize *= 1.0 + middle * 0.65 + beacon * (1.6 + sparkle * 0.6);
    // A narrow viewport must not shrink every luminous star into a dust speck.
    gl_PointSize = max(gl_PointSize, (beacon * 12.0 + middle * 3.4) * uDpr);
    gl_PointSize = clamp(gl_PointSize, uPointFloor, 34.0 * uDpr);
    vBrightness = clamp(vBrightness, 0.045, 6.0);
    // A compact constellation packs more stars into each pixel than a word.
    vBrightness *= mix(1.0, 0.6, uSecretProgress);
  }
}
