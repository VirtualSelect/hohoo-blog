import * as T from "three";

type Keep = <V extends { dispose(): void }>(value: V) => V;
type Point = [number, number, number];
type Pose = (progress: number) => void;
const pi = Math.PI;
const tau = 2 * pi;
const vec = (x: number, y: number, z: number) => new T.Vector3(x, y, z);
const ease = (a: number, start = 0, end = 1) =>
  T.MathUtils.smoothstep(a, start, end);

/** All three reveals are reversible posed objects, independent of wall clock or playback speed. */
export function makePaperSecret(theme: string, keep: Keep) {
  const root = new T.Group();
  const poses: Pose[] = [];
  const materials = new Map<string, T.MeshStandardMaterial>();
  function paint(color: string, metal = 0.02, rough = 0.7, opacity = 1) {
    const key = [color, metal, rough, opacity].join("/");
    if (!materials.has(key))
      materials.set(
        key,
        keep(
          new T.MeshStandardMaterial({
            color,
            metalness: metal,
            roughness: rough,
            side: T.DoubleSide,
            transparent: opacity < 1,
            opacity,
            depthWrite: opacity === 1,
          }),
        ),
      );
    return materials.get(key)!;
  }
  const gold = paint("#b8995c", 0.57, 0.35);
  const cream = paint("#f0e0bb");
  function group(parent: T.Object3D = root) {
    const g = new T.Group();
    parent.add(g);
    return g;
  }
  function mesh(
    geometry: T.BufferGeometry,
    material: T.Material,
    parent: T.Object3D,
  ) {
    const o = new T.Mesh(keep(geometry), material);
    o.receiveShadow = true;
    o.castShadow = !material.transparent;
    parent.add(o);
    return o;
  }
  function block(
    w: number,
    h: number,
    d: number,
    c: T.Material,
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
  ) {
    const o = mesh(new T.BoxGeometry(w, h, d), c, parent);
    o.position.set(x, y, z);
    return o;
  }
  const sphereGeometry = keep(new T.SphereGeometry(1, 16, 12));
  function bead(
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    c: T.Material,
    p: T.Object3D,
  ) {
    const o = new T.Mesh(sphereGeometry, c);
    o.castShadow = true;
    o.receiveShadow = true;
    p.add(o);
    o.position.set(x, y, z);
    o.scale.set(rx, ry, rz);
    return o;
  }
  function rod(
    points: Point[],
    radius: number,
    c: T.Material,
    p: T.Object3D,
    segments = 12,
  ) {
    const coords = points.map((x) => vec(...x));
    const path =
      coords.length > 2
        ? new T.CatmullRomCurve3(coords)
        : new T.LineCurve3(coords[0], coords[1]);
    return mesh(new T.TubeGeometry(path, segments, radius, 6, false), c, p);
  }
  const inks = new Map<string, T.LineBasicMaterial>();
  function line(points: Point[], color: string, p: T.Object3D) {
    if (!inks.has(color))
      inks.set(color, keep(new T.LineBasicMaterial({ color })));
    const g = keep(
      new T.BufferGeometry().setFromPoints(points.map((x) => vec(...x))),
    );
    const ln = new T.Line(g, inks.get(color));
    p.add(ln);
    return ln;
  }
  function cut(shape: T.Shape, depth: number, c: T.Material, p: T.Object3D) {
    return mesh(
      new T.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false,
        curveSegments: 15,
      }),
      c,
      p,
    );
  }
  function polygon(points: number[][]) {
    return new T.Shape(points.map(([x, y]) => new T.Vector2(x, y)));
  }
  function roundSheet(w: number, h: number, r: number) {
    const shape = new T.Shape(),
      x = -w / 2,
      y = -h / 2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    return shape;
  }
  function surface(
    nu: number,
    nv: number,
    at: (u: number, v: number) => Point,
  ) {
    const xyz: number[] = [],
      indices: number[] = [];
    for (let j = 0; j <= nv; j++)
      for (let i = 0; i <= nu; i++) {
        xyz.push(...at(i / nu, j / nv));
        const n = j * (nu + 1) + i;
        if (i < nu && j < nv)
          indices.push(n, n + 1, n + nu + 1, n + 1, n + nu + 2, n + nu + 1);
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(xyz, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }
  function folded(
    vertices: Point[],
    faces: number[][],
    swatches: string[],
    p: T.Object3D,
  ) {
    const positions: number[] = [],
      colors: number[] = [];
    faces.forEach((ids, index) => {
      const c = new T.Color(swatches[index % swatches.length]);
      for (let i = 1; i < ids.length - 1; i++)
        for (const id of [ids[0], ids[i], ids[i + 1]]) {
          positions.push(...vertices[id]);
          colors.push(c.r, c.g, c.b);
        }
    });
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return mesh(
      g,
      keep(
        new T.MeshStandardMaterial({
          side: T.DoubleSide,
          vertexColors: true,
          roughness: 0.83,
        }),
      ),
      p,
    );
  }

  function garden() {
    const jade = paint("#275749", 0.17, 0.35),
      celadon = paint("#9fb99a", 0.08, 0.48);
    const dish = mesh(
      new T.LatheGeometry(
        [
          [0.03, -0.73],
          [0.69, -0.73],
          [0.83, -0.68],
          [1.03, -0.58],
          [1.1, -0.48],
          [1.13, -0.43],
          [1.12, -0.404],
          [1.07, -0.417],
          [1.01, -0.48],
          [0.64, -0.6],
          [0.03, -0.6],
        ].map((v) => new T.Vector2(...(v as [number, number]))),
        72,
      ),
      jade,
      root,
    );
    dish.scale.set(1.17, 1, 0.85);
    const rim = mesh(new T.TorusGeometry(1.111, 0.013, 8, 72), celadon, root);
    rim.rotation.x = pi / 2;
    rim.scale.set(1.17, 0.85, 1);
    rim.position.y = -0.414;
    const water = mesh(
      new T.CylinderGeometry(1.063, 1.02, 0.022, 72),
      paint("#538482", 0.23, 0.2),
      root,
    );
    water.position.y = -0.469;
    water.scale.set(1.17, 1, 0.85);
    // Radial lily pad surfaces omit a wedge all the way to the petiole.
    function lilyPad(
      x: number,
      z: number,
      r: number,
      yaw: number,
      color: string,
    ) {
      const pad = group(root);
      pad.position.set(x, -0.437, z);
      pad.rotation.y = yaw;
      const at = (u: number, t: number): Point => {
        const angle = 0.23 + (tau - 0.53) * u,
          scaled =
            t *
            r *
            (1 + 0.029 * Math.sin(angle * 6) + 0.021 * Math.cos(angle * 3));
        return [
          Math.sin(angle) * scaled,
          0.018 * t * t + 0.014 * Math.sin(2 * angle) * t * t,
          Math.cos(angle) * scaled * 0.76,
        ];
      };
      mesh(surface(38, 6, at), paint(color, 0, 0.59), pad);
      for (let i = 0; i < 10; i++) {
        const u = (i + 0.45) / 10;
        const ridge = [0.02, 0.3, 0.6, 0.93].map((t) => {
          const p = at(u, t);
          p[1] += 0.007;
          return p;
        });
        line(ridge, "#a7b583", pad);
        if (i % 2 === 0) {
          const edge = at(u + 0.041, 0.86);
          edge[1] += 0.006;
          line([ridge[2], edge], "#8caa7c", pad);
        }
      }
      for (const [u, t, s] of [
        [0.22, 0.59, 0.031],
        [0.53, 0.76, 0.018],
      ]) {
        const a = at(u, t);
        bead(
          a[0],
          a[1] + 0.01,
          a[2],
          s,
          s * 0.66,
          s,
          paint("#cedbd2", 0.27, 0.12),
          pad,
        );
      }
    }
    lilyPad(-0.66, 0.14, 0.47, 0.92, "#60876b");
    lilyPad(0.63, 0.23, 0.49, -0.52, "#759568");
    lilyPad(0.38, -0.47, 0.33, 2.15, "#84a27e");
    lilyPad(-0.8, -0.38, 0.24, -1.63, "#79986b");
    const flower = group(root);
    flower.position.set(-0.13, -0.255, 0.055);
    rod(
      [
        [-0.17, -0.56, 0.1],
        [-0.2, -0.39, 0.1],
        [-0.13, -0.235, 0.055],
      ],
      0.043,
      paint("#517054"),
      root,
    );
    const shades = [
      ["#ca8698", "#e4a9aa"],
      ["#eeb6be", "#f4c5c6"],
      ["#f9d7d2", "#ffe6d7"],
      ["#ffe3d5", "#fff1da"],
    ];
    for (let k = 0; k < 4; k++) {
      const length = 0.89 - 0.135 * k,
        count = 12 - k;
      for (let i = 0; i < count; i++) {
        const stem = group(flower);
        const angle = tau * (i / count + 0.035 * k);
        stem.rotation.y = angle;
        stem.position.set(
          Math.sin(angle) * (0.09 - 0.013 * k),
          k * 0.015,
          Math.cos(angle) * (0.09 - 0.013 * k),
        );
        const petal = group(stem),
          w = (0.174 - 0.019 * k) * (1 + 0.07 * Math.sin(i * 5.3));
        const at = (u: number, t: number): Point => {
          const spread = Math.pow(Math.max(0, Math.sin(pi * t)), 0.73);
          return [
            (2 * u - 1) * w * spread,
            length * t,
            0.115 * Math.sin(pi * t) -
              0.053 * t * t +
              0.11 * (2 * u - 1) ** 2 * spread,
          ];
        };
        mesh(surface(8, 15, at), paint(shades[k][i % 2], 0.025, 0.51), petal);
        for (const u of [0.36, 0.5, 0.64]) {
          const trace = [0.12, 0.27, 0.45, 0.64, 0.81, 0.945].map((t) => {
            const p = at(u, t);
            p[2] += 0.002;
            return p;
          });
          line(trace, k < 2 ? "#cd999e" : "#efc6b6", petal);
        }
        const start = 0.16 + k * 0.022 + (i % 3) * 0.018,
          end = 1.44 - k * 0.2 + 0.055 * Math.sin(i * 3.2);
        poses.push((a) => {
          petal.rotation.x = T.MathUtils.lerp(
            start,
            end,
            ease(a, 0.045 * k, 0.76 + 0.063 * k),
          );
        });
      }
    }
    const heart = group(flower);
    heart.position.y = 0.085;
    const pollen = paint("#eabd51", 0.035, 0.61);
    const receptacle = bead(
      0,
      0.048,
      0,
      0.154,
      0.12,
      0.154,
      paint("#d5ad4d"),
      heart,
    );
    for (let i = 0; i < 24; i++) {
      const a = (tau * i) / 24,
        x = 0.16 * Math.cos(a),
        z = 0.16 * Math.sin(a),
        y = 0.158 + 0.035 * Math.sin(i * 1.84);
      rod(
        [
          [x * 0.64, 0, z * 0.64],
          [x, y, z],
        ],
        0.009,
        paint("#ebc969"),
        heart,
        3,
      );
      bead(x, y, z, 0.017, 0.03, 0.017, pollen, heart);
    }
    receptacle.rotation.z = 0.09;
    const dragon = group(root),
      body = group(dragon);
    body.rotation.y = -0.86;
    body.rotation.z = -0.06;
    const dark = paint("#214b49", 0.22, 0.42),
      teal = paint("#3b8d82", 0.3, 0.35);
    bead(0, 0.02, 0.095, 0.079, 0.067, 0.128, dark, body);
    bead(0, 0.02, 0.21, 0.088, 0.057, 0.05, teal, body);
    for (const s of [-1, 1])
      bead(
        0.065 * s,
        0.034,
        0.235,
        0.041,
        0.043,
        0.036,
        paint("#507a66", 0.32, 0.24),
        body,
      );
    for (let i = 0; i < 9; i++) {
      const rad = 0.043 - i * 0.0033;
      bead(
        0,
        0.016 - 0.003 * i,
        -0.038 - i * 0.07,
        rad,
        0.89 * rad,
        0.052,
        i % 3 === 0 ? teal : dark,
        body,
      );
    }
    for (const side of [-1, 1])
      for (let k = 0; k < 2; k++) {
        const wing = group(body);
        wing.position.set(0.034 * side, 0.045, k === 0 ? 0.093 : 0.009);
        const length = k === 0 ? 0.63 : 0.59,
          width = k === 0 ? 0.083 : 0.108,
          sweep = k === 0 ? 0.102 : -0.137;
        const at = (u: number, t: number): Point => {
          const widthAt = width * Math.pow(Math.max(0, Math.sin(pi * t)), 0.64);
          return [
            side * length * t,
            0.018 * Math.sin(pi * t) - 0.012 * t * t,
            sweep * t + (2 * u - 1) * widthAt,
          ];
        };
        mesh(
          surface(5, 15, at),
          paint(k === 0 ? "#b0d8cb" : "#adc8be", 0.15, 0.28, 0.64),
          wing,
        );
        const pts = (u: number) =>
          [0.035, 0.16, 0.3, 0.5, 0.69, 0.86, 0.986].map((t) => at(u, t));
        line(pts(0.02), "#526f65", wing);
        line(pts(0.96), "#638174", wing);
        line(pts(0.49), "#658778", wing);
        for (let j = 1; j < 8; j++) {
          const t = j * 0.102;
          line(
            [at(0.07, t), at(0.48, t + 0.059), at(0.91, t + 0.1)],
            "#809a89",
            wing,
          );
        }
        const p = at(0.87, 0.81),
          tip = bead(p[0], p[1] + 0.004, p[2], 0.034, 0.004, 0.011, dark, wing);
        tip.rotation.y = side * 0.15;
        poses.push((a) => {
          const flight = ease(a, 0.47, 0.93);
          wing.rotation.z =
            side * T.MathUtils.lerp(0.32, 0.1 + k * 0.045, flight);
          wing.rotation.y = side * (1 - flight) * 1.15;
        });
      }
    poses.push((a) => {
      const flight = ease(a, 0.38, 1);
      dragon.position.set(
        -0.34 + 0.93 * flight,
        0.17 + 0.54 * flight,
        -0.16 + 0.18 * flight,
      );
      dragon.scale.setScalar(0.44 + 0.56 * flight);
      dragon.rotation.x = 0.045 + flight * 0.39;
      dragon.rotation.y = -0.31 + 0.45 * flight;
      dragon.rotation.z = 0.11 - 0.2 * flight;
    });
    root.rotation.set(0.39, -0.09, 0.01);
  }

  function classic() {
    const pine = paint("#23453f"),
      night = paint("#263d43"),
      terra = paint("#ac483b"),
      ash = paint("#69523c");
    const theater = group(root);
    block(2.33, 0.15, 1.0, ash, theater, 0, -0.78, -0.03);
    block(2.46, 0.055, 1.05, cream, theater, 0, -0.68, -0.03);
    block(2.35, 0.09, 0.99, pine, theater, 0, -0.62, -0.03);
    const backdrop = cut(roundSheet(2.12, 1.54, 0.065), 0.042, night, theater);
    backdrop.position.set(0, 0.14, -0.39);
    const moon = mesh(
      new T.CircleGeometry(0.225, 50),
      paint("#efd098"),
      theater,
    );
    moon.position.set(0.56, 0.53, -0.333);
    for (let i = 0; i < 16; i++) {
      const x = -0.94 + 1.9 * ((Math.sin(i * 13.23 + 0.82) + 1) * 0.5),
        y = 0.29 + 0.46 * ((Math.sin(i * 4.19 + 0.4) + 1) * 0.5);
      if (Math.hypot(x - 0.56, y - 0.53) < 0.27) continue;
      bead(x, y, -0.32, 0.009, 0.009, 0.005, cream, theater);
    }
    for (let j = 0; j < 3; j++) {
      const ridge: T.Shape = new T.Shape(),
        n = 28;
      ridge.moveTo(-1.045, -0.57);
      for (let i = 0; i <= n; i++) {
        const x = -1.045 + (i * 2.09) / n;
        const h =
          0.32 * Math.abs(Math.sin(2.7 * x + j * 0.99)) +
          0.17 * Math.sin(5.8 * x - j * 0.45) +
          0.07 * Math.cos(9.2 * x + 0.5 * j) -
          j * 0.132;
        ridge.lineTo(x, h);
      }
      ridge.lineTo(1.045, -0.57);
      ridge.closePath();
      const mountain = cut(
        ridge,
        0.023,
        [paint("#7d9290"), paint("#587773"), paint("#355749")][j],
        theater,
      );
      mountain.position.z = -0.29 + 0.093 * j;
    }
    for (let i = 0; i < 9; i++) {
      const x = -0.87 + 0.22 * i,
        h = 0.2 + 0.11 * (1 + Math.sin(i * 3.4)),
        w = 0.085 + 0.024 * Math.cos(i * 2.1);
      const tree = cut(
        polygon([
          [0, h],
          [-w * 0.54, h * 0.57],
          [-w * 0.3, h * 0.55],
          [-w * 0.92, h * 0.27],
          [-w * 0.5, h * 0.25],
          [-w, 0],
          [w, 0],
          [w * 0.5, h * 0.25],
          [w * 0.91, h * 0.27],
          [w * 0.29, h * 0.55],
          [w * 0.56, h * 0.57],
        ]),
        0.019,
        pine,
        theater,
      );
      tree.position.set(
        x,
        -0.5 + Math.sin(i * 4.1) * 0.047,
        0.001 + (i % 2) * 0.03,
      );
    }
    for (const side of [-1, 1]) {
      const hinge = group(theater);
      hinge.position.set(1.056 * side, -0.565, 0.366);
      const panel = group(hinge);
      panel.position.set(-side * 0.528, 0.7, 0);
      const cutout = roundSheet(1.055, 1.4, 0.035);
      for (let j = 0; j < 3; j++)
        for (let i = 0; i < 2; i++) {
          const x = -0.27 + i * 0.48,
            y = -0.38 + j * 0.38,
            wx = 0.08 + (j % 2) * 0.03,
            hy = 0.119;
          const hole = new T.Path();
          hole.moveTo(x - wx, y);
          hole.quadraticCurveTo(x + 0.01, y + hy, x + wx, y);
          hole.quadraticCurveTo(x, y - hy, x - wx, y);
          cutout.holes.push(hole);
        }
      const door = cut(cutout, 0.045, night, panel);
      door.position.z = -0.022;
      for (const y of [-0.61, 0.61])
        block(0.92, 0.019, 0.014, gold, panel, 0, y, 0.03);
      for (const x of [-0.45, 0.45])
        block(0.013, 1.2, 0.014, gold, panel, x, 0, 0.03);
      const mark = cut(
        polygon([
          [-0.085, 0],
          [0, 0.126],
          [0.085, 0],
          [0, -0.126],
        ]),
        0.01,
        terra,
        panel,
      );
      mark.position.set(-side * 0.29, 0.02, 0.034);
      for (const y of [0.12, 1.22]) {
        const pin = mesh(
          new T.CylinderGeometry(0.045, 0.045, 0.105, 18),
          gold,
          hinge,
        );
        pin.position.y = y;
      }
      poses.push((a) => {
        hinge.rotation.y = side * ease(a, 0, 0.75) * 2.08;
      });
    }
    const crane = group(theater),
      wingPaint = ["#bd4436", "#df7050", "#a73632", "#d95b42"];
    folded(
      [
        [-0.28, 0, 0],
        [0.29, 0.03, 0],
        [0, 0.17, 0.04],
        [0.035, -0.13, 0.035],
        [0.01, 0.025, 0.12],
        [0.01, 0.05, -0.12],
      ],
      [
        [0, 2, 4],
        [0, 4, 3],
        [1, 4, 2],
        [1, 3, 4],
        [0, 5, 2],
        [0, 3, 5],
        [1, 2, 5],
        [1, 5, 3],
      ],
      wingPaint,
      crane,
    );
    // Faceted neck follows a bent paper fold. The pointed head and tail share the body.
    folded(
      [
        [0.21, 0.01, 0],
        [0.305, 0.045, 0.055],
        [0.374, 0.4, 0],
        [0.368, 0.365, -0.036],
        [0.497, 0.301, 0.007],
        [0.253, 0.013, -0.045],
      ],
      [
        [0, 1, 2],
        [0, 2, 5],
        [2, 1, 3],
        [2, 3, 4],
        [3, 5, 2],
      ],
      wingPaint,
      crane,
    );
    folded(
      [
        [-0.16, 0.025, 0],
        [-0.25, -0.02, 0.064],
        [-0.61, 0.205, 0],
        [-0.22, -0.02, -0.052],
      ],
      [
        [0, 1, 2],
        [0, 2, 3],
        [1, 3, 2],
      ],
      wingPaint,
      crane,
    );
    for (const side of [-1, 1]) {
      const wing = group(crane);
      folded(
        [
          [-0.16, 0.026, 0.026 * side],
          [0.18, 0.06, 0.023 * side],
          [0.036, 0.119, 0.24 * side],
          [-0.28, 0.27, 0.69 * side],
          [0.16, 0.125, 0.25 * side],
        ],
        [
          [0, 1, 2],
          [0, 2, 3],
          [2, 4, 3],
          [1, 4, 2],
        ],
        wingPaint,
        wing,
      );
      poses.push((a) => {
        wing.rotation.x = -side * (0.82 - 0.63 * ease(a, 0.38, 0.98));
      });
    }
    poses.push((a) => {
      const f = ease(a, 0.18, 1);
      crane.position.set(-0.11 + 0.11 * f, -0.37 + 1.04 * f, 0.13 + 0.27 * f);
      crane.rotation.y = -0.49 + 0.73 * f;
      crane.rotation.z = 0.07 + 0.05 * f;
      crane.scale.setScalar(0.77 + 0.39 * f);
    });
    root.rotation.set(0.13, -0.17, -0.012);
  }

  function chapters() {
    const wine = paint("#733749"),
      goldFoil = paint("#c7a468", 0.48, 0.34),
      sheets = paint("#e9dbb8"),
      night = paint("#293e52");
    const book = group(root);
    for (const side of [-1, 1]) {
      const cover = block(
        1.34,
        0.085,
        1.64,
        wine,
        book,
        side * 0.655,
        -0.62,
        0.01,
      );
      cover.rotation.z = side * 0.026;
      const pages = block(
        1.26,
        0.11,
        1.56,
        sheets,
        book,
        side * 0.655,
        -0.531,
        0,
      );
      pages.rotation.z = side * 0.024;
      for (let i = 0; i < 4; i++)
        line(
          [
            [side * 0.045, -0.54 + 0.012 * i, 0.783],
            [side * 1.244, -0.498 + 0.011 * i, 0.783],
          ],
          "#b3a384",
          book,
        );
    }
    const spine = mesh(
      new T.CylinderGeometry(0.075, 0.075, 1.63, 28),
      wine,
      book,
    );
    spine.rotation.x = pi / 2;
    spine.position.set(0, -0.605, 0);
    const sea = block(
      2.27,
      0.025,
      1.12,
      paint("#779690"),
      book,
      0,
      -0.454,
      -0.02,
    );
    sea.rotation.y = -0.015;
    // Three differently cut paper gates stack flat and rise on separate paper hinges.
    function portal(
      w: number,
      h: number,
      opening: number,
      archTop: number,
      color: string,
      z: number,
      delay: number,
      back = false,
    ) {
      const hinge = group(book);
      hinge.position.set(0, -0.436, z);
      let shape: T.Shape;
      if (back) {
        shape = new T.Shape();
        shape.moveTo(-w / 2, 0);
        shape.lineTo(-w / 2, h * 0.67);
        shape.bezierCurveTo(-w * 0.38, h * 0.9, -w * 0.18, h, w * 0.0, h);
        shape.bezierCurveTo(w * 0.25, h, w * 0.42, h * 0.91, w / 2, h * 0.67);
        shape.lineTo(w / 2, 0);
        shape.closePath();
        for (let i = 0; i < 11; i++) {
          const x = -w * 0.39 + (w * 0.78 * i) / 10,
            y = h * (0.65 + 0.125 * Math.sin(i * 3.7));
          if (Math.hypot(x - 0.18, y - 0.9) < 0.185) continue;
          const hole = new T.Path();
          hole.absarc(x, y, 0.012 + (i % 3) * 0.003, 0, tau, true);
          shape.holes.push(hole);
        }
      } else {
        shape = new T.Shape();
        shape.moveTo(-w / 2, 0);
        shape.lineTo(-w / 2, h * 0.86);
        shape.lineTo(-w * 0.46, h);
        shape.lineTo(w * 0.46, h);
        shape.lineTo(w / 2, h * 0.86);
        shape.lineTo(w / 2, 0);
        shape.lineTo(opening / 2, 0);
        shape.lineTo(opening / 2, archTop - 0.23);
        shape.bezierCurveTo(
          opening / 2,
          archTop + 0.055,
          -opening / 2,
          archTop + 0.055,
          -opening / 2,
          archTop - 0.23,
        );
        shape.lineTo(-opening / 2, 0);
        shape.closePath();
        for (const side of [-1, 1])
          for (let i = 0; i < 2; i++) {
            const hole = new T.Path(),
              x = side * (w + opening) * 0.25,
              y = 0.18 + i * 0.19;
            hole.moveTo(x - 0.034, y);
            hole.lineTo(x - 0.034, y + 0.09);
            hole.quadraticCurveTo(x, y + 0.155, x + 0.034, y + 0.09);
            hole.lineTo(x + 0.034, y);
            hole.closePath();
            shape.holes.push(hole);
          }
      }
      cut(shape, 0.031, paint(color), hinge);
      if (!back) {
        for (const side of [-1, 1]) {
          const x = side * (w / 2 - 0.045);
          line(
            [
              [x, 0.035, 0.034],
              [x, h * 0.82, 0.034],
              [x * 0.96, h * 0.92, 0.034],
              [0, h * 0.92, 0.034],
            ],
            "#c8ad72",
            hinge,
          );
        }
        const gem = cut(
          polygon([
            [-0.041, 0],
            [0, 0.044],
            [0.041, 0],
            [0, -0.044],
          ]),
          0.012,
          goldFoil,
          hinge,
        );
        gem.position.set(0, h - 0.064, 0.038);
      } else {
        const moonShape = new T.Shape();
        moonShape.moveTo(0.095, 0.17);
        moonShape.bezierCurveTo(-0.194, 0.183, -0.205, -0.137, 0.006, -0.177);
        moonShape.bezierCurveTo(0.085, -0.19, 0.13, -0.15, 0.155, -0.118);
        moonShape.bezierCurveTo(-0.045, -0.145, -0.066, 0.052, 0.095, 0.17);
        const moon = cut(moonShape, 0.012, cream, hinge);
        moon.position.set(0.16, h * 0.73, 0.041);
      }
      poses.push((a) => {
        hinge.rotation.x =
          -(0.95 - delay * 0.24) * (1 - ease(a, delay, 0.8 + delay * 0.6)) +
          0.025;
      });
    }
    portal(1.83, 1.46, 0, 0, "#314657", -0.61, 0.02, true);
    portal(1.91, 1.16, 1.45, 0.93, "#64776f", -0.32, 0.12);
    portal(2.03, 0.89, 1.45, 0.72, "#ae765e", -0.025, 0.22);
    for (let j = 0; j < 3; j++) {
      const shape = new T.Shape();
      shape.moveTo(-1.02, 0);
      for (let i = 0; i <= 40; i++) {
        const x = -1.02 + i * 0.051;
        shape.lineTo(
          x,
          0.067 +
            0.033 * Math.sin(x * 12 + j * 1.44) +
            0.012 * Math.sin(x * 19),
        );
      }
      shape.lineTo(1.02, 0);
      shape.closePath();
      const wave = cut(
        shape,
        0.021,
        [paint("#678d8a"), paint("#426c71"), paint("#78918c")][j],
        book,
      );
      wave.position.set(0, -0.434, 0.075 + j * 0.185);
    }
    const launch = group(book);
    const hull = cut(
      polygon([
        [-0.33, 0],
        [-0.23, -0.115],
        [0.19, -0.115],
        [0.32, 0.018],
        [0.03, -0.018],
      ]),
      0.116,
      wine,
      launch,
    );
    hull.position.z = -0.054;
    block(0.34, 0.093, 0.102, cream, launch, -0.022, 0.039, 0.002);
    block(0.28, 0.018, 0.14, night, launch, -0.025, 0.099, 0.01);
    for (let i = 0; i < 4; i++)
      block(
        0.032,
        0.044,
        0.007,
        night,
        launch,
        -0.126 + i * 0.065,
        0.052,
        0.055,
      );
    for (const x of [-0.084, 0.066]) {
      const pipe = mesh(
        new T.CylinderGeometry(0.023, 0.023, 0.078, 14),
        night,
        launch,
      );
      pipe.position.set(x, 0.145, 0.012);
      const collar = mesh(
        new T.CylinderGeometry(0.026, 0.026, 0.018, 14),
        goldFoil,
        launch,
      );
      collar.position.set(x, 0.176, 0.012);
    }
    poses.push((a) => {
      const v = ease(a, 0.29, 1);
      launch.position.set(
        -0.58 + 1.1 * v,
        -0.35 + 0.065 * v,
        0.29 + 0.035 * Math.sin(v * pi),
      );
      launch.rotation.z = 0.04 * Math.sin(2 * pi * v);
    });
    root.rotation.set(0.28, -0.22, 0.006);
  }

  if (theme === "garden") garden();
  else if (theme === "classic") classic();
  else if (theme === "chapters") chapters();
  else throw new Error("Unsupported paper secret");
  root.name = "encore-" + theme;
  function update(_time: number, reveal: number) {
    for (const pose of poses) pose(T.MathUtils.clamp(reveal, 0, 1));
  }
  update(0, 0);
  return { root, update };
}
