import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

type Keep = <V extends { dispose(): void }>(value: V) => V;
type Surface = T.MeshStandardMaterial;
type Point = [number, number, number];
const tau = Math.PI * 2;

export function makeObservatoryAtlas(
  design: string,
  about: boolean,
  keep: Keep,
) {
  const root = new T.Group();
  const moves: Array<(amount: number) => void> = [];
  const material = (color: string, metalness = 0, roughness = 0.54) =>
    keep(
      new T.MeshStandardMaterial({
        color,
        metalness,
        roughness,
        side: T.DoubleSide,
      }),
    );
  const brass = material("#b1965c", 0.77, 0.31);
  const ink = material("#152330", 0.63, 0.29);
  const enamel = material("#294454", 0.49, 0.35);
  const nickel = material("#abc1c1", 0.8, 0.25);
  const wood = material("#9f6943", 0.07, 0.63);
  const paleWood = material("#c99d70", 0.06, 0.52);
  const blue = material("#187d82", 0.14, 0.58);
  const paper = material("#e7dfc8", 0.02, 0.76);
  function mesh(g: T.BufferGeometry, m: Surface, p: T.Object3D = root) {
    const o = new T.Mesh(keep(g), m);
    o.castShadow = true;
    o.receiveShadow = true;
    p.add(o);
    return o;
  }
  function part(p: T.Object3D = root) {
    const g = new T.Group();
    p.add(g);
    return g;
  }
  function box(
    w: number,
    h: number,
    d: number,
    m: Surface,
    x: number,
    y: number,
    z: number,
    p: T.Object3D = root,
    r = 0.035,
  ) {
    const o = mesh(
      new RoundedBoxGeometry(w, h, d, 2, Math.min(w / 3, h / 3, d / 3, r)),
      m,
      p,
    );
    o.position.set(x, y, z);
    return o;
  }
  function pin(
    rad: number,
    len: number,
    m: Surface,
    x: number,
    y: number,
    z: number,
    p: T.Object3D = root,
  ) {
    const o = mesh(new T.CylinderGeometry(rad, rad, len, 24), m, p);
    o.position.set(x, y, z);
    return o;
  }
  function sphere(
    rad: number,
    m: Surface,
    x: number,
    y: number,
    z: number,
    p: T.Object3D = root,
  ) {
    const o = mesh(new T.SphereGeometry(rad, 18, 12), m, p);
    o.position.set(x, y, z);
    return o;
  }
  function rod(
    a: Point,
    b: Point,
    r: number,
    m: Surface,
    p: T.Object3D = root,
  ) {
    const v = new T.Vector3(...a),
      w = new T.Vector3(...b),
      dir = w.clone().sub(v);
    const o = mesh(new T.CylinderGeometry(r, r, dir.length(), 8), m, p);
    o.position.copy(v).lerp(w, 0.5);
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    return o;
  }
  // Projected objects sit on real supports. Rotating the whole grouped model reveals its underside.
  function geode() {
    const basalt = material("#283545", 0.32, 0.6),
      agate = material("#afbcc6", 0.28, 0.38);
    const facets = ["#536b9e", "#79a5d0", "#b0dbeb", "#38648b", "#839bc7"].map(
      (c) => material(c, 0.48, 0.22),
    );
    box(2.4, 0.13, 1.22, ink, 0, -1, 0);
    for (const side of [-1, 1]) {
      box(0.79, 0.08, 0.88, enamel, side * 0.57, -0.895, 0);
      for (const z of [-0.32, 0.32])
        rod([side * 0.59, -0.85, z], [side * 0.48, -0.48, z], 0.048, brass);
      const jaw = part(),
        n = 34,
        verts: number[] = [],
        indices: number[] = [];
      // Irregular hollow geode, flared silicate rind and recessed cut face share the same rim.
      const plane = T.MathUtils.degToRad(side * 29);
      function point(u: number, v: number) {
        const ripple =
          1 +
          0.075 * Math.sin(3 * u + 0.3) +
          0.048 * Math.sin(7 * u + 0.8) +
          0.034 * Math.cos(11 * u);
        const y = Math.sin(u) * v * 0.79 * ripple,
          z = Math.cos(u) * v * 0.78 * ripple;
        return [
          side *
            0.58 *
            Math.sqrt(Math.max(0, 1 - v * v)) *
            (1 + 0.12 * Math.sin(4 * u) * v),
          y,
          z,
        ] as Point;
      }
      for (let j = 0; j <= 10; j++) {
        const v = Math.sin(((j + 0.005) / 10.005) * Math.PI * 0.5);
        for (let i = 0; i < n; i++) verts.push(...point((tau * i) / n, v));
        if (j)
          for (let i = 0; i < n; i++) {
            const q = (j - 1) * n + i,
              r = (j - 1) * n + ((i + 1) % n);
            indices.push(q, r, q + n, r, r + n, q + n);
          }
      }
      const shell = new T.BufferGeometry();
      shell.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
      shell.setIndex(indices);
      shell.computeVertexNormals();
      const shellMat = basalt.clone();
      shellMat.flatShading = true;
      mesh(shell, keep(shellMat), jaw);
      for (let i = 0; i < n; i++) {
        const u = (tau * i) / n,
          w = (tau * (i + 1)) / n,
          a = point(u, 1),
          b = point(w, 1);
        const ring = new T.BufferGeometry();
        const c: Point = [-0.038 * side, a[1] * 0.84, a[2] * 0.84],
          e: Point = [-0.038 * side, b[1] * 0.84, b[2] * 0.84];
        ring.setAttribute(
          "position",
          new T.Float32BufferAttribute(
            [
              ...a,
              ...b,
              ...c,
              ...b,
              ...e,
              ...c,
              ...c,
              ...e,
              ...[0.29 * side, 0, 0],
            ],
            3,
          ),
        );
        ring.computeVertexNormals();
        mesh(ring, agate, jaw);
      }
      for (let j = 0; j < 62; j++) {
        const r = 0.77 * Math.sqrt((j + 0.4) / 62),
          u = j * 2.399963 + 0.35;
        const y = r * Math.sin(u) * 0.8,
          z = r * Math.cos(u) * 0.8;
        const k = 0.13 + 0.12 * (0.5 + 0.5 * Math.sin(j * 12.7));
        const g = part(jaw);
        g.position.set(side * (0.11 * (1 - r) - 0.025), y, z);
        g.quaternion.setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          new T.Vector3(
            -side,
            0.18 * Math.sin(u * 2),
            0.25 * Math.cos(u),
          ).normalize(),
        );
        const crystal = mesh(
          new T.CylinderGeometry(0.071, 0.099, k, 5, 1),
          facets[j % 5],
          g,
        );
        crystal.position.y = k / 2;
        const tip = mesh(new T.ConeGeometry(0.071, 0.1, 5), facets[j % 5], g);
        tip.position.y = k + 0.05;
      }
      moves.push((a) => {
        jaw.position.set(side * (0.46 + 0.4 * a), -0.01 + 0.08 * a, 0);
        jaw.rotation.y = side * (0.64 + a * 0.51);
        jaw.rotation.z = plane * 0.29;
      });
    }
    root.rotation.set(0.18, -0.03, 0.01);
  }
  function lantern() {
    const amber = material("#f7d896", 0.06, 0.32);
    amber.emissive.set("#ffa54a");
    amber.emissiveIntensity = 0.48;
    const glazed = material("#243c59", 0.75, 0.3);
    pin(0.76, 0.1, ink, 0, -0.88, 0);
    pin(0.68, 0.06, brass, 0, -0.8, 0);
    pin(0.59, 0.23, enamel, 0, -0.655, 0);
    pin(0.066, 1.2, brass, 0, -0.01, 0);
    const bulb = sphere(0.34, amber, 0, 0.18, 0);
    bulb.scale.set(0.76, 1.45, 0.76);
    for (let i = 0; i < 6; i++) {
      const theta = (tau * i) / 6 + 0.07,
        frame = part(),
        flap = part(frame);
      frame.rotation.y = theta;
      flap.position.set(0, -0.49, 0.465);
      const shape = new T.Shape();
      shape.moveTo(-0.265, 0);
      shape.lineTo(0.265, 0);
      shape.lineTo(0.27, 0.9);
      shape.lineTo(0.11, 1.07);
      shape.lineTo(-0.11, 1.07);
      shape.lineTo(-0.27, 0.9);
      shape.closePath();
      for (let j = 0; j < 12; j++) {
        const x = 0.19 * Math.sin(i * 3.77 + j * 2.394),
          y = 0.13 + 0.7 * ((j + 0.2) / 12);
        const hole = new T.Path();
        hole.absarc(x, y, 0.014 + 0.017 * ((j + i) % 3), 0, tau, true);
        shape.holes.push(hole);
      }
      const plate = mesh(
        new T.ExtrudeGeometry(shape, {
          depth: 0.028,
          bevelEnabled: false,
          curveSegments: 6,
        }),
        glazed,
        flap,
      );
      plate.position.z = -0.015;
      rod([-0.263, 0.03, 0.023], [-0.262, 0.9, 0.023], 0.013, brass, flap);
      rod([0.263, 0.03, 0.023], [0.262, 0.9, 0.023], 0.013, brass, flap);
      rod([-0.29, 0, 0], [0.29, 0, 0], 0.042, nickel, flap);
      moves.push((a) => {
        flap.rotation.x = 0.07 + a * 0.9;
      });
    }
    const cap = part();
    pin(0.36, 0.08, brass, 0, 0.66, 0, cap);
    pin(0.29, 0.08, ink, 0, 0.73, 0, cap);
    const ring = mesh(new T.TorusGeometry(0.15, 0.028, 9, 28), brass, cap);
    ring.position.y = 0.92;
    moves.push((a) => {
      cap.position.y = 0.04 + a * 0.2;
    });
    root.rotation.set(0.17, -0.26, -0.015);
  }
  function loom() {
    const darkWood = material("#624333", 0.09, 0.56);
    const threads = ["#146f75", "#4ca5a2", "#286b75", "#87b8ac"].map((c) =>
      material(c, 0, 0.9),
    );
    box(2.52, 0.16, 1.61, wood, 0, -0.65, 0);
    box(2.4, 0.1, 1.48, paleWood, 0, -0.54, 0);
    const frame = part();
    frame.rotation.x = 0.12;
    frame.position.y = -0.16;
    for (const side of [-1, 1]) {
      box(0.18, 0.32, 1.72, darkWood, side * 1.07, 0, 0, frame);
      for (const z of [-0.67, 0.67])
        pin(0.047, 0.04, brass, side * 1.07, 0.18, z, frame);
      rod(
        [side * 1.04, -0.5, -0.52],
        [side * 1.04, 0.12, -0.62],
        0.085,
        paleWood,
      );
    }
    for (const z of [-0.7, 0.7])
      rod([-1.27, 0.03, z], [1.23, 0.03, z], 0.114, wood, frame);
    const runs = new Map<Surface, T.Matrix4[]>();
    const up = new T.Vector3(0, 1, 0);
    function strand(a: Point, b: Point, r: number, mat: Surface) {
      const start = new T.Vector3(...a),
        end = new T.Vector3(...b),
        dir = end.clone().sub(start);
      const length = dir.length(),
        center = start.lerp(end, 0.5);
      const matrix = new T.Matrix4().compose(
        center,
        new T.Quaternion().setFromUnitVectors(up, dir.normalize()),
        new T.Vector3(r, length, r),
      );
      const group = runs.get(mat) ?? [];
      group.push(matrix);
      runs.set(mat, group);
    }
    for (let i = 0; i < 53; i++) {
      const x = -0.94 + i * 0.0362;
      strand([x, 0.119, -0.68], [x, 0.119, 0.7], 0.0062, paper);
    }
    // Stepped diamonds are built from real interlaced lengths of coloured weft.
    for (let row = 0; row < 34; row++) {
      const z = 0.683 - row * 0.0265;
      for (let i = 0; i < 15; i++) {
        const x = -0.92 + i * 0.1227;
        const diamond = Math.abs((i % 6) - 3) + Math.abs((row % 12) - 6) / 2;
        const tone =
          diamond < 2 ? 2 : diamond < 3.2 ? 1 : row % 11 === 0 ? 3 : 0;
        strand(
          [x, 0.135 + ((row + i) % 2) * 0.004, z],
          [x + 0.124, 0.135 + ((row + i + 1) % 2) * 0.004, z],
          0.014,
          threads[tone],
        );
      }
    }
    const fiber = keep(new T.CylinderGeometry(1, 1, 1, 6));
    for (const [mat, matrices] of runs) {
      const batch = keep(new T.InstancedMesh(fiber, mat, matrices.length));
      matrices.forEach((matrix, index) => batch.setMatrixAt(index, matrix));
      batch.receiveShadow = true;
      frame.add(batch);
    }
    const heddle = part(frame);
    rod([-1.07, 0.36, -0.34], [1.07, 0.36, -0.34], 0.045, paleWood, heddle);
    for (let i = 0; i < 18; i++)
      rod(
        [-0.89 + i * 0.105, 0.15, -0.34],
        [-0.89 + i * 0.105, 0.33, -0.34],
        0.009,
        nickel,
        heddle,
      );
    const shuttle = part(frame);
    const body = sphere(0.25, wood, 0, 0, 0, shuttle);
    body.scale.set(1.7, 0.25, 0.32);
    rod([-0.2, 0.052, 0], [0.2, 0.052, 0], 0.064, blue, shuttle);
    moves.push((a) => {
      shuttle.position.set(-0.62 + a * 1.23, 0.23, -0.255);
      heddle.position.y = 0.04 + 0.16 * a;
    });
    root.rotation.set(0.59, -0.34, -0.03);
  }
  function atlas() {
    const glass = material("#a4d4c9", 0.03, 0.27);
    glass.transparent = true;
    glass.opacity = 0.24;
    glass.depthWrite = false;
    const coral = material("#b16547", 0.2, 0.48);
    box(2.58, 0.19, 1.66, wood, 0, -0.68, 0);
    box(2.48, 0.05, 1.58, paper, 0, -0.558, 0);
    const layers = [part(), part(), part()];
    const routePaths: Point[][] = [
      [
        [-0.99, 0, 0.48],
        [-0.7, 0, 0.26],
        [-0.29, 0, 0.31],
        [0.02, 0, -0.02],
        [0.58, 0, -0.17],
        [0.9, 0, -0.43],
      ],
      [
        [-0.91, 0, -0.4],
        [-0.49, 0, -0.22],
        [-0.29, 0, 0.31],
        [0.15, 0, 0.43],
        [0.44, 0, 0.23],
        [0.91, 0, 0.35],
      ],
      [
        [-0.79, 0, 0.04],
        [-0.49, 0, -0.22],
        [-0.01, 0, -0.32],
        [0.23, 0, -0.01],
        [0.58, 0, -0.17],
        [0.82, 0, -0.49],
      ],
    ];
    const colors = [blue, coral, enamel];
    for (let k = 0; k < 3; k++) {
      const layer = layers[k];
      box(2.36, 0.045, 1.44, glass, 0, 0, 0, layer);
      for (const x of [-1.16, 1.16])
        rod([x, 0.005, -0.7], [x, 0.005, 0.7], 0.011, nickel, layer);
      for (const z of [-0.7, 0.7])
        rod([-1.16, 0.005, z], [1.16, 0.005, z], 0.013, nickel, layer);
      const points = routePaths[k].map(([x, , z]) => [x, 0.036, z] as Point);
      points.forEach((pt, i) => {
        if (i) rod(points[i - 1], pt, 0.016, colors[k], layer);
        pin(
          i === 0 || i === points.length - 1 ? 0.054 : 0.035,
          0.018,
          colors[k],
          pt[0],
          0.045,
          pt[2],
          layer,
        );
      });
      for (let j = 0; j < 12; j++)
        rod(
          [-0.9 + j * 0.15, 0.033, 0.64],
          [-0.9 + j * 0.15, 0.033, 0.61 - (j % 3 === 0 ? 0.035 : 0)],
          0.004,
          ink,
          layer,
        );
      moves.push((a) => {
        layer.position.y = -0.44 + k * (0.13 + 0.31 * a);
      });
    }
    for (const x of [-1.11, 1.11])
      for (const z of [-0.62, 0.62]) {
        const post = pin(0.028, 1.13, brass, x, -0.04, z);
        const cap = sphere(0.049, brass, x, 0.53, z);
        moves.push((a) => {
          post.scale.y = (0.41 + 0.72 * a) / 1.13;
          post.position.y = -0.55 + (0.41 + 0.72 * a) / 2;
          cap.position.y = -0.55 + 0.41 + 0.72 * a;
        });
      }
    root.rotation.set(0.54, -0.45, -0.01);
  }
  if (design === "space") {
    if (about) lantern();
    else geode();
  } else if (about) atlas();
  else loom();
  function update(_time: number, amount: number) {
    for (const move of moves) move(amount);
  }
  update(0, 0);
  return { root, update };
}
