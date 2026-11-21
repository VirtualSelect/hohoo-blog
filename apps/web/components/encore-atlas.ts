import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

type Keep = <V extends { dispose(): void }>(v: V) => V;
type Pt = [number, number, number];
const TAU = 2 * Math.PI;
const ease = (a: number, b: number, t: number) =>
  T.MathUtils.smoothstep(t, a, b);

export function makeAtlasSecret(theme: string, keep: Keep) {
  const root = new T.Group(),
    moves: Array<(time: number, phase: number) => void> = [];
  const mats = new Map<string, T.MeshStandardMaterial>();
  function material(color: string, metal = 0, rough = 0.52, glow = 0) {
    const key = [color, metal, rough, glow].join("/");
    if (!mats.has(key))
      mats.set(
        key,
        keep(
          new T.MeshStandardMaterial({
            color,
            metalness: metal,
            roughness: rough,
            side: T.DoubleSide,
            emissive: glow ? color : "#000000",
            emissiveIntensity: glow,
          }),
        ),
      );
    return mats.get(key)!;
  }
  const navy = material("#263e62", 0.6, 0.29),
    edge = material("#9f7338", 0.76, 0.3),
    gold = material("#e6c582", 0.69, 0.26);
  function add(
    g: T.BufferGeometry,
    m: T.Material,
    p: T.Object3D = root,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const obj = new T.Mesh(keep(g), m);
    obj.position.set(x, y, z);
    obj.castShadow = true;
    obj.receiveShadow = true;
    p.add(obj);
    return obj;
  }
  function group(p: T.Object3D, x = 0, y = 0, z = 0) {
    const o = new T.Group();
    o.position.set(x, y, z);
    p.add(o);
    return o;
  }
  function block(
    w: number,
    h: number,
    d: number,
    m: T.Material,
    p: T.Object3D,
    x: number,
    y: number,
    z: number,
    r = 0.04,
  ) {
    return add(
      new RoundedBoxGeometry(
        w,
        h,
        d,
        2,
        Math.min(r, w * 0.23, h * 0.23, d * 0.23),
      ),
      m,
      p,
      x,
      y,
      z,
    );
  }
  function cylinder(
    m: T.Material,
    r: number,
    h: number,
    p: T.Object3D,
    x: number,
    y: number,
    z: number,
    top = r,
  ) {
    return add(new T.CylinderGeometry(top, r, h, 40), m, p, x, y, z);
  }
  function orb(
    radius: number,
    m: T.Material,
    p: T.Object3D,
    x: number,
    y: number,
    z: number,
  ) {
    return add(new T.SphereGeometry(radius, 28, 20), m, p, x, y, z);
  }
  function bar(a: Pt, b: Pt, r: number, m: T.Material, p: T.Object3D) {
    const u = new T.Vector3(...a),
      v = new T.Vector3(...b),
      delta = v.clone().sub(u);
    const obj = add(new T.CylinderGeometry(r, r, delta.length(), 8), m, p);
    obj.position.copy(u).lerp(v, 0.5);
    obj.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      delta.normalize(),
    );
    return obj;
  }
  function curve(points: T.Vector3[], r: number, m: T.Material, p: T.Object3D) {
    return add(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points),
        Math.max(points.length, 16),
        r,
        6,
        false,
      ),
      m,
      p,
    );
  }
  function ring(r: number, tube: number, m: T.Material, p: T.Object3D) {
    const o = add(new T.TorusGeometry(r, tube, 8, 70), m, p);
    o.rotation.x = Math.PI / 2;
    return o;
  }
  function planetarium() {
    const steel = material("#1b2a3f", 0.6, 0.3),
      warm = material("#ecc987", 0.33, 0.37, 0.17);
    cylinder(steel, 0.93, 0.14, root, 0, -0.84, 0);
    cylinder(edge, 0.96, 0.045, root, 0, -0.75, 0);
    cylinder(navy, 0.88, 0.21, root, 0, -0.64, 0, 0.92);
    cylinder(gold, 0.93, 0.035, root, 0, -0.51, 0);
    cylinder(steel, 0.9, 0.09, root, 0, -0.46, 0);
    for (let i = 0; i < 64; i++) {
      const a = (TAU * i) / 64,
        rad = i % 8 === 0 ? 0.76 : 0.83;
      bar(
        [0.885 * Math.cos(a), -0.403, 0.885 * Math.sin(a)],
        [rad * Math.cos(a), -0.403, rad * Math.sin(a)],
        i % 8 === 0 ? 0.011 : 0.005,
        gold,
        root,
      );
    }
    // Two real half-domes turn about the trunnions at their respective rims.
    const R = 0.78;
    for (const side of [-1, 1]) {
      const hinge = group(root, side * R, -0.405, 0),
        dome = group(hinge, -side * R, 0, 0);
      const phi0 = side === 1 ? Math.PI / 2 : -Math.PI / 2;
      add(
        new T.SphereGeometry(
          R,
          36,
          18,
          phi0,
          Math.PI,
          0.025,
          Math.PI / 2 - 0.025,
        ),
        navy,
        dome,
      );
      const points = (f: number) =>
        Array.from({ length: 23 }, (_, i) => {
          const theta = 0.016 + ((Math.PI / 2) * i) / 22;
          return new T.Vector3(
            -R * Math.cos(f) * Math.sin(theta),
            R * Math.cos(theta),
            R * Math.sin(f) * Math.sin(theta),
          );
        });
      for (let j = 0; j <= 4; j++)
        curve(
          points(phi0 + (j * Math.PI) / 4),
          j % 4 === 0 ? 0.018 : 0.01,
          j % 4 === 0 ? gold : edge,
          dome,
        );
      curve(
        Array.from(
          { length: 29 },
          (_, i) =>
            new T.Vector3(
              -R * Math.cos(phi0 + (Math.PI * i) / 28),
              0.003,
              R * Math.sin(phi0 + (Math.PI * i) / 28),
            ),
        ),
        0.021,
        edge,
        dome,
      );
      for (const z of [-0.19, 0.19])
        bar(
          [side * R, -0.41, z - 0.07],
          [side * R, -0.41, z + 0.07],
          0.057,
          gold,
          root,
        );
      moves.push((_t, p) => {
        hinge.rotation.z = -side * ease(0.02, 0.57, p) * 1.59;
      });
    }
    const lift = group(root),
      model = group(lift),
      pole = cylinder(edge, 0.034, 0.6, root, 0, -0.14, 0);
    cylinder(navy, 0.19, 0.055, lift, 0, -0.3, 0);
    cylinder(gold, 0.12, 0.06, lift, 0, -0.25, 0);
    bar([0, -0.24, 0], [0, 0.02, 0], 0.028, gold, lift);
    orb(0.26, warm, model, 0, 0.08, 0);
    const orbit = group(model, 0, 0.08, 0);
    orbit.rotation.set(0.27, 0.06, 0.35);
    const inner = add(
      new T.RingGeometry(0.345, 0.465, 72),
      material("#bf9e66", 0.68, 0.32),
      orbit,
    );
    inner.rotation.x = -Math.PI / 2;
    const outer = add(new T.RingGeometry(0.48, 0.508, 72), gold, orbit);
    outer.rotation.x = -Math.PI / 2;
    ring(0.44, 0.009, navy, orbit);
    const moon = group(model);
    orb(0.052, material("#cbdeeb", 0.37, 0.37, 0.14), moon, 0.7, 0.04, 0);
    const arch = group(lift, 0, 0.04, -0.1);
    arch.rotation.z = -0.27;
    const ap = Array.from({ length: 39 }, (_, i) => {
      const a = -0.2 + ((Math.PI + 0.4) * i) / 38;
      return new T.Vector3(0.71 * Math.cos(a), 0.71 * Math.sin(a), 0);
    });
    curve(ap, 0.018, edge, arch);
    for (const j of [0, 5, 11, 17, 24, 30, 38]) {
      const v = ap[j];
      orb(
        j === 17 ? 0.042 : 0.028,
        material("#d5e6ff", 0.3, 0.31, 0.5),
        arch,
        v.x,
        v.y,
        v.z,
      );
    }
    moves.push((t, p) => {
      const raise = ease(0.29, 0.82, p);
      lift.position.y = -0.45 + 0.84 * raise;
      lift.scale.setScalar(0.23 + 0.77 * raise);
      pole.scale.y = 0.18 + raise * 0.82;
      pole.position.y = -0.4 + 0.3 * pole.scale.y;
      orbit.rotation.y = 0.17 + 1.15 * ease(0.55, 1, p);
      moon.rotation.y =
        -1.4 + 1.85 * ease(0.65, 1, p) + 0.13 * Math.sin(t * 0.27) * p;
    });
    root.rotation.set(0.3, -0.3, -0.035);
  }
  function islands() {
    const teal = material("#207f83", 0.3, 0.33),
      sea = material("#7dbcb5", 0.28, 0.28),
      white = material("#f8e9cd", 0.04, 0.64);
    const spruce = material("#417b67", 0.04, 0.72),
      coral = material("#a65240", 0.1, 0.52),
      walnut = material("#976845", 0.14, 0.45);
    block(3.03, 0.15, 1.74, walnut, root, 0, -0.54, 0, 0.13);
    block(2.97, 0.04, 1.69, gold, root, 0, -0.445, 0, 0.09);
    block(2.91, 0.17, 1.63, teal, root, 0, -0.365, 0, 0.1);
    block(2.84, 0.035, 1.56, sea, root, 0, -0.267, 0, 0.09);
    // Each islet is cut on its own contour, with a pale, exposed coastal ledge.
    const sites = [
      [-0.94, 0.14, 0.4],
      [0.02, -0.13, 0.44],
      [0.98, 0.03, 0.37],
    ];
    function contour(radius: number, tier: number, idx: number) {
      const s = new T.Shape();
      for (let i = 0; i <= 48; i++) {
        const a = (TAU * i) / 48,
          r =
            radius *
            (1 +
              0.12 * Math.sin(3 * a + idx) +
              0.1 * Math.cos(5 * a + idx * 0.8));
        const x = Math.cos(a) * r,
          y = Math.sin(a) * r * 0.94;
        i ? s.lineTo(x, y) : s.moveTo(x, y);
      }
      s.closePath();
      const g = new T.ExtrudeGeometry(s, {
        depth: tier,
        bevelSegments: 1,
        bevelThickness: 0.014,
        bevelSize: 0.012,
        steps: 1,
      });
      g.rotateX(-Math.PI / 2);
      return g;
    }
    sites.forEach(([x, z, r], i) => {
      for (let tier = 0; tier < 3; tier++)
        add(
          contour(r * (1 - tier * 0.13), 0.072, i),
          [white, material("#7e9e83"), material("#a5b18b")][tier],
          root,
          x,
          -0.26 + tier * 0.084,
          z,
        );
    });
    for (const [x, z, h] of [
      [-0.99, 0.16, 0.37],
      [-1.14, 0.04, 0.25],
      [0.05, -0.26, 0.37],
      [-0.14, -0.22, 0.27],
      [0.86, -0.16, 0.28],
    ]) {
      cylinder(walnut, 0.023, 0.15, root, x, 0.02, z);
      add(
        new T.ConeGeometry(h * 0.27, h, 8),
        spruce,
        root,
        x,
        h * 0.48 + 0.06,
        z,
      );
    }
    const tower = group(root, 1, 0.015, 0.05);
    cylinder(white, 0.1, 0.3, tower, 0, 0.14, 0, 0.078);
    cylinder(coral, 0.086, 0.073, tower, 0, 0.18, 0, 0.082);
    cylinder(navy, 0.113, 0.027, tower, 0, 0.307, 0);
    const lensMaterial = material("#ffd690", 0.12, 0.17, 1.15);
    const light = orb(0.067, lensMaterial, tower, 0, 0.376, 0);
    for (const dx of [-0.055, 0.055])
      for (const dz of [-0.045, 0.045])
        bar([dx, 0.317, dz], [dx, 0.431, dz], 0.008, edge, tower);
    add(new T.ConeGeometry(0.129, 0.105, 12), coral, tower, 0, 0.471, 0);
    orb(0.016, gold, tower, 0, 0.55, 0);
    const points: Pt[] = [
      [-0.8, 0.038, 0.13],
      [-0.26, 0.038, -0.01],
      [0.25, 0.038, -0.02],
      [0.78, 0.038, 0.04],
    ];
    function bridge(a: Pt, b: Pt, low: number, high: number) {
      const va = new T.Vector3(...a),
        vb = new T.Vector3(...b),
        span = va.distanceTo(vb);
      const dir = group(root, ...a);
      dir.rotation.y = -Math.atan2(b[2] - a[2], b[0] - a[0]);
      const hinge = group(dir);
      for (const z of [-0.075, 0.075])
        bar([0, 0.054, z], [span, 0.054, z], 0.014, edge, hinge);
      for (let j = 0; j <= 8; j++)
        block(
          span / 10,
          0.03,
          0.177,
          paperWood(),
          hinge,
          (span * j) / 8,
          0,
          0,
          0.006,
        );
      for (const z of [-0.074, 0.074])
        for (const j of [0, 4, 8])
          bar(
            [(span * j) / 8, 0, z],
            [(span * j) / 8, 0.065, z],
            0.008,
            gold,
            hinge,
          );
      moves.push((_t, p) => {
        hinge.rotation.z = 1.04 * (1 - ease(low, high, p));
      });
    }
    function paperWood() {
      return material("#e3c08c", 0.15, 0.5);
    }
    bridge(points[0], points[1], 0.08, 0.41);
    bridge(points[2], points[3], 0.34, 0.7);
    const route = new T.CatmullRomCurve3(
      points.map(([x, y, z]) => new T.Vector3(x, y + 0.085, z)),
    );
    const beacon = orb(
      0.05,
      material("#ffe096", 0.3, 0.25, 0.7),
      root,
      0,
      0,
      0,
    );
    beacon.castShadow = false;
    for (let i = 0; i < 9; i++) {
      const p = route.getPoint(i / 8);
      const halo = ring(0.035, 0.005, gold, root);
      halo.position.set(p.x, -0.238, p.z + 0.31);
    }
    moves.push((t, p) => {
      beacon.position.copy(route.getPoint(ease(0.58, 0.96, p)));
      light.scale.setScalar(0.53 + 0.6 * ease(0.85, 1, p));
      lensMaterial.emissiveIntensity =
        0.18 + 1.15 * ease(0.85, 1, p) + 0.13 * Math.sin(t * 1.55) * p;
    });
    root.rotation.set(0.53, -0.31, -0.02);
  }
  if (theme === "space") planetarium();
  else islands();
  function update(time: number, phase: number) {
    for (const move of moves) move(time, phase);
  }
  update(0, 0);
  return { root, update };
}
