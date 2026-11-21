import * as T from "three";
import { createArtworkSecret } from "./theme-artwork-secrets";
import { artworkBounds, fitArtworkCamera } from "./theme-artwork-framing";
import { createSculpture } from "./theme-artwork-models";
import { artworkPixelRatio } from "./theme-artwork-rendering";
import type { ArtworkDesign } from "./theme-artwork-config";

export interface ArtworkScene {
  pause(value: boolean): void;
  transform(value: boolean): void;
  setAmount(value: number): void;
  turn(delta?: number): void;
  orbit(dx: number, dy: number): void;
  resetView(): void;
  secret(value: boolean): void;
  replaySecret(): void;
  seekSecret(phase: number): void;
  secretProgress(): number;
  dispose(): void;
}
interface Lease {
  eligible(): boolean;
  refresh(): void;
}
const leases = new Set<Lease>();
let owner: Lease | undefined;
function reconcile(preferred?: Lease) {
  owner = preferred?.eligible()
    ? preferred
    : owner?.eligible()
      ? owner
      : [...leases].find((l) => l.eligible());
  leases.forEach((l) => l.refresh());
}

export function createArtworkScene(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  options: {
    design: ArtworkDesign;
    context: "home" | "about";
    dark: boolean;
    onFailure: () => void;
    onReady?: () => void;
  },
): ArtworkScene {
  let disposed = false,
    frame = 0;
  let ready = false;
  let renders = 0,
    animationTicks = 0;
  const cleanup: Array<() => void> = [];
  cleanup.push(() => host.removeAttribute("data-artwork-framing"));
  cleanup.push(() => {
    host.removeAttribute("data-artwork-render-stats");
  });
  const keep = <V extends { dispose(): void }>(value: V): V => {
    cleanup.push(() => value.dispose());
    return value;
  };
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    for (const release of cleanup.reverse()) {
      try {
        release();
      } catch {}
    }
    cleanup.length = 0;
  }
  try {
    const small = matchMedia("(max-width:700px), (pointer:coarse)").matches;
    const renderer = new T.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    cleanup.push(
      () => renderer.forceContextLoss(),
      () => renderer.dispose(),
    );
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    const warmSurface = ["classic", "garden", "photo", "chapters"].includes(
      options.design,
    );
    renderer.toneMappingExposure = options.dark ? 1.08 : 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    const world = new T.Scene();
    const pmrem = keep(new T.PMREMGenerator(renderer));
    const studio = new T.Scene();
    studio.background = new T.Color(0.12, 0.13, 0.15);
    // A softbox has a broad centre and a feathered edge. Smooth reflection
    // bands reveal curvature without stamping white rectangles on the metal.
    const softboxCanvas = document.createElement("canvas");
    softboxCanvas.width = softboxCanvas.height = 128;
    const softboxContext = softboxCanvas.getContext("2d");
    if (softboxContext) {
      const gradient = softboxContext.createRadialGradient(
        64,
        64,
        18,
        64,
        64,
        88,
      );
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.55, "#e6e6e6");
      gradient.addColorStop(1, "#101010");
      softboxContext.fillStyle = gradient;
      softboxContext.fillRect(0, 0, 128, 128);
    }
    const softbox = keep(new T.CanvasTexture(softboxCanvas));
    softbox.colorSpace = T.SRGBColorSpace;
    for (const [width, height, x, y, z, power] of [
      [8, 6, -6, 5, 6, 4.8],
      [2, 10, 6, 1, 3, 3.5],
      [6, 3, 0, 7, -4, 4],
      [5, 5, -1, 2, 8, 2.2],
    ]) {
      const panel = new T.Mesh(
        keep(new T.PlaneGeometry(width, height)),
        keep(
          new T.MeshBasicMaterial({
            color: new T.Color().setRGB(power, power, power),
            map: softbox,
            side: T.DoubleSide,
          }),
        ),
      );
      panel.position.set(x, y, z);
      panel.lookAt(0, 0, 0);
      studio.add(panel);
    }
    const environment = keep(
      pmrem.fromScene(studio, 0.015, 0.1, 50, { size: small ? 128 : 256 }),
    );
    world.environment = environment.texture;
    world.environmentIntensity = options.dark ? 0.8 : warmSurface ? 0.65 : 0.9;
    const hemisphere = new T.HemisphereLight(
      options.dark ? "#c2dfff" : warmSurface ? "#fffaf2" : "#ffffff",
      options.dark ? "#111d37" : "#797772",
      options.dark ? 0.65 : 0.3,
    );
    world.add(hemisphere);
    const key = new T.DirectionalLight(
      warmSurface ? "#fff6e8" : "#f5f8ff",
      options.dark ? 3 : warmSurface ? 2.6 : 2.8,
    );
    key.position.set(
      -5,
      ["photo", "classic", "chapters"].includes(options.design) ? 7 : 4,
      2,
    );
    key.castShadow = true;
    key.shadow.mapSize.set(small ? 512 : 1024, small ? 512 : 1024);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.normalBias = 0.018;
    key.shadow.bias = -0.00008;
    key.shadow.radius = 2;
    world.add(key);
    cleanup.push(() => key.shadow.dispose());
    const rim = new T.DirectionalLight(
      options.dark ? "#79bfff" : "#e4eeff",
      options.dark ? 2 : 0.7,
    );
    rim.position.set(5, 2, -4);
    world.add(rim);
    // Low front fill reveals folded undersides without flattening the key shadow.
    const fill = new T.DirectionalLight("#eef1f4", options.dark ? 0.3 : 0.6);
    fill.position.set(4, -0.4, 6);
    world.add(fill);
    const sculpture = createSculpture(
      options.design,
      options.context === "about",
      keep,
    );
    const pivot = new T.Group();
    pivot.add(sculpture.root);
    world.add(pivot);
    const floor = new T.Mesh(
      keep(new T.PlaneGeometry(8, 5)),
      keep(
        new T.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          uniforms: { strength: { value: options.dark ? 0.18 : 0.22 } },
          vertexShader:
            "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
          fragmentShader:
            "varying vec2 vUv;uniform float strength;void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p,p)*4.)*smoothstep(1.,.6,length(p))*strength;gl_FragColor=vec4(.12,.105,.085,a);}",
        }),
      ),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.35;
    floor.receiveShadow = false;

    world.add(floor);
    // A faint geometric projection preserves the sculpture's silhouette;
    // the radial contact layer above supplies the softer distance falloff.
    const projection = new T.Mesh(
      keep(new T.PlaneGeometry(12, 10)),
      keep(
        new T.ShadowMaterial({
          opacity: options.dark
            ? 0.04
            : options.design === "chapters"
              ? 0.025
              : options.design === "photo"
                ? 0.035
                : 0.065,
        }),
      ),
    );
    projection.rotation.x = -Math.PI / 2;
    projection.material.onBeforeCompile = (shader) => {
      shader.vertexShader =
        "varying vec2 vReceiverUv;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvReceiverUv = uv;",
        );
      shader.fragmentShader =
        "varying vec2 vReceiverUv;\n" +
        shader.fragmentShader.replace(
          "#include <tonemapping_fragment>",
          "vec2 offset = (vReceiverUv - .5) * 2.;\ngl_FragColor.a *= exp(-dot(offset, offset) * 2.) * smoothstep(1., .35, length(offset));\n#include <tonemapping_fragment>",
        );
    };
    projection.position.y = -2.34;
    projection.receiveShadow = true;
    projection.visible = true;
    world.add(projection);
    const camera = new T.PerspectiveCamera(35, 1, 0.1, 80);
    camera.position.set(0, 0.5, 11);
    camera.lookAt(0, 0, 0);
    let secretArtwork: ReturnType<typeof createArtworkSecret> | undefined;
    const secretPivot = new T.Group();
    secretPivot.visible = false;
    world.add(secretPivot);
    const component = host.closest<HTMLElement>(".theme-artwork");
    if (component) component.dataset.secretDesign = "none";
    const motion = matchMedia("(prefers-reduced-motion:reduce)");
    let visible = false,
      paused = false,
      targetAmount = 0,
      amount = 0,
      time = 0,
      last = 0,
      responsiveTilt = 0,
      secret = false,
      slow = 0,
      lowQuality = false;
    let reveal = 0,
      revealing = false;
    const subjectOrientation = new T.Quaternion();
    const orientation = new T.Quaternion();
    const rotationStep = new T.Quaternion();
    const rotationAxis = new T.Vector3();
    function orbit(dx: number, dy: number) {
      const distance = Math.hypot(dx, dy);
      if (!Number.isFinite(distance) || distance === 0) return;
      rotationAxis.set(dy, dx, 0).normalize();
      rotationStep.setFromAxisAngle(rotationAxis, distance);
      orientation.premultiply(rotationStep).normalize();
      draw();
    }
    const lease: Lease = {
      eligible: () =>
        !disposed && visible && !document.hidden && !paused && !motion.matches,
      refresh,
    };
    leases.add(lease);
    cleanup.push(() => {
      leases.delete(lease);
      if (owner === lease) owner = undefined;
      reconcile();
    });
    function draw() {
      if (disposed || !visible || document.hidden) return;
      try {
        if (!secret) sculpture.update(time, amount);
        pivot.rotation.set(0, Math.sin(time * 0.12) * 0.07, responsiveTilt);
        pivot.quaternion.premultiply(orientation);
        // Rotate the filtered studio map without rebuilding PMREM.
        world.environmentRotation.set(
          Math.sin(time * 0.09) * 0.12,
          time * 0.045,
          0,
        );
        // A small key-light drift also reveals relief on matte paper and leaves.
        // Keep its height and intensity steady so the material never flashes.
        key.position.x = -5 + Math.sin(time * 0.13) * 0.8;
        key.position.z = 2 + Math.sin(time * 0.11) * 0.5;
        rim.position.set(
          5 + Math.sin(time * 0.17) * 1.2,
          2 + Math.sin(time * 0.11) * 0.6,
          -4 + Math.cos(time * 0.17) * 0.7,
        );
        if (secret && secretArtwork) {
          secretArtwork.update(time, reveal);
          const display = reveal.toFixed(3);
          if (host.dataset.secretProgress !== display)
            host.dataset.secretProgress = display;
        }
        secretPivot.quaternion.copy(orientation);
        const bounds = artworkBounds(secret ? secretPivot : pivot);
        const diagnostic = fitArtworkCamera(
          camera,
          bounds,
          0.84,
          secret ? secretPivot : pivot,
        );
        if (diagnostic)
          host.dataset.artworkFraming = JSON.stringify({
            ...diagnostic,
            secret: secret ? options.design : null,
          });
        if (!bounds.isEmpty()) {
          const center = bounds.getCenter(new T.Vector3()),
            size = bounds.getSize(new T.Vector3());
          floor.position.set(center.x, bounds.min.y - 0.06, center.z);
          floor.scale.set(
            Math.max(0.3, size.x / 5),
            Math.max(0.3, size.z / 3),
            1,
          );
          projection.position.set(center.x, bounds.min.y - 0.055, center.z);
          projection.scale.set(
            Math.max(3.5, size.x * 1.6) / 12,
            Math.max(3.5, size.z * 1.6) / 10,
            1,
          );
        }
        renderer.render(world, camera);
        if (!ready) {
          ready = true;
          options.onReady?.();
        }
        if (process.env.NODE_ENV !== "production") {
          host.dataset.artworkRenderStats = JSON.stringify({
            renders: ++renders,
            animationTicks,
          });
        }
      } catch {
        dispose();
        options.onFailure();
      }
    }
    function tick(now: number) {
      animationTicks++;
      frame = 0;
      if (!lease.eligible() || owner !== lease) return;
      const elapsed = last ? now - last : 0;
      if (elapsed >= 1000 / 30 || !last) {
        const dt = Math.min(elapsed / 1000, 0.08);
        time += dt;
        if (secret && revealing) {
          reveal = Math.min(1, reveal + elapsed / 3000);
          if (reveal === 1) revealing = false;
        }
        amount = T.MathUtils.damp(amount, targetAmount, 4, dt);
        last = now;
        const before = performance.now();
        draw();
        if (performance.now() - before > 40) slow++;
        else slow = Math.max(0, slow - 1);
        if (slow > 20 && !lowQuality) {
          lowQuality = true;
          renderer.shadowMap.enabled = false;
          resize();
        }
      }
      if (!disposed) frame = requestAnimationFrame(tick);
    }
    function refresh() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      draw();
      if (owner === lease && lease.eligible())
        frame = requestAnimationFrame(tick);
    }
    function sync() {
      reconcile();
    }
    function resize() {
      if (disposed) return;
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setPixelRatio(
        artworkPixelRatio(
          width,
          height,
          devicePixelRatio,
          matchMedia("(max-width:700px), (pointer:coarse)").matches,
          lowQuality,
        ),
      );
      renderer.setSize(width, height, false);
      world.traverse((object) => {
        if (!(object instanceof T.Points)) return;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of materials) {
          if (
            material instanceof T.ShaderMaterial &&
            material.uniforms.pixelRatio
          )
            material.uniforms.pixelRatio.value = renderer.getPixelRatio();
        }
      });
      camera.aspect = width / height;
      responsiveTilt = 0;
      draw();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    cleanup.push(() => observer.disconnect());
    observer.observe(host);
    const sizes = new ResizeObserver(resize);
    cleanup.push(() => sizes.disconnect());
    sizes.observe(host);
    const listen = (
      target: EventTarget,
      event: string,
      handler: EventListener,
    ) => {
      cleanup.push(() => target.removeEventListener(event, handler));
      target.addEventListener(event, handler);
    };
    listen(document, "visibilitychange", sync);
    listen(motion, "change", () => {
      if (motion.matches) {
        amount = targetAmount;
        if (revealing) {
          reveal = 1;
          revealing = false;
        }
      }
      sync();
    });
    listen(canvas, "webglcontextlost", (event) => {
      event.preventDefault();
      dispose();
      options.onFailure();
    });
    let pointer: number | undefined;
    let previousX = 0,
      previousY = 0;
    listen(canvas, "pointerdown", (event) => {
      const e = event as PointerEvent;
      if (pointer !== undefined || e.button !== 0) return;
      if (e.pointerType === "touch" && component?.dataset.freeDrag !== "true")
        return;
      pointer = e.pointerId;
      previousX = e.clientX;
      previousY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      reconcile(lease);
    });
    listen(canvas, "pointermove", (event) => {
      const e = event as PointerEvent;
      if (pointer !== e.pointerId) return;
      const scale =
        (Math.PI * 2) /
        Math.max(180, Math.min(canvas.clientWidth, canvas.clientHeight));
      orbit((e.clientX - previousX) * scale, (e.clientY - previousY) * scale);
      previousX = e.clientX;
      previousY = e.clientY;
    });
    const releasePointer = (event: Event) => {
      const e = event as PointerEvent;
      if (pointer !== e.pointerId) return;
      pointer = undefined;
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
    };
    listen(canvas, "pointerup", releasePointer);
    listen(canvas, "pointercancel", releasePointer);
    listen(canvas, "lostpointercapture", releasePointer);
    function replaySecret() {
      if (!secret) return;
      revealing = !paused && !motion.matches;
      reveal = revealing ? 0 : 1;
      last = 0;
      draw();
    }
    cleanup.push(() => {
      delete host.dataset.secretProgress;
    });
    resize();
    return {
      pause(value) {
        paused = value;
        sync();
      },
      transform(value) {
        targetAmount = value ? 1 : 0;
        if (paused || motion.matches) amount = value ? 1 : 0;
        else if (owner !== lease) reconcile(lease);
        draw();
      },
      setAmount(value) {
        if (!Number.isFinite(value)) return;
        targetAmount = amount = Math.min(1, Math.max(0, value));
        draw();
      },
      turn(delta = 0.35) {
        orbit(delta, 0);
      },
      orbit,
      resetView() {
        orientation.identity();
        draw();
      },
      secret(value) {
        if (secret === value || options.context !== "about") return;
        if (value && !secretArtwork) {
          secretArtwork = createArtworkSecret(options.design, keep);
          secretPivot.add(secretArtwork.root);
        }
        secret = value;
        secretPivot.visible = value;
        pivot.visible = !value;
        if (component)
          component.dataset.secretDesign = value ? options.design : "none";
        if (value) {
          subjectOrientation.copy(orientation);
          orientation.identity();
          replaySecret();
        } else {
          revealing = false;
          delete host.dataset.secretProgress;
          orientation.copy(subjectOrientation);
          draw();
        }
      },
      replaySecret,
      seekSecret(value) {
        if (!secret || !Number.isFinite(value)) return;
        revealing = false;
        reveal = T.MathUtils.clamp(value, 0, 1);
        draw();
      },
      secretProgress: () => reveal,
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
