// Shared by the point vertex shader and FBO simulation. All form changes live here.
uniform sampler2D uPathTexture;
uniform vec2 uPathSize;
uniform float uTime;
uniform float uScatterProgress;
uniform float uShapeProgress;
uniform float uRotationProgress;
uniform float uFlow;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
vec4 pathAt(float progress, float row) {
  float index = clamp(progress, 0.0, 1.0) * (uPathSize.x - 1.0);
  float lo = floor(index);
  float v = (row + 0.5) / uPathSize.y;
  vec4 a = texture2D(uPathTexture, vec2((lo + 0.5) / uPathSize.x, v));
  vec4 b = texture2D(uPathTexture, vec2((min(lo + 1.0, uPathSize.x - 1.0) + 0.5) / uPathSize.x, v));
  return mix(a, b, fract(index));
}
vec3 particleShape(float progress, float row, float branch, float phase) {
  float seed = phase * 912.17 + progress * 173.1;
  float movingProgress = fract(progress + uTime * 0.012 * uFlow + branch * 0.137);
  vec4 path = pathAt(movingProgress, row);
  vec2 tangent = normalize(path.zw + vec2(0.00001));
  vec2 normal = vec2(-tangent.y, tangent.x);
  // Five coherent star arms: each has a different depth and orbital phase.
  float armPhase = branch * 1.256637 + uTime * 0.12 * uFlow;
  float localPhase = movingProgress * 12.56637 + armPhase;
  float depth = (branch - 2.0) * 0.075 + sin(localPhase) * 0.08;
  float randomNormal = (hash11(seed) - 0.5);
  float filament = sin(localPhase) * 0.085;
  float width = mix(0.035, 0.22, pow(hash11(seed + 7.0), 5.0));
  vec3 shape = vec3(path.xy + normal * (filament + randomNormal * width), depth);
  shape.xy += tangent * (hash11(seed + 13.0) - 0.5) * 0.035;
  shape.z += (hash11(seed + 22.0) - 0.5) * 0.07;
  float angle = progress * 6.283185 + armPhase;
  float radius = 0.25 + pow(hash11(seed + 5.0), 0.7) * 4.8;
  vec3 galaxy = vec3(cos(angle + radius * 0.7) * radius, sin(angle + radius * 0.7) * radius * 0.43, depth * 3.0);
  vec3 formed = mix(galaxy, shape, uShapeProgress);
  vec3 cloud = vec3(hash11(seed + 31.0) - 0.5, hash11(seed + 47.0) - 0.5, hash11(seed + 61.0) - 0.5) * vec3(13.0, 6.0, 5.0);
  formed = mix(formed, cloud, uScatterProgress);
  float rotation = uRotationProgress * 1.4;
  vec3 turned = vec3(formed.x * cos(rotation) + formed.z * sin(rotation), formed.y, -formed.x * sin(rotation) + formed.z * cos(rotation));
  return mix(formed, turned, uRotationProgress);
}
