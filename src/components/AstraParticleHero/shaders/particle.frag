precision highp float;
varying float vBrightness;
varying float vPhase;
varying float vStar;
varying vec3 vSpectrum;
varying vec3 vNebula;
uniform float uSpectralMode;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  float aa = max(fwidth(r), 0.015);
  float edge = 1.0 - smoothstep(1.0 - aa, 1.0, r);
  float soft = exp(-r * r * mix(7.0, 9.0, uSpectralMode)) * mix(0.35, 0.035 + vStar * 0.055, uSpectralMode);
  float core = exp(-r * r * mix(90.0, 38.0, uSpectralMode));
  float rays = (exp(-abs(p.x) * 65.0) * exp(-abs(p.y) * 5.0) + exp(-abs(p.y) * 65.0) * exp(-abs(p.x) * 5.0)) * 0.16;
  float light = (soft + core + rays * vStar) * edge;
  if (light < 0.002) discard;
  vec3 color = mix(vec3(0.53, 0.77, 1.0), vec3(0.94, 0.97, 1.0), smoothstep(0.15, 0.75, vPhase));
  color = mix(color, vec3(1.0, 0.8, 0.57), step(0.9, vPhase));
  // Separate the silver star core from the dim blue/violet dust around it.
  // Keeping these layers distinct avoids both rainbow lettering and white fog.
  vec3 stellar = mix(vSpectrum, vec3(1.0), min(0.62, vStar * 0.5));
  vec3 galaxy = (vNebula * soft + stellar * (core + rays * vStar)) * edge;
  gl_FragColor = vec4(mix(color * light, galaxy, uSpectralMode) * vBrightness, 1.0);
}
