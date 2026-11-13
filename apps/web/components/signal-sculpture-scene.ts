import * as THREE from "three";

export interface SignalScene {
  setPaused(value: boolean): void;
  setExpanded(value: boolean): void;
  turn(): void;
  dispose(): void;
}

/** A conceptual instrument, never a visualization of measured research data. */
export function createSignalScene(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  onLost: () => void,
): SignalScene {
  let disposed = false;
  let frame = 0;
  const cleanups: Array<() => void> = [];
  // Register ownership immediately, before the next fallible initialization step.
  // The same cleanup handles partial construction and normal teardown.
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    for (const cleanup of cleanups.reverse()) {
      try {
        cleanup();
      } catch {
        // A failed GPU release must not prevent the remaining resources releasing.
      }
    }
    cleanups.length = 0;
  }
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    cleanups.push(() => renderer.forceContextLoss());
    cleanups.push(() => renderer.dispose());
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
    camera.position.set(0, 0.8, 10.7);
    camera.lookAt(0, 0, 0);
    const sculpture = new THREE.Group();
    sculpture.rotation.set(0.32, 0, -0.28);
    scene.add(sculpture);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = matchMedia("(max-width: 700px)");
    const keep = <T extends { dispose(): void }>(value: T): T => {
      cleanups.push(() => value.dispose());
      return value;
    };
    const accent = keep(
      new THREE.LineBasicMaterial({ transparent: true, opacity: 0.7 }),
    );
    const faint = keep(
      new THREE.LineBasicMaterial({ transparent: true, opacity: 0.2 }),
    );
    const solid = keep(new THREE.MeshBasicMaterial());
    const coreMaterial = keep(
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.07 }),
    );
    const pointMaterial = keep(
      new THREE.PointsMaterial({
        size: 0.025,
        transparent: true,
        opacity: 0.7,
      }),
    );
    const rings: THREE.Group[] = [];
    const beads: THREE.Mesh[] = [];
    const beadGeometry = keep(new THREE.SphereGeometry(0.055, 10, 8));
    const segments = mobile.matches ? 100 : 180;
    for (let layer = 0; layer < 3; layer++) {
      const ring = new THREE.Group();
      ring.rotation.set(layer * 0.62, layer * 0.7, layer * 0.23);
      const radius = 1.65 + layer * 0.38;
      // Parallel latitude bands form an open, architectural torus.
      for (let band = 0; band < 7; band++) {
        const angle = (band / 7) * Math.PI * 2;
        const points = Array.from({ length: segments }, (_, i) => {
          const phase = (i / segments) * Math.PI * 2;
          const r = radius + Math.cos(angle) * 0.12;
          return new THREE.Vector3(
            Math.cos(phase) * r,
            Math.sin(angle) * 0.12,
            Math.sin(phase) * r,
          );
        });
        ring.add(
          new THREE.LineLoop(
            keep(new THREE.BufferGeometry()).setFromPoints(points),
            band === 0 ? accent : faint,
          ),
        );
      }
      const bead = new THREE.Mesh(beadGeometry, solid);
      ring.add(bead);
      beads.push(bead);
      rings.push(ring);
      sculpture.add(ring);
    }
    const coreGeometry = keep(new THREE.IcosahedronGeometry(0.64, 0));
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.add(
      new THREE.LineSegments(
        keep(new THREE.EdgesGeometry(coreGeometry)),
        accent,
      ),
    );
    sculpture.add(core);
    const coordinates: number[] = [];
    const count = mobile.matches ? 180 : 420;
    for (let i = 0; i < count; i++) {
      const phase = i * 2.39996323;
      const radius = 1.12 + (i % 19) * 0.068;
      coordinates.push(
        Math.cos(phase) * radius,
        Math.sin(i * 0.71) * 0.45,
        Math.sin(phase) * radius,
      );
    }
    const cloudGeometry = keep(new THREE.BufferGeometry());
    cloudGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(coordinates, 3),
    );
    sculpture.add(new THREE.Points(cloudGeometry, pointMaterial));

    let lost = false;
    let visible = false;
    let paused = false;
    let expanded = false;
    let last = 0;
    let time = 0;
    function pose() {
      rings.forEach((ring, i) => {
        ring.position.y = expanded ? (i - 1) * 0.85 : 0;
        const phase = time * (0.28 + i * 0.09) + i * 2.1;
        const radius = 1.65 + i * 0.38;
        beads[i].position.set(
          Math.cos(phase) * radius,
          0,
          Math.sin(phase) * radius,
        );
      });
      core.rotation.set(time * 0.12, time * 0.19, 0);
    }
    function draw() {
      if (disposed || lost || !visible || document.hidden) return;
      pose();
      try {
        renderer.render(scene, camera);
      } catch {
        lost = true;
        cancelAnimationFrame(frame);
        onLost();
      }
    }
    function tick(now: number) {
      frame = 0;
      if (
        disposed ||
        lost ||
        !visible ||
        document.hidden ||
        paused ||
        reduced.matches
      )
        return;
      if (now - last >= 1000 / 30) {
        const delta = last ? Math.min((now - last) / 1000, 0.08) : 0;
        time += delta;
        sculpture.rotation.y += delta * 0.07;
        last = now;
        draw();
      }
      if (!disposed && !lost) frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      draw();
      if (
        !disposed &&
        !lost &&
        visible &&
        !document.hidden &&
        !paused &&
        !reduced.matches
      )
        frame = requestAnimationFrame(tick);
    }
    function resize() {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height || disposed) return;
      renderer.setPixelRatio(
        Math.min(devicePixelRatio || 1, mobile.matches ? 1.25 : 1.5),
      );
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = camera.aspect < 1.15 ? 12.8 : 10.7;
      camera.updateProjectionMatrix();
      draw();
    }
    function theme() {
      const css = getComputedStyle(host);
      const color = css.getPropertyValue("--atlas-accent").trim() || "#6999ff";
      [accent, faint, solid, coreMaterial, pointMaterial].forEach((material) =>
        material.color.set(color),
      );
      draw();
    }
    function contextLost(event: Event) {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(frame);
      onLost();
    }
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    cleanups.push(() => visibility.disconnect());
    visibility.observe(host);
    const sizes = new ResizeObserver(resize);
    cleanups.push(() => sizes.disconnect());
    sizes.observe(host);
    const themes = new MutationObserver(theme);
    cleanups.push(() => themes.disconnect());
    themes.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-design"],
    });
    cleanups.push(() => document.removeEventListener("visibilitychange", sync));
    document.addEventListener("visibilitychange", sync);
    cleanups.push(() => reduced.removeEventListener("change", sync));
    reduced.addEventListener("change", sync);
    cleanups.push(() =>
      canvas.removeEventListener("webglcontextlost", contextLost),
    );
    canvas.addEventListener("webglcontextlost", contextLost);
    theme();
    resize();
    return {
      setPaused(value) {
        paused = value;
        sync();
      },
      setExpanded(value) {
        expanded = value;
        draw();
      },
      turn() {
        sculpture.rotation.y += Math.PI / 6;
        draw();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
