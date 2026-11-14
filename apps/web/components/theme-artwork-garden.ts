import * as T from "three";
import { thickSheet } from "./theme-artwork-geometry.ts";

type Keep = <V extends { dispose(): void }>(value: V) => V;

/** Botanical sculpture: every leaf, vein and seed grows from a physical stem. */
export function createGardenSculpture(tree: boolean, keep: Keep) {
  const root = new T.Group();
  root.name = tree ? "garden-star-tree" : "garden-folded-sprout";
  const mat = (color: string, metalness = 0) =>
    keep(new T.MeshStandardMaterial({ color, metalness, roughness: 0.58 }));
  const green = mat("#3d713f"),
    youngGreen = mat("#5c8644"),
    reverse = mat("#91ad79"),
    edge = mat("#709258"),
    bark = mat("#7a7955"),
    upperVein = mat("#6b9250"),
    lowerVein = mat("#9ab47e");
  const cream = mat("#e5dfbd");
  const seedLight = keep(
    new T.MeshStandardMaterial({
      color: "#ffe4a2",
      emissive: "#efbd65",
      emissiveIntensity: 0.45,
      metalness: 0.2,
      roughness: 0.38,
    }),
  );
  const constellationMaterial = keep(
    new T.LineBasicMaterial({
      color: "#d4b36d",
      transparent: true,
      opacity: 0.26,
    }),
  );
  const seeds: T.Mesh[] = [];
  const hinges: Array<{
    group: T.Group;
    axis: T.Vector3;
    closed: number;
    open: number;
  }> = [];
  const starChains: Array<{ line: T.Line; indices: number[] }> = [];
  function hinge(
    name: string,
    origin: T.Vector3,
    azimuth: number,
    closed: number,
    open: number,
    parent: T.Object3D = root,
  ) {
    const group = new T.Group();
    group.name = name;
    group.position.copy(origin);
    parent.add(group);
    hinges.push({
      group,
      axis: new T.Vector3(Math.sin(azimuth), 0, -Math.cos(azimuth)),
      closed,
      open,
    });
    return group;
  }
  function mesh(
    name: string,
    geometry: T.BufferGeometry,
    material: T.Material | T.Material[],
    parent: T.Object3D = root,
  ) {
    const object = new T.Mesh(keep(geometry), material);
    object.name = name;
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function tube(
    name: string,
    points: T.Vector3[],
    radius: number,
    material = bark,
    parent: T.Object3D = root,
  ) {
    const curve = new T.CatmullRomCurve3(points);
    const object = mesh(
      name,
      new T.TubeGeometry(curve, 32, radius, 8, false),
      material,
      parent,
    );
    // Subpixel vein shadows break into dots; the blade itself owns leaf shading.
    if (/^garden-(leaf-|crown-leaf-|terminal-bud)/.test(name)) {
      object.castShadow = object.receiveShadow = false;
    }
    return curve;
  }
  const base = mesh(
    "garden-closed-root-disc",
    new T.CylinderGeometry(0.38, 0.46, 0.16, 48),
    cream,
  );
  base.position.y = -1.65;
  const trunk = tube(
    "garden-trunk",
    [
      new T.Vector3(0, -1.62, 0),
      new T.Vector3(-0.08, -0.7, 0.03),
      new T.Vector3(0.06, 0.4, 0),
      new T.Vector3(0, tree ? 1.95 : 1.25, 0),
    ],
    0.062,
  );
  const trunkGeometry = (root.getObjectByName("garden-trunk") as T.Mesh)
    .geometry as T.TubeGeometry;
  const trunkPositions = trunkGeometry.getAttribute("position");
  const { tubularSegments, radialSegments } = trunkGeometry.parameters;
  for (let i = 0; i <= tubularSegments; i++) {
    const center = trunk.getPointAt(i / tubularSegments);
    const taper = 1 - 0.82 * Math.pow(i / tubularSegments, 2);
    for (let j = 0; j <= radialSegments; j++) {
      const index = i * (radialSegments + 1) + j;
      const point = new T.Vector3()
        .fromBufferAttribute(trunkPositions, index)
        .sub(center)
        .multiplyScalar(taper)
        .add(center);
      trunkPositions.setXYZ(index, point.x, point.y, point.z);
    }
  }
  trunkPositions.needsUpdate = true;
  trunkGeometry.computeVertexNormals();
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    tube(
      `garden-root-${i}`,
      [
        new T.Vector3(0, -1.42, 0),
        new T.Vector3(Math.cos(a) * 0.2, -1.54, Math.sin(a) * 0.2),
        new T.Vector3(Math.cos(a) * 0.36, -1.58, Math.sin(a) * 0.36),
      ],
      0.035,
    );
  }
  function leaf(
    name: string,
    start: T.Vector3,
    direction: T.Vector3,
    length: number,
    width: number,
    young = false,
    parent: T.Object3D = root,
  ) {
    const axis = direction.clone().normalize();
    const up = new T.Vector3(0, 1, 0);
    // thickSheet's front follows du × dv. This winding keeps the green
    // adaxial surface facing the light instead of facing the ground.
    const across = new T.Vector3().crossVectors(up, axis).normalize();
    const normal = new T.Vector3().crossVectors(axis, across).normalize();
    const point = (u: number, v: number) => {
      const cross = v * 2 - 1;
      const envelope = Math.sin(Math.PI * u);
      return start
        .clone()
        .addScaledVector(axis, u * length)
        .addScaledVector(
          across,
          cross * (0.002 + Math.pow(envelope, 0.85) * width * (1 - u * 0.28)),
        )
        .addScaledVector(
          normal,
          envelope * length * (0.055 + 0.035 * (1 - cross * cross)),
        )
        .addScaledVector(up, -length * 0.16 * u * u * u);
    };
    const thickness = 0.012;
    mesh(
      name,
      thickSheet(point, 28, 10, thickness),
      [young ? youngGreen : green, reverse, edge],
      parent,
    );
    const veinPoint = (u: number, v: number, face: number) => {
      const du = point(Math.min(1, u + 0.0005), v).sub(
        point(Math.max(0, u - 0.0005), v),
      );
      const dv = point(u, Math.min(1, v + 0.0005)).sub(
        point(u, Math.max(0, v - 0.0005)),
      );
      return point(u, v).addScaledVector(
        du.cross(dv).normalize(),
        face * (thickness / 2 + 0.001),
      );
    };
    for (const face of [1, -1]) {
      const suffix = face === 1 ? "" : "-underside";
      const veinMaterial = face === 1 ? upperVein : lowerVein;
      tube(
        `${name}-midrib${suffix}`,
        Array.from({ length: 25 }, (_, i) =>
          veinPoint(0.02 + (i / 24) * 0.95, 0.5, face),
        ),
        face === 1 ? 0.0045 : 0.006,
        veinMaterial,
        parent,
      );
      for (let j = 1; j <= 4; j++)
        for (const side of [-1, 1]) {
          const u = j * 0.16;
          tube(
            `${name}-vein-${j}-${side}${suffix}`,
            Array.from({ length: 9 }, (_, i) => {
              const t = i / 8;
              return veinPoint(
                u + t * 0.16,
                0.5 + side * 0.39 * Math.sin((t * Math.PI) / 2),
                face,
              );
            }),
            face === 1 ? 0.002 : 0.003,
            veinMaterial,
            parent,
          );
        }
    }
  }
  const count = tree ? 7 : 6;
  for (let i = 0; i < count; i++) {
    const a = i * 2.399 + 0.4;
    const start = trunk.getPoint(0.22 + i * (tree ? 0.085 : 0.1));
    const branchJoint = hinge(
      `garden-branch-joint-${i}`,
      start,
      a,
      -0.32,
      0.07,
    );
    const end = new T.Vector3(
      Math.cos(a) * (tree ? 1.15 : 0.28),
      tree ? 0.65 : 0.09,
      Math.sin(a) * (tree ? 1.15 : 0.28),
    );
    const branch = tube(
      `garden-branch-${i}`,
      [
        new T.Vector3(),
        new T.Vector3()
          .clone()
          .lerp(end, 0.5)
          .add(new T.Vector3(0, 0.15, 0)),
        end,
      ],
      tree ? 0.026 : 0.023,
      bark,
      branchJoint,
    );
    const leafJoint = hinge(
      `garden-leaf-joint-${i}`,
      tree ? branch.getPoint(0.52) : end,
      a,
      -0.5,
      -0.2,
      branchJoint,
    );
    leaf(
      `garden-leaf-${i}`,
      new T.Vector3(),
      new T.Vector3(Math.cos(a), 0.24 + i * 0.06, Math.sin(a)),
      tree ? 0.65 : 1.2,
      tree ? 0.22 : 0.36,
      i >= count - 2,
      leafJoint,
    );
    if (tree) {
      const seed = mesh(
        `garden-star-seed-${i}`,
        new T.IcosahedronGeometry(0.075, 1),
        seedLight,
        branchJoint,
      );
      seed.position.copy(end);
      seeds.push(seed);
      const halo = mesh(
        `garden-seed-ring-${i}`,
        new T.TorusGeometry(0.12, 0.009, 6, 32),
        seedLight,
        branchJoint,
      );
      halo.position.copy(end);
      halo.rotation.set(0.3, a, 0.35);
    }
  }
  // A growing tip ends in young foliage, with short petioles hiding the cut stem.
  for (let i = 0; i < 3; i++) {
    const a = i * ((Math.PI * 2) / 3) + 0.65;
    const start = trunk.getPoint(0.94 + i * 0.03);
    const tip = start
      .clone()
      .add(new T.Vector3(Math.cos(a) * 0.08, 0.035, Math.sin(a) * 0.08));
    tube(
      `garden-crown-petiole-${i}`,
      [start, start.clone().lerp(tip, 0.5), tip],
      0.018,
    );
    const joint = hinge(`garden-crown-joint-${i}`, tip, a, -0.5, -0.15);
    leaf(
      `garden-crown-leaf-${i}`,
      new T.Vector3(),
      new T.Vector3(Math.cos(a), 0.6, Math.sin(a)),
      [0.53, 0.46, 0.58][i],
      [0.16, 0.14, 0.17][i],
      true,
      joint,
    );
  }
  leaf(
    "garden-terminal-bud",
    trunk.getPoint(1),
    new T.Vector3(0.18, 0.9, -0.12),
    0.24,
    0.065,
    true,
  );
  if (tree) {
    // Two restrained star chains, each anchored to physical branch-tip seeds.
    for (const [index, chain] of [
      [0, 2, 5],
      [1, 4, 6],
    ].entries()) {
      const line = new T.Line(
        keep(
          new T.BufferGeometry().setFromPoints(
            chain.map(() => new T.Vector3()),
          ),
        ),
        constellationMaterial,
      );
      line.name = "garden-constellation-" + index;
      root.add(line);
      starChains.push({ line, indices: chain });
    }
  }
  function update(_time: number, amount: number) {
    const opened = T.MathUtils.clamp(amount, 0, 1);
    // Articulate at each attachment: the trunk and base never stretch.
    for (const { group, axis, closed, open } of hinges)
      group.quaternion.setFromAxisAngle(
        axis,
        T.MathUtils.lerp(closed, open, opened),
      );
    root.updateWorldMatrix(true, true);
    for (const { line, indices } of starChains) {
      const positions = line.geometry.getAttribute("position");
      indices.forEach((index, i) => {
        const point = root.worldToLocal(
          seeds[index].getWorldPosition(new T.Vector3()),
        );
        positions.setXYZ(i, point.x, point.y, point.z);
      });
      positions.needsUpdate = true;
      line.geometry.computeBoundingSphere();
    }
    seedLight.emissiveIntensity = 0.45 + opened * 1.05;
    constellationMaterial.opacity = 0.26 + opened * 0.3;
  }
  update(0, 0);
  return { root, update };
}
