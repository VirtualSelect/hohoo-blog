import * as T from "three";
import type { Sculpture } from "./theme-artwork-models";

type Keep = <V extends { dispose(): void }>(value: V) => V;

/** Nine solid curved sectors share one circular, genuinely open bore. */
export function createIrisSculpture(keep: Keep, silver: T.Material): Sculpture {
  const root = new T.Group();
  root.name = "cyclic-nine-leaf-iris";

  const bladeMaterials = ["#3e4749", "#485154", "#535b5d"].map((color) =>
    keep(
      new T.MeshStandardMaterial({ color, metalness: 0.72, roughness: 0.42 }),
    ),
  );
  const mesh = (
    geometry: T.BufferGeometry,
    material: T.Material,
    parent: T.Object3D = root,
  ) => {
    const object = new T.Mesh(keep(geometry), material);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const frame = new T.Shape();
  frame.absarc(0, 0, 1.77, 0, Math.PI * 2, false);
  const bore = new T.Path();
  bore.absarc(0, 0, 1.46, 0, Math.PI * 2, true);
  frame.holes.push(bore);
  const ring = mesh(
    new T.ExtrudeGeometry(frame, {
      depth: 0.25,
      bevelEnabled: true,
      bevelSize: 0.015,
      bevelThickness: 0.015,
      bevelSegments: 2,
      curveSegments: 64,
      steps: 1,
    }),
    silver,
  );
  ring.position.z = -0.04;
  const segments = 48,
    radialSteps = 8;
  const positions: number[] = [],
    indices: number[] = [];
  const row = radialSteps + 1,
    layer = (segments + 1) * row;
  for (let side = 0; side < 2; side++)
    for (let a = 0; a <= segments; a++)
      for (let r = 0; r <= radialSteps; r++)
        positions.push(0, 0, side ? 0.064 : 0.06);
  const quad = (a: number, b: number, c: number, d: number) =>
    indices.push(a, b, d, b, c, d);
  for (let a = 0; a < segments; a++)
    for (let r = 0; r < radialSteps; r++) {
      const i = a * row + r;
      quad(i, i + 1, i + row + 1, i + row);
      quad(i + layer, i + row + layer, i + row + 1 + layer, i + 1 + layer);
    }
  for (let a = 0; a < segments; a++) {
    const i = a * row;
    quad(i, i + row, i + row + layer, i + layer);
    const j = i + radialSteps;
    quad(j, j + layer, j + row + layer, j + row);
  }
  for (let r = 0; r < radialSteps; r++) {
    quad(r, r + layer, r + 1 + layer, r + 1);
    const j = segments * row + r;
    quad(j, j + 1, j + 1 + layer, j + layer);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  // The angular/radial grid above winds inward; reverse the entire closed shell.
  for (let i = 0; i < indices.length; i += 3) {
    [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  }
  geometry.setIndex(indices);
  const updateBlade = (time: number) => {
    const opening = Math.sin(time * 0.6);
    const inner = 0.5 + opening * 0.075;
    const attribute = geometry.getAttribute("position");
    for (let side = 0; side < 2; side++)
      for (let a = 0; a <= segments; a++)
        for (let r = 0; r <= radialSteps; r++) {
          const t = r / radialSteps;
          const radius = inner + (1.66 - inner) * t;
          // Curved seams evoke overlapping blades, but the bore never leaves its centre.
          const angle =
            ((a / segments) * Math.PI * 2) / 9 + t * 0.28 + opening * 0.035;
          attribute.setXYZ(
            side * layer + a * row + r,
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            side ? 0.064 : 0.06,
          );
        }
    attribute.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  };
  updateBlade(0);
  for (let i = 0; i < 9; i++) {
    const phase = (i * Math.PI * 2) / 9;
    const pivot = new T.Group();
    pivot.name = "iris-pivot-" + i;
    pivot.rotation.z = phase;
    root.add(pivot);
    const blade = mesh(
      geometry,
      bladeMaterials[i % bladeMaterials.length],
      pivot,
    );
    blade.name = "iris-blade-" + i;
    const pin = mesh(new T.CylinderGeometry(0.035, 0.035, 0.27, 10), silver);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(Math.cos(phase) * 1.56, Math.sin(phase) * 1.56, 0.09);
  }
  root.rotation.set(0.18, 0.22, 0);
  return {
    root,
    update(time) {
      updateBlade(time);
    },
  };
}
