precision highp float;
varying float vBrightness;
varying float vPhase;
varying float vStar;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  float aa = max(fwidth(r), 0.015);
  float edge = 1.0 - smoothstep(1.0 - aa, 1.0, r);
  float soft = exp(-r * r * 7.0) * 0.35;
  float core = exp(-r * r * 90.0);
  float rays = (exp(-abs(p.x) * 65.0) * exp(-abs(p.y) * 5.0) + exp(-abs(p.y) * 65.0) * exp(-abs(p.x) * 5.0)) * 0.16;
  float light = (soft + core + rays * vStar) * edge;
  if (light < 0.002) discard;
  vec3 color = mix(vec3(0.53, 0.77, 1.0), vec3(0.94, 0.97, 1.0), smoothstep(0.15, 0.75, vPhase));
  color = mix(color, vec3(1.0, 0.8, 0.57), step(0.9, vPhase));
  gl_FragColor = vec4(color * light * vBrightness, 1.0);
}
