import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// Compose AFTER OutputPass: particles are already tone-mapped to display RGB.
// Keeping the page colour out of the HDR/bloom pass avoids a glowing light page
// and makes an empty canvas pixel exactly match the surrounding CSS surface.
export function createSurfacePass(root: HTMLElement) {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uBackground: { value: new THREE.Color() },
      uLightMode: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec3 uBackground;
      uniform float uLightMode;
      varying vec2 vUv;
      void main() {
        vec3 glow = clamp(texture2D(tDiffuse, vUv).rgb, 0.0, 1.0);
        vec2 edgeDistance = min(vUv, 1.0 - vUv);
        float edge = smoothstep(0.0, 0.08, edgeDistance.x)
                   * smoothstep(0.0, 0.12, edgeDistance.y);
        float strength = max(glow.r, max(glow.g, glow.b));
        // White stars need dark space in BOTH themes. The eye-care page keeps
        // an explicit night-sky viewport, like an astronomical photograph;
        // fading black into white would create a muddy grey frame.
        vec2 field = abs(vUv - 0.5) / vec2(0.54, 0.49);
        float radius = pow(pow(field.x, 4.0) + pow(field.y, 4.0), 0.25);
        float sky = (1.0 - smoothstep(0.62, 1.10, radius)) * edge;
        vec3 midnight = mix(vec3(0.018, 0.036, 0.048), vec3(0.027, 0.050, 0.073), uLightMode);
        vec3 background = mix(uBackground, midnight, mix(sky, 1.0, uLightMode));
        // Preserve blue and warm stellar temperatures beneath white hot cores.
        vec3 hue = glow / max(strength, 0.0001);
        vec3 radiance = mix(hue, vec3(1.0), pow(strength, 8.0) * 0.08) * strength;
        gl_FragColor = vec4(background + (1.0 - background) * radiance * edge, 1.0);
      }
    `,
  });
  pass.material.toneMapped = false;

  function update() {
    const style = getComputedStyle(root);
    const light = document.documentElement.dataset.theme !== "dark";
    // THREE.Color parses CSS to linear RGB; this final pass needs display RGB.
    pass.uniforms.uBackground.value
      .setStyle(style.backgroundColor)
      .convertLinearToSRGB();
    pass.uniforms.uLightMode.value = light ? 1 : 0;
    return light;
  }
  return { pass, update };
}
