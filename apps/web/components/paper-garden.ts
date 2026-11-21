import * as T from "three";

type Keep = <V extends { dispose(): void }>(value: V) => V;
type Point = [number, number, number];
type Draw = (t: number, open: number) => void;
const pi = Math.PI;
const v = (x: number, y: number, z: number) => new T.Vector3(x, y, z);

/** Three families of small, mechanical artist's objects. Y is up and Z faces the reader. */
export function makePaperGarden(design: string, about: boolean, keep: Keep) {
  const root = new T.Group();
  const draws: Draw[] = [];
  const materialCache = new Map<string, T.MeshStandardMaterial>();
  function mat(color: string, metalness = 0, roughness = 0.68) {
    const key = [color, metalness, roughness].join("/");
    if (!materialCache.has(key))
      materialCache.set(
        key,
        keep(
          new T.MeshStandardMaterial({
            color,
            metalness,
            roughness,
            side: T.DoubleSide,
          }),
        ),
      );
    return materialCache.get(key)!;
  }
  function group(parent: T.Object3D = root) {
    const g = new T.Group();
    parent.add(g);
    return g;
  }
  function mesh(
    geo: T.BufferGeometry,
    m: T.Material,
    parent: T.Object3D = root,
  ) {
    const o = new T.Mesh(keep(geo), m);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function block(
    w: number,
    h: number,
    d: number,
    m: T.Material,
    p: T.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const o = mesh(new T.BoxGeometry(w, h, d), m, p);
    o.position.set(x, y, z);
    return o;
  }
  function cyl(
    rt: number,
    rb: number,
    h: number,
    m: T.Material,
    p: T.Object3D,
    x = 0,
    y = 0,
    z = 0,
    n = 36,
  ) {
    const o = mesh(new T.CylinderGeometry(rt, rb, h, n), m, p);
    o.position.set(x, y, z);
    return o;
  }
  function sphere(
    r: number,
    m: T.Material,
    p: T.Object3D,
    x: number,
    y: number,
    z: number,
  ) {
    const o = mesh(new T.SphereGeometry(r, 12, 8), m, p);
    o.position.set(x, y, z);
    return o;
  }
  function ring(
    rad: number,
    thick: number,
    m: T.Material,
    p: T.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const o = mesh(new T.TorusGeometry(rad, thick, 7, 64), m, p);
    o.position.set(x, y, z);
    return o;
  }
  function tube(
    points: T.Vector3[],
    r: number,
    m: T.Material,
    p: T.Object3D,
    segments = 12,
  ) {
    const curve = new T.CatmullRomCurve3(points);
    return mesh(new T.TubeGeometry(curve, segments, r, 5, false), m, p);
  }
  function stroke(points: T.Vector3[], color: string, p: T.Object3D) {
    const line = new T.Line(
      keep(new T.BufferGeometry().setFromPoints(points)),
      keep(new T.LineBasicMaterial({ color })),
    );
    p.add(line);
    return line;
  }
  function relief(
    shape: T.Shape,
    depth: number,
    m: T.Material,
    p: T.Object3D,
    bevel = 0,
  ) {
    return mesh(
      new T.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: bevel > 0,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 2,
        curveSegments: 12,
        steps: 1,
      }),
      m,
      p,
    );
  }
  function polygon(pts: number[][]) {
    return new T.Shape(pts.map((a) => new T.Vector2(a[0], a[1])));
  }
  function surface(
    nx: number,
    ny: number,
    vertex: (u: number, t: number) => T.Vector3,
  ) {
    const pos: number[] = [],
      idx: number[] = [];
    for (let j = 0; j <= ny; j++)
      for (let i = 0; i <= nx; i++) {
        const q = vertex(i / nx, j / ny);
        pos.push(q.x, q.y, q.z);
        if (i < nx && j < ny) {
          const a = j * (nx + 1) + i;
          idx.push(a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1);
        }
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  const brass = mat("#b89755", 0.68, 0.32),
    inset = mat("#5d5138", 0.3, 0.53),
    cream = mat("#f8edcf", 0, 0.89);
  const plant = mat("#56673f"),
    sage = mat("#789357"),
    leafDark = mat("#416a45"),
    vein = mat("#a1b67d");
  const soil = mat("#4d4935", 0, 0.94);

  // Leaf is a curved blade, with a cupped, raised midrib and tapering sine profile.
  function lilyLeaf(
    parent: T.Object3D,
    base: Point,
    delta: Point,
    width: number,
    facing: number,
    material: T.Material,
  ) {
    const joint = group(parent);
    joint.position.set(...base);
    const dir = v(...delta),
      across = v(Math.cos(facing), 0, Math.sin(facing));
    function position(s: number, t: number) {
      const half = Math.pow(Math.max(0, Math.sin(t * pi)), 0.83) * width;
      return v(
        dir.x * (0.24 * t + 0.76 * t * t),
        dir.y * t + 0.17 * Math.sin(t * pi),
        dir.z * t * t,
      )
        .addScaledVector(across, s * half)
        .add(
          v(
            0,
            -0.07 * Math.abs(s) * Math.sin(t * pi),
            0.07 * (1 - Math.abs(s)) * Math.sin(t * pi),
          ),
        );
    }
    mesh(
      surface(6, 16, (u, t) => position(u * 2 - 1, t)),
      material,
      joint,
    );
    tube(
      Array.from({ length: 9 }, (_, i) =>
        position(0, i / 8).add(v(0, 0, 0.007)),
      ),
      0.008,
      vein,
      joint,
      12,
    );
    for (const s of [-0.56, 0.56])
      stroke(
        Array.from({ length: 13 }, (_, i) =>
          position(s * Math.sin((i / 12) * pi), 0.07 + (i / 12) * 0.85).add(
            v(0, 0, 0.006),
          ),
        ),
        "#aec18a",
        joint,
      );
    return joint;
  }
  function lilyBowl() {
    const pot = mesh(
      new T.LatheGeometry(
        [
          [0.03, -0.84],
          [0.34, -0.84],
          [0.39, -0.79],
          [0.46, -0.76],
          [0.61, -0.54],
          [0.64, -0.44],
          [0.625, -0.405],
          [0.595, -0.416],
          [0.56, -0.48],
          [0.47, -0.66],
          [0.04, -0.68],
        ].map((q) => new T.Vector2(q[0], q[1])),
        60,
      ),
      mat("#bd8f73", 0, 0.73),
    );
    pot.scale.z = 0.86;
    for (const y of [-0.446, -0.482]) {
      const r = ring(
        y > -0.46 ? 0.625 : 0.61,
        0.009,
        mat("#e6cfaa"),
        root,
        0,
        y,
        0,
      );
      r.rotation.x = pi / 2;
      r.scale.y = 0.86;
    }
    cyl(0.581, 0.53, 0.052, soil, root, 0, -0.465, 0, 56).scale.z = 0.86;
    const foliage = group(root);
    const leaves: [Point, Point, number, number, T.Material][] = [
      [[-0.09, -0.45, -0.09], [-0.76, 1.02, -0.18], 0.17, 0.93, sage],
      [[0.02, -0.45, -0.07], [-0.36, 1.57, -0.12], 0.22, 0.68, leafDark],
      [[0.03, -0.43, -0.09], [0.61, 1.35, -0.13], 0.235, -0.72, sage],
      [[0.13, -0.45, 0.02], [0.9, 0.77, 0.03], 0.19, -0.71, leafDark],
      [[-0.1, -0.44, 0.08], [-0.81, 0.58, 0.24], 0.18, 0.85, leafDark],
      [[0.02, -0.43, 0.12], [0.33, 0.82, 0.4], 0.18, -0.38, mat("#839a59")],
    ];
    leaves.forEach(([base, d, w, face, m], i) => {
      const blade = lilyLeaf(foliage, base, d, w, face, m);
      draws.push((_t, a) => {
        blade.rotation.z = (d[0] > 0 ? -1 : 1) * a * (i % 2 ? 0.43 : 0.54);
      });
    });
    const bellMat = mat("#fff8dc", 0.02, 0.41),
      pollen = mat("#d2a853", 0.05, 0.6);
    // Each nodding corolla has an actual open, six-lobed rim and golden internal stamens.
    const bellSurface = surface(30, 10, (u, t) => {
      const phi = u * 2 * pi;
      const rad =
        0.029 +
        0.087 * Math.sin(t * 1.96) +
        0.026 * Math.pow(t, 6) * (0.55 + 0.45 * Math.cos(6 * phi));
      return v(
        rad * Math.cos(phi),
        -0.134 * t + 0.032 * Math.pow(t, 5) * Math.cos(6 * phi),
        rad * Math.sin(phi),
      );
    });
    keep(bellSurface);
    function bell(p: T.Object3D, r: number) {
      const g = group(p),
        o = new T.Mesh(bellSurface, bellMat);
      o.castShadow = true;
      o.receiveShadow = true;
      g.add(o);
      for (let k = 0; k < 3; k++) {
        const q = (k * 2 * pi) / 3;
        sphere(
          0.012,
          pollen,
          g,
          0.029 * Math.cos(q),
          -0.102,
          0.029 * Math.sin(q),
        );
      }
      g.scale.setScalar(r);
      return g;
    }
    const branches: [number, number, number, number][] = [
      [-1, 1.17, 0.13, 6],
      [1, 0.99, -0.11, 5],
      [-0.69, 0.69, 0.41, 4],
    ];
    branches.forEach(([direction, height, z, count], b) => {
      const shoot = group(root);
      shoot.position.set(0.02, -0.433, 0);
      const line = new T.CubicBezierCurve3(
        v(0, 0, 0),
        v(direction * 0.08, height * 0.82, z * 0.2),
        v(direction * 0.32, height * 1.53, z * 0.54),
        v(direction * 0.96, height * 0.98, z),
      );
      tube(line.getPoints(17), 0.018, plant, shoot, 24);
      for (let i = 0; i < count; i++) {
        const t = 0.43 + (i * 0.54) / (count - 1),
          at = line.getPoint(t),
          off = group(shoot);
        off.position.copy(at);
        const d = direction * (i % 2 === 0 ? 0.095 : 0.055),
          depth = i % 2 === 0 ? 0.058 : -0.03,
          dy = i === 0 ? 0.155 : 0.12;
        tube(
          [
            v(0, 0, 0),
            v(d * 0.45, 0.006, depth * 0.4),
            v(d, -dy * 0.4, depth),
            v(d * 1.06, -dy, depth),
          ],
          0.009,
          sage,
          off,
          8,
        );
        const flower = bell(off, 0.91 + i * 0.026);
        flower.position.set(d * 1.06, -dy, depth);
        draws.push((_t, a) => {
          flower.rotation.z = direction * (0.08 + a * (i % 2 ? 0.64 : 0.48));
          flower.rotation.x = -a * 0.3;
        });
      }
      draws.push((t, a) => {
        shoot.rotation.z =
          (direction < 0 ? 1 : -1) *
          ((b === 2 ? 0.25 : 0.36) * a + 0.014 * Math.sin(t * 0.55 + b));
      });
    });
    // Tilt the plinth slightly toward the viewer, showing the soil and ceramic lip.
    root.rotation.set(0.17, -0.18, 0);
  }
  function embroidery() {
    const hoop = group(root);
    hoop.rotation.set(-0.12, -0.23, -0.09);
    const r = 1.02;
    const linen = cyl(
      0.956,
      0.956,
      0.062,
      mat("#dfcfab", 0, 0.96),
      hoop,
      0,
      0,
      -0.02,
      84,
    );
    linen.rotation.x = pi / 2;
    const outer = ring(r, 0.067, mat("#a4774f", 0, 0.63), hoop);
    outer.scale.z = 1.15;
    ring(0.967, 0.022, mat("#dec491", 0, 0.69), hoop, 0, 0, 0.037);
    // A real tension screw held between the two jaws.
    for (const x of [-0.122, 0.122])
      block(0.105, 0.16, 0.13, brass, hoop, x, 1.064, 0.003);
    const screw = cyl(0.029, 0.029, 0.44, inset, hoop, 0, 1.104, 0.01, 12);
    screw.rotation.z = pi / 2;
    const knob = cyl(0.06, 0.06, 0.08, brass, hoop, 0.215, 1.104, 0.01, 12);
    knob.rotation.z = pi / 2;
    const threads: number[] = [];
    for (let i = -26; i <= 26; i++) {
      const x = i * 0.035;
      const cap = Math.sqrt(0.94 * 0.94 - x * x);
      threads.push(
        x,
        -cap,
        0.015,
        x,
        cap,
        0.015,
        -cap,
        x,
        0.016,
        cap,
        x,
        0.016,
      );
    }
    const weave = new T.LineSegments(
      keep(
        new T.BufferGeometry().setAttribute(
          "position",
          new T.Float32BufferAttribute(threads, 3),
        ),
      ),
      keep(
        new T.LineBasicMaterial({
          color: "#c4af88",
          transparent: true,
          opacity: 0.47,
        }),
      ),
    );
    hoop.add(weave);
    const stitch = mat("#58724e", 0, 0.91);
    const mainStem = new T.CatmullRomCurve3([
      v(-0.34, -0.68, 0.043),
      v(-0.23, -0.3, 0.046),
      v(0.03, 0.03, 0.049),
      v(0.17, 0.43, 0.044),
      v(0.3, 0.64, 0.044),
    ]);
    tube(mainStem.getPoints(14), 0.016, stitch, hoop, 24);
    tube(
      [
        v(-0.22, -0.28, 0.045),
        v(0.18, -0.23, 0.047),
        v(0.39, -0.01, 0.05),
        v(0.47, 0.21, 0.051),
      ],
      0.012,
      stitch,
      hoop,
      16,
    );
    const twigs: [number, number, number, number][] = [
      [-0.27, -0.43, -0.74, 0.31],
      [-0.14, -0.14, -1.05, 0.3],
      [0.07, 0.11, 0.81, 0.26],
      [0.13, 0.33, -0.8, 0.22],
      [0.19, -0.21, 0.92, 0.25],
      [0.38, -0.02, -0.95, 0.2],
    ];
    twigs.forEach(([x, y, turn, l], i) => {
      const g = group(hoop);
      g.position.set(x, y, 0.066);
      g.rotation.z = -turn;
      const fill = mat(i % 2 ? "#819268" : "#496a51", 0, 0.91);
      const ribs: number[] = [];
      const surf = surface(4, 12, (u, t) =>
        v(
          (u - 0.5) * 0.54 * l * Math.sin(t * pi),
          l * t,
          0.018 * Math.sin(t * pi) * (1 - Math.abs(u - 0.5) * 2),
        ),
      );
      mesh(surf, fill, g);
      for (let j = 1; j <= 13; j++) {
        const t = j / 15,
          spread = l * 0.27 * Math.sin(t * pi);
        ribs.push(
          0,
          l * t,
          0.021,
          spread,
          l * t + 0.035,
          0.012,
          0,
          l * t,
          0.021,
          -spread,
          l * t + 0.035,
          0.012,
        );
      }
      const lines = new T.LineSegments(
        keep(
          new T.BufferGeometry().setAttribute(
            "position",
            new T.Float32BufferAttribute(ribs, 3),
          ),
        ),
        keep(new T.LineBasicMaterial({ color: "#b8bd89" })),
      );
      g.add(lines);
      draws.push((_t, a) => {
        g.rotation.x = 0.64 - a * 0.56;
      });
    });
    const flowerLocations = [
      [0.29, 0.63, 0.95],
      [0.2, 0.4, 0.68],
      [0.48, 0.22, 0.83],
      [-0.08, -0.04, 0.64],
    ];
    flowerLocations.forEach(([x, y, s], i) => {
      const flower = group(hoop);
      flower.position.set(x, y, 0.085);
      flower.scale.setScalar(s);
      for (let k = 0; k < 6; k++) {
        const joint = group(flower);
        joint.rotation.z = (2 * pi * k) / 6 + 0.2 * i;
        const petal = group(joint);
        mesh(
          surface(4, 10, (u, t) =>
            v(
              (u - 0.5) * 0.15 * Math.sin(t * pi),
              0.21 * t,
              0.029 * Math.sin(t * pi),
            ),
          ),
          mat(i % 2 ? "#ebc1b0" : "#f7eace", 0, 0.86),
          petal,
        );
        for (const n of [-1, 0, 1])
          stroke(
            [v(0, 0, 0.004), v(n * 0.025, 0.1, 0.031), v(0, 0.191, 0.013)],
            "#d4b991",
            petal,
          );
        draws.push((_t, a) => {
          petal.rotation.x = 0.89 - a * 0.82;
        });
      }
      for (let k = 0; k < 7; k++) {
        const phi = k * 2.4;
        sphere(
          0.019,
          mat("#c19645", 0.06, 0.62),
          flower,
          0.027 * Math.cos(phi),
          0.027 * Math.sin(phi),
          0.047,
        );
      }
    });
  }
  function terrain() {
    const specimen = group(root);
    specimen.rotation.set(0.46, -0.28, -0.035);
    const wood = mat("#6c6050"),
      base = mat("#b5b6a0"),
      river = mat("#558c8f", 0.14, 0.43);
    block(2.7, 0.12, 1.56, wood, specimen, 0, -0.61, 0);
    block(2.64, 0.09, 1.49, base, specimen, 0, -0.505, 0);
    // River snakes through two independent banks, exposing their lateral strata.
    const midline = (x: number) =>
      0.18 * Math.sin(x * 3.7) + 0.075 * Math.sin(x * 7.2);
    const bed = new T.Shape(),
      xmax = 1.29;
    for (let i = 0; i <= 60; i++) {
      const x = -xmax + (2 * xmax * i) / 60;
      const yp = midline(x) + 0.105;
      if (!i) bed.moveTo(x, yp);
      else bed.lineTo(x, yp);
    }
    for (let i = 60; i >= 0; i--) {
      const x = -xmax + (2 * xmax * i) / 60;
      bed.lineTo(x, midline(x) - 0.105);
    }
    bed.closePath();
    const stream = relief(bed, 0.012, river, specimen);
    stream.rotation.x = -pi / 2;
    stream.position.y = -0.451;
    const palette = [
      "#b2aa88",
      "#c9b692",
      "#b2af8c",
      "#9fa883",
      "#889871",
      "#72885e",
      "#647b58",
    ];
    const strata: T.Group[] = [];
    for (let j = 0; j < 7; j++) {
      const row = group(specimen);
      strata.push(row);
      const u = j / 6;
      for (const bank of [-1, 1]) {
        const start = -1.29 + u * (bank > 0 ? 0.4 : 0.12),
          end = 1.29 - u * (bank > 0 ? 0.1 : 0.44);
        const s = new T.Shape();
        const outline: T.Vector3[] = [];
        function add(x: number, y: number, first = false) {
          if (first) s.moveTo(x, y);
          else s.lineTo(x, y);
          outline.push(v(x, 0.054, -y));
        }
        for (let i = 0; i <= 34; i++) {
          const t = i / 34,
            x = start + (end - start) * t;
          const near =
            midline(x) +
            bank *
              (0.088 +
                u * (0.18 + 0.05 * Math.sin(4 * x)) +
                0.042 * Math.sin(9 * x + 0.7 * j));
          add(x, near, i === 0);
        }
        for (let i = 34; i >= 0; i--) {
          const t = i / 34,
            x = start + (end - start) * t;
          const edge =
            bank * (0.707 - u * 0.105 + 0.033 * Math.sin(x * 4 + j * 0.18)) +
            bank * 0.06 * Math.sin(t * pi) * Math.sin(8 * x);
          add(x, edge);
        }
        s.closePath();
        const layer = relief(s, 0.053, mat(palette[j]), row, 0.005);
        layer.rotation.x = -pi / 2;
        outline.push(outline[0]);
        stroke(outline, j % 2 ? "#877e58" : "#a49f75", row);
      }
    }
    // Three long pins pass through the corners, acting as guides during separation.
    for (const [x, z] of [
      [-0.84, 0.51],
      [0.88, -0.55],
      [0.85, 0.5],
    ]) {
      cyl(0.017, 0.017, 1.14, brass, specimen, x, 0.1, z, 10);
      const head = sphere(0.045, brass, specimen, x, 0.66, z);
      head.scale.y = 0.6;
    }
    for (let j = 0; j < strata.length; j++)
      draws.push((_t, a) => {
        strata[j].position.y = -0.445 + j * (0.057 + 0.099 * a);
      });
    // Survey label plate and two countersunk corner fasteners in the wood edge.
    block(0.48, 0.059, 0.015, brass, specimen, 0.67, -0.605, 0.787);
    for (const dx of [-0.195, 0.195])
      sphere(0.012, inset, specimen, 0.67 + dx, -0.604, 0.797);
  }
  function fieldBook() {
    const pages = 5,
      w = 0.55,
      h = 1.24;
    const panels: T.Group[] = [];
    const paper = mat("#ead9ad"),
      pine = mat("#304c40"),
      forest = mat("#496554"),
      blue = mat("#637c80");
    root.rotation.set(0.05, -0.16, 0);
    const landscape = (x: number, near: boolean) =>
      near
        ? 0.36 + 0.092 * Math.sin(x * 8) + 0.032 * Math.sin(x * 21)
        : 0.55 + 0.12 * Math.sin(x * 5.2 + 0.8) + 0.072 * Math.sin(x * 14);
    for (let i = 0; i < pages; i++) {
      const sheet = group(root);
      panels.push(sheet);
      block(w, h, 0.043, paper, sheet, w / 2, 0, 0);
      if (i === 0 || i === pages - 1)
        block(
          w + 0.018,
          h + 0.036,
          0.035,
          mat("#395345"),
          sheet,
          w / 2,
          -0.002,
          -0.041,
        );
      for (const near of [false, true]) {
        const s = new T.Shape();
        s.moveTo(0.013, -h * 0.46);
        s.lineTo(w - 0.013, -h * 0.46);
        for (let q = 22; q >= 0; q--) {
          const u = q / 22,
            x = 0.013 + u * (w - 0.026);
          s.lineTo(x, -h / 2 + landscape(i * w + x, near));
        }
        s.closePath();
        const mountain = relief(s, 0.009, near ? forest : blue, sheet);
        mountain.position.z = near ? 0.055 : 0.036;
      }
      const floor = relief(
        polygon([
          [0.014, -h * 0.46],
          [w - 0.014, -h * 0.46],
          [w - 0.014, -0.4],
          [w * 0.6, -0.397],
          [w * 0.31, -0.365],
          [0.014, -0.39],
        ]),
        0.01,
        pine,
        sheet,
      );
      floor.position.z = 0.067;
      const trees = 2 + (i % 2);
      for (let k = 0; k < trees; k++) {
        const x = 0.1 + (k * (w - 0.17)) / trees;
        const sz = 0.12 + ((7 * i + k * 5) % 8) * 0.014;
        const tree = polygon([
          [0, sz],
          [-sz * 0.26, sz * 0.43],
          [-sz * 0.11, sz * 0.48],
          [-sz * 0.36, 0.08 * sz],
          [-0.12 * sz, 0.14 * sz],
          [-0.43 * sz, -0.27 * sz],
          [-0.045 * sz, -0.26 * sz],
          [-0.045 * sz, -0.47 * sz],
          [0.045 * sz, -0.47 * sz],
          [0.045 * sz, -0.26 * sz],
          [0.43 * sz, -0.27 * sz],
          [0.12 * sz, 0.14 * sz],
          [0.36 * sz, 0.08 * sz],
          [0.11 * sz, 0.48 * sz],
          [0.26 * sz, 0.43 * sz],
        ]);
        const cut = relief(tree, 0.011, pine, sheet);
        cut.position.set(x, -0.33 + 0.026 * Math.sin(i + k), 0.071);
      }
      const end = ring(0.027, 0.009, brass, sheet, w * 0.5, 0.49, 0.035);
      end.rotation.z = 0.15;
      if (i === 2) {
        const moon = cyl(
          0.086,
          0.086,
          0.016,
          mat("#c19f57", 0.32, 0.53),
          sheet,
          0.34,
          0.28,
          0.039,
          32,
        );
        moon.rotation.x = pi / 2;
      }
      const spine = cyl(
        0.018,
        0.018,
        h + 0.01,
        mat("#b4a97f"),
        sheet,
        0,
        0,
        0,
        10,
      );
      spine.scale.z = 0.8;
      const pageLines = Array.from({ length: 3 }, (_, k) => {
        const x = w * 0.7 + k * 0.035;
        return [v(x, -0.55, 0.027), v(x + 0.019, -0.55, 0.027)];
      }).flat();
      for (let k = 0; k < pageLines.length; k += 2)
        stroke([pageLines[k], pageLines[k + 1]], "#988f71", sheet);
    }
    draws.push((_t, a) => {
      const angle = 0.89 - 0.55 * a,
        span = pages * w * Math.cos(angle);
      let x = -span / 2,
        z = 0;
      panels.forEach((sheet, i) => {
        const turn = (i % 2 ? 1 : -1) * angle;
        sheet.rotation.y = turn;
        sheet.position.set(x, -0.02, z - 0.12);
        x += w * Math.cos(turn);
        z -= w * Math.sin(turn);
      });
    });
  }
  function sundial() {
    const base = group(root);
    root.rotation.set(0.69, -0.32, -0.04);
    const mahogany = mat("#63382e", 0, 0.53),
      face = mat("#ccb378", 0.62, 0.41),
      gold = mat("#b99c62", 0.78, 0.34);
    cyl(0.99, 1.07, 0.17, mahogany, base, 0, -0.45, 0, 64);
    cyl(1.03, 1.04, 0.045, gold, base, 0, -0.35, 0, 72);
    const plate = group(base);
    cyl(1.0, 1.0, 0.062, face, plate, 0, -0.296, 0, 72);
    for (const radius of [0.96, 0.88, 0.69, 0.22]) {
      const r = ring(
        radius,
        radius === 0.88 ? 0.012 : 0.009,
        inset,
        plate,
        0,
        -0.258,
        0,
      );
      r.rotation.x = pi / 2;
    }
    const length = [0.115, 0.055, 0.055, 0.055];
    const marks: number[] = [];
    for (let i = 0; i < 96; i++) {
      const a = (i * pi) / 48,
        outer = 0.94,
        inner = outer - length[i % 4];
      marks.push(
        Math.sin(a) * inner,
        -0.258,
        Math.cos(a) * inner,
        Math.sin(a) * outer,
        -0.258,
        Math.cos(a) * outer,
      );
    }
    for (let i = 0; i < 13; i++) {
      const a = ((i - 6) * pi) / 14;
      marks.push(
        0.225 * Math.sin(a),
        -0.258,
        0.225 * Math.cos(a),
        0.84 * Math.sin(a),
        -0.258,
        0.84 * Math.cos(a),
      );
    }
    const geometry = new T.BufferGeometry().setAttribute(
      "position",
      new T.Float32BufferAttribute(marks, 3),
    );
    plate.add(
      new T.LineSegments(
        keep(geometry),
        keep(new T.LineBasicMaterial({ color: "#615137" })),
      ),
    );
    // N/E/S/W punched into the plate using tiny raised brass insets, drawn as line strokes.
    const glyphs = [
      [
        [-0.04, 0],
        [-0.04, 0.105],
        [0.04, 0],
        [0.04, 0.105],
      ],
      [
        [0.04, 0.1],
        [-0.045, 0.1],
        [-0.045, 0],
        [0.04, 0],
      ],
      [
        [0.045, 0.1],
        [-0.035, 0.1],
        [-0.04, 0.054],
        [0.04, 0.051],
        [0.04, 0],
        [-0.045, 0],
      ],
      [
        [-0.055, 0.1],
        [-0.027, 0],
        [0, 0.057],
        [0.026, 0],
        [0.055, 0.1],
      ],
    ];
    glyphs.forEach((g, k) => {
      const phi = pi + (k * pi) / 2,
        x = 0.77 * Math.sin(phi),
        z = 0.77 * Math.cos(phi);
      stroke(
        g.map((pt) => v(x + pt[0], -0.253, z - pt[1] + 0.05)),
        "#634c2e",
        plate,
      );
    });
    const vane = group(plate);
    vane.position.set(0, -0.241, 0.32);
    // The shadow-casting triangular gnomon has a real triangular open window.
    const s = polygon([
      [0, 0],
      [0.91, 0],
      [0.91, 0.78],
    ]);
    const cutout = new T.Path();
    cutout.moveTo(0.42, 0.118);
    cutout.lineTo(0.786, 0.427);
    cutout.lineTo(0.786, 0.118);
    cutout.closePath();
    s.holes.push(cutout);
    const gnomon = relief(s, 0.055, gold, vane, 0.008);
    gnomon.rotation.y = pi / 2;
    gnomon.position.x = -0.028;
    for (const x of [-0.1, 0.1])
      cyl(0.028, 0.028, 0.01, inset, plate, x, -0.248, 0.3, 12);
    const axle = cyl(0.049, 0.049, 0.32, gold, plate, 0, -0.23, 0.32, 18);
    axle.rotation.z = pi / 2;
    for (const p of [
      [-0.74, -0.72],
      [0.74, -0.72],
      [0, 0.91],
    ])
      cyl(0.09, 0.075, 0.09, mahogany, base, p[0], -0.572, p[1], 20);
    draws.push((_t, a) => {
      plate.rotation.y = -0.28 + a * 0.88;
      vane.rotation.z = 0.67 - a * 0.62;
    });
  }
  function popUpBook() {
    root.rotation.set(0.39, -0.23, 0);
    const board = mat("#753c43"),
      leaf = mat("#e8d8b5"),
      edge = mat("#d1b994"),
      ink = mat("#365e65"),
      pale = mat("#85a5a2");
    const left = group(root),
      right = group(root);
    for (const [half, sign] of [
      [left, -1],
      [right, 1],
    ] as const) {
      block(1.13, 0.085, 1.46, board, half, sign * 0.573, -0.14, 0);
      block(1.08, 0.115, 1.39, edge, half, sign * 0.553, -0.052, 0);
      block(1.075, 0.026, 1.385, leaf, half, sign * 0.55, 0.017, 0);
      for (let i = 0; i < 4; i++)
        block(
          0.99,
          0.004,
          0.006,
          cream,
          half,
          sign * 0.55,
          -0.086 + i * 0.022,
          0.7,
        );
      stroke(
        [
          v(sign * 0.13, 0.036, -0.6),
          v(sign * 0.98, 0.036, -0.6),
          v(sign * 0.98, 0.036, 0.59),
          v(sign * 0.13, 0.036, 0.59),
        ],
        "#ac976f",
        half,
      );
    }
    const spine = cyl(0.09, 0.09, 1.44, board, root, 0, -0.075, 0, 24);
    spine.rotation.x = pi / 2;
    // A die-cut ship on a folded paper bridge. Each sail has its own centre fold.
    const mechanism = group(root);
    mechanism.position.set(0, 0.035, 0.1);
    const hull = group(mechanism);
    hull.position.y = 0.22;
    const hullShape = polygon([
      [-0.6, 0.02],
      [-0.28, -0.21],
      [0.32, -0.188],
      [0.58, 0.07],
      [0.1, -0.006],
      [-0.19, 0.035],
    ]);
    const hullFront = relief(hullShape, 0.055, mat("#934e43"), hull);
    hullFront.position.z = 0.027;
    const trim = relief(
      polygon([
        [-0.56, 0.009],
        [-0.29, -0.059],
        [0.31, -0.054],
        [0.55, 0.052],
        [0.1, -0.001],
        [-0.19, 0.039],
      ]),
      0.013,
      cream,
      hull,
    );
    trim.position.z = 0.089;
    const mast = cyl(0.011, 0.018, 0.85, brass, hull, 0.02, 0.37, 0.006, 10);
    mast.rotation.z = -0.025;
    function sail(pts: Point[], m: T.Material) {
      const pos = pts.flat(),
        geometry = new T.BufferGeometry().setAttribute(
          "position",
          new T.Float32BufferAttribute(pos, 3),
        );
      geometry.computeVertexNormals();
      return mesh(geometry, m, hull);
    }
    sail(
      [
        [0.0, 0.73, 0.012],
        [-0.43, 0.16, 0.05],
        [-0.17, 0.2, 0.14],
        [0.0, 0.73, 0.012],
        [-0.17, 0.2, 0.14],
        [-0.017, 0.15, 0.045],
      ],
      cream,
    );
    sail(
      [
        [0.064, 0.61, 0.021],
        [0.079, 0.16, 0.04],
        [0.25, 0.186, 0.107],
        [0.064, 0.61, 0.021],
        [0.25, 0.186, 0.107],
        [0.415, 0.16, 0.039],
      ],
      mat("#dfc494"),
    );
    const flag = relief(
      polygon([
        [0, 0],
        [0.2, -0.025],
        [0.02, -0.076],
      ]),
      0.012,
      board,
      hull,
    );
    flag.position.set(0.03, 0.79, 0);
    const waves: T.Group[] = [];
    for (let row = 0; row < 3; row++) {
      const hinge = group(root);
      waves.push(hinge);
      hinge.position.set(0, 0.042, 0.14 + row * 0.16);
      const wave = new T.Shape();
      wave.moveTo(-0.76, 0);
      wave.lineTo(-0.76, 0.068);
      for (let i = 0; i < 5; i++) {
        const x = -0.76 + i * 0.305;
        wave.quadraticCurveTo(x + 0.115, 0.088, x + 0.18, 0.175);
        wave.quadraticCurveTo(x + 0.178, 0.1, x + 0.305, 0.078);
      }
      wave.lineTo(0.765, 0);
      wave.closePath();
      relief(wave, 0.022, row % 2 ? pale : ink, hinge);
    }
    for (const sign of [-1, 1]) {
      const gusset = relief(
        polygon([
          [0, 0],
          [0.08, 0.0],
          [0.04, 0.2],
        ]),
        0.023,
        edge,
        mechanism,
      );
      gusset.position.set(sign * 0.28, 0.03, 0.048);
    }
    draws.push((_t, a) => {
      left.rotation.z = -0.13 + 0.09 * a;
      right.rotation.z = 0.13 - 0.09 * a;
      mechanism.rotation.x = -1.11 + a * 1.05;
      waves.forEach((g, i) => {
        g.rotation.x = -0.85 + a * (0.71 - i * 0.08);
      });
    });
  }
  if (design === "garden") {
    if (about) embroidery();
    else lilyBowl();
  } else if (design === "classic") {
    if (about) fieldBook();
    else terrain();
  } else if (design === "chapters") {
    if (about) popUpBook();
    else sundial();
  } else throw new Error("Unrecognized paper sculpture theme: " + design);
  const update = (time: number, amount: number) => {
    for (const draw of draws) draw(time, amount);
  };
  update(0, 0);
  return { root, update };
}
