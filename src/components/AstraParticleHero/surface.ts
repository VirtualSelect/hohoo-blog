import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// Compose AFTER OutputPass: particles are already tone-mapped to display RGB.
// The canvas shares its edge colour with the observatory's caption and frame.
export function createSurfacePass(root: HTMLElement) {
  const pass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uBackground: { value: new THREE.Color() },
      uMeteor: { value: -1 },
      uAspect: { value: 1 },
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
      uniform float uMeteor;
      uniform float uAspect;
      varying vec2 vUv;
      void main() {
        vec3 glow = clamp(texture2D(tDiffuse, vUv).rgb, 0.0, 1.0);
        vec2 edgeDistance = min(vUv, 1.0 - vUv);
        float edge = smoothstep(0.0, 0.08, edgeDistance.x)
                   * smoothstep(0.0, 0.12, edgeDistance.y);
        float strength = max(glow.r, max(glow.g, glow.b));
        float depth = (1.0 - smoothstep(0.15, 0.65, length(vUv - 0.5))) * edge;
        vec3 background = uBackground * (1.0 - depth * 0.22);
        // Preserve blue and warm stellar temperatures beneath white hot cores.
        vec3 hue = glow / max(strength, 0.0001);
        vec3 radiance = mix(hue, vec3(1.0), pow(strength, 8.0) * 0.08) * strength;
        // One meteor at a time, scheduled or triggered by the existing scene clock.
        // Its short trail lives above the wordmark and adds no draw call.
        if (uMeteor >= 0.0) {
          vec2 scale = vec2(uAspect, 1.0);
          vec2 direction = normalize(vec2(0.62, -0.12) * scale);
          vec2 head = (vec2(0.15, 0.84) + vec2(0.62, -0.12) * uMeteor) * scale;
          vec2 offset = head - vUv * scale;
          float along = dot(offset, direction);
          float across = abs(dot(offset, vec2(-direction.y, direction.x)));
          float tail = smoothstep(-0.003, 0.005, along) * (1.0 - smoothstep(0.0, 0.13, along)) * exp(-across * 1100.0);
          float core = exp(-length(offset) * 580.0);
          float fade = smoothstep(0.0, 0.10, uMeteor) * (1.0 - smoothstep(0.72, 1.0, uMeteor));
          radiance += (vec3(0.56, 0.75, 0.92) * tail + vec3(1.0, 0.95, 0.86) * core) * fade;
        }
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
      .setStyle(style.getPropertyValue("--astra-sky").trim() || "#0b1218")
      .convertLinearToSRGB();
    return light;
  }
  return { pass, update };
}
