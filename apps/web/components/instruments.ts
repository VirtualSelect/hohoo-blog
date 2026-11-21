import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

type Keep = <V extends { dispose(): void }>(value: V) => V;
type Paint = T.Material;
type Part = T.Object3D;

export function makeInstruments(design: string, about: boolean, keep: Keep) {
  const root = new T.Group();
  const movers: Array<(a: number) => void> = [];
  const materials = new Map<string, T.MeshStandardMaterial>();
  const geometries = new Map<string, T.BufferGeometry>();
  function coat(color: string, metal = 0.15, rough = 0.42) {
    const id = [color, metal, rough].join(":");
    if (!materials.has(id))
      materials.set(
        id,
        keep(
          new T.MeshStandardMaterial({
            color,
            metalness: metal,
            roughness: rough,
          }),
        ),
      );
    return materials.get(id)!;
  }
  function cached(key: string, build: () => T.BufferGeometry) {
    if (!geometries.has(key)) geometries.set(key, keep(build()));
    return geometries.get(key)!;
  }
  const navy = coat("#152533", 0.32, 0.32),
    ivory = coat("#e8e1ca", 0.16, 0.3),
    brass = coat("#ae885c", 0.73, 0.3);
  const alu = coat("#bac4c4", 0.7, 0.32),
    graphite = coat("#34383a", 0.5, 0.36),
    rubber = coat("#26272b", 0.02, 0.75);
  const blue = coat("#214ac1", 0.21, 0.32),
    white = coat("#eef0ed", 0.12, 0.33),
    red = coat("#ce331e", 0.16, 0.32);
  const cobalt = coat("#354f87", 0.53, 0.29);
  function group(parent: Part, x = 0, y = 0, z = 0) {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }
  function mesh(
    p: Part,
    geo: T.BufferGeometry,
    mat: Paint,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const o = new T.Mesh(geo, mat);
    o.position.set(x, y, z);
    o.castShadow = o.receiveShadow = true;
    p.add(o);
    return o;
  }
  function box(
    p: Part,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: Paint,
    rad = 0.025,
  ) {
    const r = Math.min(rad, h * 0.4, w * 0.35, d * 0.35);
    return mesh(
      p,
      cached(["b", w, h, d, r].join(":"), () =>
        r ? new RoundedBoxGeometry(w, h, d, 1, r) : new T.BoxGeometry(w, h, d),
      ),
      mat,
      x,
      y,
      z,
    );
  }
  function cyl(
    p: Part,
    r: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    mat: Paint,
    axis: "x" | "y" | "z" = "y",
    n = 36,
    top = r,
  ) {
    const m = mesh(
      p,
      cached(
        ["c", r, depth, n, top].join(":"),
        () => new T.CylinderGeometry(top, r, depth, n),
      ),
      mat,
      x,
      y,
      z,
    );
    if (axis === "z") m.rotation.x = Math.PI / 2;
    if (axis === "x") m.rotation.z = -Math.PI / 2;
    return m;
  }
  function ring(
    p: Part,
    outer: number,
    inner: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    mat: Paint,
    axis: "z" | "x" = "z",
  ) {
    const points = [
      [inner, -depth / 2],
      [outer - 0.008, -depth / 2],
      [outer, -depth / 2 + 0.006],
      [outer, depth / 2 - 0.006],
      [outer - 0.008, depth / 2],
      [inner, depth / 2],
      [inner, -depth / 2],
    ].map(([r, h]) => new T.Vector2(r, h));
    const m = mesh(
      p,
      cached(
        ["r", outer, inner, depth].join(":"),
        () => new T.LatheGeometry(points, 48),
      ),
      mat,
      x,
      y,
      z,
    );
    if (axis === "z") m.rotation.x = Math.PI / 2;
    else m.rotation.z = -Math.PI / 2;
    return m;
  }
  function outline(
    p: Part,
    pts: number[][],
    deep: number,
    mat: Paint,
    bevel = 0.012,
  ) {
    const shape = new T.Shape(pts.map(([x, y]) => new T.Vector2(x, y)));
    const geo = keep(
      new T.ExtrudeGeometry(shape, {
        depth: deep,
        bevelEnabled: bevel > 0,
        bevelSegments: 1,
        bevelSize: bevel,
        bevelThickness: bevel,
        steps: 1,
        curveSegments: 4,
      }),
    );
    geo.translate(0, 0, -deep / 2);
    return mesh(p, geo, mat);
  }
  function graphic(
    p: Part,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    top = false,
  ) {
    if (typeof document === "undefined") return;
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = Math.max(48, Math.round((512 * h) / w));
    const ctx = c.getContext("2d");
    if (!ctx) return;
    draw(ctx, c.width, c.height);
    const tex = keep(new T.CanvasTexture(c));
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = keep(
      new T.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
    const m = mesh(
      p,
      cached(["p", w, h].join(":"), () => new T.PlaneGeometry(w, h)),
      mat,
      x,
      y,
      z,
    );
    if (top) m.rotation.x = -Math.PI / 2;
    m.castShadow = false;
  }
  function sign(
    p: Part,
    label: string,
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    color: string,
    top = false,
  ) {
    graphic(
      p,
      w,
      h,
      x,
      y,
      z,
      (c, W, H) => {
        c.fillStyle = color;
        c.font = "650 " + H * 0.7 + "px Arial, sans-serif";
        c.textBaseline = "middle";
        c.fillText(label, 4, H * 0.52, W - 7);
      },
      top,
    );
  }
  function screw(
    p: Part,
    x: number,
    y: number,
    z: number,
    axis: "z" | "y" = "z",
    radius = 0.025,
  ) {
    cyl(p, radius, 0.011, x, y, z, alu, axis, 14);
    const slot =
      axis === "z"
        ? box(
            p,
            radius * 1.25,
            radius * 0.22,
            0.004,
            x,
            y,
            z + 0.006,
            graphite,
            0,
          )
        : box(
            p,
            radius * 1.25,
            0.004,
            radius * 0.22,
            x,
            y + 0.007,
            z,
            graphite,
            0,
          );
    if (axis === "z") slot.rotation.z = 0.58;
    else slot.rotation.y = 0.58;
  }
  function glass(p: Part, r: number, z: number) {
    const mat = keep(
      new T.MeshPhysicalMaterial({
        color: "#274e59",
        metalness: 0.42,
        roughness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.07,
        iridescence: 0.25,
        iridescenceIOR: 1.32,
      }),
    );
    const lens = mesh(p, keep(new T.SphereGeometry(r, 40, 22)), mat, 0, 0, z);
    lens.scale.z = 0.21;
    // Broad photographic reflections sit on the coated glass, beneath the rim.
    graphic(p, r * 1.92, r * 1.92, 0, 0, z + r * 0.22, (c, W, H) => {
      c.save();
      c.beginPath();
      c.arc(W / 2, H / 2, W * 0.495, 0, Math.PI * 2);
      c.clip();
      const g = c.createLinearGradient(0, 0, W * 0.8, H);
      g.addColorStop(0, "rgba(106,183,181,.38)");
      g.addColorStop(0.32, "rgba(45,103,105,.1)");
      g.addColorStop(0.68, "rgba(0,21,33,.35)");
      g.addColorStop(1, "rgba(58,117,122,.18)");
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      c.strokeStyle = "rgba(152,203,192,.27)";
      c.lineWidth = W * 0.017;
      c.beginPath();
      c.ellipse(W * 0.5, H * 0.49, W * 0.35, H * 0.34, -0.48, 3.1, 5.2);
      c.stroke();
      c.strokeStyle = "rgba(129,187,180,.16)";
      c.lineWidth = W * 0.028;
      c.beginPath();
      c.ellipse(W * 0.48, H * 0.48, W * 0.23, H * 0.22, -0.6, 2.6, 5.1);
      c.stroke();
      c.restore();
    });
  }
  function knurl(
    p: Part,
    x: number,
    y: number,
    z: number,
    r: number,
    depth: number,
    count: number,
    mat: Paint,
    axis: "x" | "z",
  ) {
    const g = group(p, x, y, z);
    if (axis === "x") g.rotation.y = Math.PI / 2;
    const geo = cached(
      ["kn", r, depth, count].join(":"),
      () => new T.BoxGeometry(r * 0.035, r * 0.08, depth),
    );
    const inst = keep(new T.InstancedMesh(geo, mat, count));
    const dummy = new T.Object3D();
    for (let j = 0; j < count; j++) {
      const a = (j * Math.PI * 2) / count;
      dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      dummy.rotation.z = a - Math.PI / 2;
      dummy.updateMatrix();
      inst.setMatrixAt(j, dummy.matrix);
    }
    inst.castShadow = true;
    g.add(inst);
  }
  function opticalHead(p: Part, r: number, stem: number) {
    const base = group(p);
    ring(base, r * 1.12, r * 0.68, stem, 0, 0, 0, graphite);
    for (let i = 0; i < 3; i++)
      ring(base, r * 1.1, r * 0.67, 0.016, 0, 0, stem * (i - 1) * 0.28, alu);
    ring(base, r, r * 0.8, 0.14, 0, 0, stem / 2 + 0.025, navy);
    knurl(base, 0, 0, stem / 2 + 0.01, r, 0.105, 54, graphite, "z");
    glass(base, r * 0.82, stem / 2 + 0.09);
    ring(base, r * 0.91, r * 0.76, 0.035, 0, 0, stem / 2 + 0.14, graphite);
    return base;
  }

  function viewfinder() {
    const mount = group(root, 0, -0.04, -0.14);
    box(mount, 1.9, 0.13, 1.05, 0, -0.69, 0, alu, 0.06);
    box(mount, 1.72, 0.045, 0.89, 0, -0.775, 0, rubber, 0.02);
    for (const side of [-1, 1]) {
      const support = outline(
        mount,
        [
          [-0.27, -0.64],
          [0.2, -0.64],
          [0.115, -0.27],
          [0.085, -0.05],
          [-0.13, -0.03],
          [-0.16, -0.26],
        ],
        0.075,
        alu,
      );
      support.rotation.y = Math.PI / 2;
      support.position.x = side * 0.805;
    }
    const body = group(mount, 0, 0.1, -0.01);
    const enamel = outline(
      body,
      [
        [-0.91, -0.44],
        [0.88, -0.44],
        [0.88, 0.26],
        [0.71, 0.47],
        [-0.57, 0.5],
        [-0.86, 0.39],
        [-0.94, 0.24],
      ],
      0.77,
      ivory,
      0.055,
    );
    enamel.position.z = -0.12;
    box(body, 1.58, 0.025, 0.54, 0, 0.535, -0.11, alu, 0.014);
    box(body, 0.32, 0.17, 0.27, -0.59, 0.57, -0.13, navy, 0.035);
    sign(body, "H / OPTICS", 0.43, 0.073, 0.53, 0.16, 0.332, "#364d49");
    box(body, 0.18, 0.027, 0.015, 0.44, 0.065, 0.324, brass, 0.003);
    cyl(body, 0.225, 0.14, 0.954, -0.07, -0.1, graphite, "x");
    cyl(body, 0.212, 0.12, 1.04, -0.07, -0.1, alu, "x");
    knurl(body, 1.043, -0.07, -0.1, 0.212, 0.09, 40, graphite, "x");
    cyl(body, 0.099, 0.014, 1.11, -0.07, -0.1, navy, "x");
    for (const s of [-1, 1]) screw(body, 0.73 * s, -0.34, 0.327);
    const barrels = group(body, -0.17, 0.005, 0.36);
    ring(barrels, 0.54, 0.34, 0.13, 0, 0, 0.045, alu);
    const tier1 = group(barrels, 0, 0, 0.129),
      tier2 = group(barrels, 0, 0, 0.223),
      face = group(barrels, 0, 0, 0.34);
    ring(tier1, 0.499, 0.386, 0.14, 0, 0, 0, navy);
    for (let j = 0; j < 4; j++)
      ring(tier1, 0.503, 0.46, 0.012, 0, 0, -0.045 + j * 0.024, graphite);
    ring(tier2, 0.469, 0.344, 0.145, 0, 0, 0, navy);
    ring(tier2, 0.475, 0.4, 0.026, 0, 0, 0.033, brass);
    ring(face, 0.481, 0.363, 0.18, 0, 0, 0, graphite);
    knurl(face, 0, 0, 0.015, 0.481, 0.126, 64, navy, "z");
    glass(face, 0.366, 0.09);
    ring(face, 0.454, 0.344, 0.05, 0, 0, 0.153, navy);
    movers.push((a) => {
      tier1.position.z = 0.129 + a * 0.22;
      tier2.position.z = 0.223 + a * 0.45;
      face.position.z = 0.34 + a * 0.72;
    });
    root.rotation.set(0.22, -0.55, -0.025);
  }

  function foldingCamera() {
    const cam = group(root, 0, 0.01, 0);
    const warm = coat("#8b5b3b", 0.09, 0.38),
      mahogany = coat("#623f35", 0.12, 0.45),
      leather = coat("#39333b", 0.07, 0.69);
    const axisY = 0.13;
    box(cam, 1.52, 0.11, 1.75, 0, -0.75, 0.03, warm, 0.025);
    for (const x of [-0.53, 0.53]) {
      box(cam, 0.055, 0.07, 1.86, x, -0.66, 0.07, alu, 0.008);
      box(cam, 0.028, 0.023, 1.66, x, -0.614, 0.07, brass, 0.004);
    }
    function standard(p: Part, w: number, h: number, mat: Paint) {
      for (const side of [-1, 1]) {
        box(p, 0.098, h, 0.11, (side * (w - 0.098)) / 2, 0, 0, mat, 0.012);
        box(
          p,
          w - 0.13,
          0.098,
          0.12,
          0,
          (side * (h - 0.098)) / 2,
          0,
          mat,
          0.012,
        );
      }
    }
    const back = group(cam, 0, axisY, -0.53),
      front = group(cam, 0, axisY, 0.25);
    standard(back, 1.6, 1.52, warm);
    standard(front, 1.22, 1.23, warm);
    box(back, 1.44, 1.37, 0.043, 0, 0, -0.09, navy, 0.014);
    box(
      back,
      1.28,
      1.21,
      0.018,
      0,
      0,
      -0.118,
      coat("#b0c6b8", 0.24, 0.41),
      0.014,
    );
    for (const s of [-1, 1]) {
      box(back, 0.056, 1.43, 0.06, s * 0.84, -0.04, -0.025, brass, 0.016);
      cyl(back, 0.091, 0.108, s * 0.86, -0.32, -0.025, brass, "x");
      box(front, 0.074, 1.08, 0.076, s * 0.65, -0.19, -0.007, brass, 0.021);
      cyl(front, 0.091, 0.105, s * 0.674, -0.1, 0, brass, "x");
    }
    box(front, 1.09, 1.1, 0.056, 0, 0, 0.025, navy, 0.018);
    for (const s of [-1, 1])
      for (const t of [-1, 1])
        screw(front, s * 0.49, t * 0.49, 0.065, "z", 0.018);
    opticalHead(front, 0.309, 0.21).position.z = 0.19;
    const bellows = group(cam, 0, axisY, -0.51);
    const verts: number[] = [];
    const idx: number[] = [];
    const steps = 18;
    for (let j = 0; j <= steps; j++) {
      const t = j / steps,
        fold = j % 2 === 0 ? 1 : 0.885,
        w = (0.75 * (1 - t) + 0.55 * t) * fold,
        h = (0.685 * (1 - t) + 0.55 * t) * fold;
      for (const [x, y] of [
        [-w, -h],
        [w, -h],
        [w, h],
        [-w, h],
      ])
        verts.push(x, y, t);
    }
    for (let j = 0; j < steps; j++)
      for (let k = 0; k < 4; k++) {
        const a = j * 4 + k,
          b = j * 4 + ((k + 1) % 4);
        idx.push(a, b, a + 4, b, b + 4, a + 4);
      }
    const shell = new T.BufferGeometry();
    shell.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
    shell.setIndex(idx);
    const folds = keep(shell.toNonIndexed());
    shell.dispose();
    folds.computeVertexNormals();
    const material = leather.clone();
    material.side = T.DoubleSide;
    mesh(bellows, folds, keep(material));
    // Each outward pleat has a slightly burnished leather edge. The seam follows
    // the tapered cross-section while the standards move apart.
    const seamPoints: T.Vector3[] = [];
    for (let j = 2; j < steps; j += 2) {
      const t = j / steps,
        w = 0.75 * (1 - t) + 0.55 * t + 0.002,
        h = 0.685 * (1 - t) + 0.55 * t + 0.002;
      const knots = [
        new T.Vector3(-w, -h, t),
        new T.Vector3(w, -h, t),
        new T.Vector3(w, h, t),
        new T.Vector3(-w, h, t),
      ];
      for (let k = 0; k < 4; k++) seamPoints.push(knots[k], knots[(k + 1) % 4]);
    }
    bellows.add(
      new T.LineSegments(
        keep(new T.BufferGeometry().setFromPoints(seamPoints)),
        keep(new T.LineBasicMaterial({ color: "#725c60" })),
      ),
    );
    for (const face of [front, back])
      for (const side of [-1, 1]) {
        const y = face === front ? 0.535 : 0.67,
          x = face === front ? 0.54 : 0.72;
        for (const high of [-1, 1])
          screw(face, side * x, high * y, 0.089, "z", 0.022);
      }
    for (const s of [-1, 1]) {
      cyl(cam, 0.092, 0.115, s * 0.76, -0.68, 0.4, mahogany, "x");
      knurl(cam, s * 0.765, -0.68, 0.4, 0.093, 0.092, 27, brass, "x");
    }
    movers.push((a) => {
      front.position.z = 0.23 + a * 0.62;
      bellows.scale.z = front.position.z + 0.478;
    });
    root.rotation.set(0.24, -0.7, -0.025);
  }

  function calculator() {
    const bottom = group(root, 0, -0.29, 0),
      board = group(root, 0, -0.18, 0),
      deck = group(root, 0, -0.08, 0);
    const ceramic = coat("#dedcd1", 0.08, 0.43),
      pcb = coat("#474d40", 0.27, 0.49),
      blackKey = coat("#313333", 0.08, 0.43);
    box(bottom, 1.43, 0.16, 1.96, 0, 0, 0, rubber, 0.075);
    box(bottom, 1.37, 0.075, 1.9, 0, 0.08, 0, graphite, 0.045);
    for (const side of [-1, 1])
      for (const end of [-1, 1]) {
        cyl(bottom, 0.062, 0.025, side * 0.54, -0.091, end * 0.74, rubber);
        cyl(bottom, 0.031, 0.07, side * 0.62, 0.12, end * 0.88, brass, "y", 18);
      }
    box(board, 1.28, 0.042, 1.8, 0, 0, 0, pcb, 0.02);
    for (const side of [-1, 1])
      for (const end of [-1, 1])
        cyl(board, 0.034, 0.016, side * 0.57, 0.028, end * 0.8, brass);
    for (let i = 0; i < 9; i++) {
      box(
        board,
        0.013,
        0.008,
        0.53,
        -0.42 + i * 0.095,
        0.026,
        -0.435,
        brass,
        0.001,
      );
      box(
        board,
        0.12,
        0.008,
        0.012,
        -0.366 + i * 0.095,
        0.027,
        -0.17,
        brass,
        0.001,
      );
    }
    for (let i = 0; i < 4; i++) {
      box(
        board,
        0.28,
        0.058,
        0.17,
        ((i % 2) - 0.5) * 0.52,
        0.049,
        0.18 + Math.floor(i / 2) * 0.36,
        blackKey,
        0.008,
      );
      for (let j = 0; j < 4; j++)
        for (const side of [-1, 1])
          box(
            board,
            0.018,
            0.016,
            0.04,
            ((i % 2) - 0.5) * 0.52 + (j - 1.5) * 0.052,
            0.038,
            0.18 + Math.floor(i / 2) * 0.36 + side * 0.102,
            alu,
            0.001,
          );
    }
    box(deck, 1.42, 0.135, 1.96, 0, 0, 0, ceramic, 0.065);
    box(deck, 1.25, 0.04, 0.44, 0, 0.086, -0.65, graphite, 0.027);
    box(
      deck,
      1.07,
      0.016,
      0.25,
      0,
      0.111,
      -0.65,
      coat("#829781", 0.05, 0.44),
      0.018,
    );
    graphic(
      deck,
      0.95,
      0.2,
      0,
      0.123,
      -0.65,
      (ctx, w, h) => {
        const paths = [
          [
            [0.12, 0.04],
            [0.84, 0.04],
          ],
          [
            [0.89, 0.11],
            [0.89, 0.44],
          ],
          [
            [0.89, 0.56],
            [0.89, 0.89],
          ],
          [
            [0.12, 0.96],
            [0.84, 0.96],
          ],
          [
            [0.07, 0.56],
            [0.07, 0.89],
          ],
          [
            [0.07, 0.11],
            [0.07, 0.44],
          ],
          [
            [0.12, 0.5],
            [0.84, 0.5],
          ],
        ];
        const glyphs = [
          [0, 1, 2, 3, 4, 5],
          [1, 2],
          [0, 1, 3, 4, 6],
          [0, 1, 2, 3, 6],
        ];
        for (let n = 0; n < 4; n++) {
          ctx.strokeStyle = "#334039";
          ctx.lineWidth = h * 0.09;
          ctx.lineCap = "square";
          for (const k of glyphs[n]) {
            ctx.beginPath();
            paths[k].forEach(([x, y], j) => {
              const px = w * 0.29 + n * w * 0.164 + x * w * 0.103;
              return j
                ? ctx.lineTo(px, h * (0.09 + 0.82 * y))
                : ctx.moveTo(px, h * (0.09 + 0.82 * y));
            });
            ctx.stroke();
          }
        }
      },
      true,
    );
    const symbols = [
      ["7", "8", "9", "÷"],
      ["4", "5", "6", "×"],
      ["1", "2", "3", "−"],
      ["C", "0", "=", "+"],
    ];
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) {
        const x = (col - 1.5) * 0.298,
          z = -0.23 + row * 0.296;
        box(deck, 0.263, 0.071, 0.229, x, 0.092, z, graphite, 0.027);
        box(
          deck,
          0.241,
          0.038,
          0.205,
          x,
          0.135,
          z,
          col === 3 || (row === 3 && col === 0)
            ? red
            : (row + col) % 3 === 0
              ? graphite
              : blackKey,
          0.022,
        );
        sign(
          deck,
          symbols[row][col],
          0.109,
          0.089,
          x + 0.014,
          0.156,
          z + 0.002,
          "#faf8e9",
          true,
        );
      }
    sign(
      deck,
      "HOHOO  /  COMPUTE",
      0.57,
      0.041,
      -0.23,
      0.077,
      -0.354,
      "#383a34",
      true,
    );
    for (const side of [-1, 1])
      screw(deck, side * 0.605, 0.075, 0.87, "y", 0.018);
    movers.push((a) => {
      board.position.y = -0.18 + a * 0.32;
      deck.position.y = -0.08 + a * 0.77;
      deck.position.z = -0.18 * a;
    });
    root.rotation.set(0.79, -0.28, -0.12);
  }

  function scissor() {
    const g = group(root, 0, -0.71, 0);
    box(g, 2.13, 0.145, 1.0, 0, 0, 0, graphite, 0.046);
    box(g, 1.96, 0.065, 0.9, 0, -0.1, 0, rubber, 0.026);
    const stage = group(g),
      sills = group(g);
    box(stage, 1.92, 0.12, 0.92, 0, 0, 0, ivory, 0.035);
    box(stage, 1.61, 0.027, 0.7, 0, 0.077, 0, red, 0.015);
    sign(
      stage,
      "HOHOO    /    KINEMATICS",
      0.99,
      0.088,
      0,
      0.093,
      0,
      "#fff2de",
      true,
    );
    for (const side of [-1, 1]) {
      box(g, 1.7, 0.042, 0.06, 0, 0.094, side * 0.373, alu, 0.012);
      box(sills, 1.52, 0.05, 0.065, 0, 0, side * 0.373, alu, 0.012);
    }
    const L = 1.64;
    const straps: Array<{ o: T.Object3D; level: number; diagonal: number }> =
      [];
    const pins: Array<{
      o: T.Object3D;
      level: number;
      edge: number;
      mid: boolean;
    }> = [];
    for (let level = 0; level < 2; level++)
      for (const side of [-1, 1]) {
        for (const diagonal of [-1, 1]) {
          const o = group(g, 0, 0, side * (diagonal === 1 ? 0.395 : 0.333));
          box(
            o,
            L,
            0.115,
            0.052,
            0,
            0,
            0,
            diagonal === 1 ? red : graphite,
            0.023,
          );
          for (const sign of [-1, 1])
            cyl(
              o,
              0.057,
              0.052,
              (sign * L) / 2,
              0,
              0,
              diagonal === 1 ? red : graphite,
              "z",
              20,
            );
          straps.push({ o, level, diagonal });
        }
        const pivot = group(g, 0, 0, side * 0.428);
        cyl(pivot, 0.067, 0.066, 0, 0, 0, alu, "z", 24);
        cyl(pivot, 0.027, 0.078, 0, 0, 0, graphite, "z", 12);
        pins.push({ o: pivot, level, edge: 0, mid: true });
      }
    for (let level = 0; level <= 2; level++)
      for (const edge of [-1, 1]) {
        const pin = group(g);
        cyl(pin, 0.043, 0.94, 0, 0, 0, alu, "z", 20);
        for (const side of [-1, 1])
          cyl(pin, 0.066, 0.033, 0, 0, side * 0.468, graphite, "z", 20);
        if (level === 0) {
          box(pin, 0.19, 0.065, 0.13, 0, -0.045, 0.37, red, 0.01);
          box(pin, 0.19, 0.065, 0.13, 0, -0.045, -0.37, red, 0.01);
        }
        pins.push({ o: pin, level, edge, mid: false });
      }
    movers.push((a) => {
      const h = 0.39 + a * 0.46,
        half = 0.5 * Math.sqrt(L * L - h * h),
        angle = Math.asin(h / L);
      stage.position.y = 0.21 + h * 2;
      sills.position.y = 0.14 + h * 2;
      for (const { o, level, diagonal } of straps) {
        o.position.y = 0.145 + (level + 0.5) * h;
        o.rotation.z = diagonal * angle;
      }
      for (const { o, level, edge, mid } of pins) {
        o.position.x = edge * half;
        o.position.y = 0.145 + (level + (mid ? 0.5 : 0)) * h;
      }
    });
    root.rotation.set(0.29, -0.46, -0.015);
  }

  function indexingDock() {
    const dock = group(root, 0, -0.08, 0);
    box(dock, 2.21, 0.175, 1.4, 0, -0.57, 0, white, 0.078);
    box(dock, 2.0, 0.078, 1.22, 0, -0.675, 0, graphite, 0.044);
    for (const x of [-0.88, 0.88]) {
      box(dock, 0.16, 0.12, 1.22, x, -0.44, 0, alu, 0.042);
      cyl(dock, 0.036, 1.31, x, -0.36, 0, cobalt, "z", 24);
    }
    const tabs: T.Group[] = [];
    const shades = ["#cbd6e7", "#d7e2ef", "#c0d0e5", "#e2e8ed", "#b9c8da"].map(
      (c) => coat(c, 0.17, 0.35),
    );
    for (let j = 0; j < 5; j++) {
      const module = group(dock);
      for (const x of [-0.88, 0.88])
        box(module, 0.13, 0.14, 0.098, x, -0.35, 0, blue, 0.019);
      box(module, 1.82, 0.087, 0.092, 0, -0.31, 0, alu, 0.018);
      const tag = group(module, 0, -0.264, 0),
        tx = -0.7 + j * 0.29;
      const shape = [
        [-0.86, 0],
        [0.86, 0],
        [0.86, 0.78],
        [0.8, 0.835],
        [tx + 0.3, 0.835],
        [tx + 0.26, 0.982],
        [tx + 0.225, 1.016],
        [tx + 0.035, 1.016],
        [tx, 0.988],
        [tx - 0.04, 0.835],
        [-0.8, 0.835],
        [-0.86, 0.79],
      ];
      outline(tag, shape, 0.052, j === 0 ? white : shades[j], 0.013);
      box(tag, 1.63, 0.026, 0.009, 0, 0.81, 0.036, blue, 0.002);
      box(tag, 0.17, 0.028, 0.008, tx + 0.132, 0.931, 0.04, blue, 0.003);
      if (j === 0) {
        sign(tag, "INDEX", 0.92, 0.245, -0.17, 0.49, 0.04, "#214b9c");
        sign(
          tag,
          "HOHOO   /   FIELD DIRECTORY",
          0.99,
          0.07,
          -0.145,
          0.255,
          0.04,
          "#526e89",
        );
        for (let line = 0; line < 3; line++)
          box(
            tag,
            0.25 + line * 0.062,
            0.014,
            0.005,
            0.53,
            0.28 + line * 0.061,
            0.04,
            alu,
            0,
          );
      }
      tag.rotation.x = -0.09;
      tabs.push(module);
    }
    movers.push((a) =>
      tabs.forEach((card, j) => {
        card.position.set(
          j * a * 0.111,
          j * 0.042 + j * a * 0.062,
          0.385 - j * 0.194 - j * a * 0.035,
        );
        card.rotation.z = -j * a * 0.026;
      }),
    );
    root.rotation.set(0.27, -0.46, -0.03);
  }

  function rotaryIndex() {
    const g = group(root, 0, -0.05, 0),
      cy = -0.08;
    box(g, 2.1, 0.12, 1.06, 0, -0.65, 0.09, white, 0.063);
    box(g, 1.96, 0.063, 0.96, 0, -0.723, 0.09, rubber, 0.029);
    for (const side of [-1, 1]) {
      const cheek = outline(
        g,
        [
          [-0.48, -0.56],
          [0.45, -0.56],
          [0.22, -0.34],
          [0.146, 0.13],
          [0.05, 0.205],
          [-0.1, 0.21],
          [-0.22, 0.1],
          [-0.32, -0.32],
        ],
        0.105,
        blue,
        0.022,
      );
      cheek.rotation.y = Math.PI / 2;
      cheek.position.set(side * 0.83, 0, 0.03);
      cyl(g, 0.099, 0.15, side * 0.868, cy, 0.0, alu, "x");
    }
    cyl(g, 0.068, 1.98, 0, cy, 0, navy, "x");
    const knob = group(g, 0.99, cy, 0);
    cyl(knob, 0.156, 0.165, 0, 0, 0, blue, "x");
    knurl(knob, 0, 0, 0, 0.157, 0.142, 28, navy, "x");
    cyl(knob, 0.061, 0.008, 0.087, 0, 0, alu, "x");
    const leaves: T.Group[] = [];
    for (let i = 0; i < 13; i++) {
      const p = group(g, 0, cy, 0);
      const tab = ((i % 4) - 1.5) * 0.24;
      const points = [
        [-0.65, 0.058],
        [0.65, 0.058],
        [0.65, 0.673],
        [0.61, 0.72],
        [tab + 0.17, 0.72],
        [tab + 0.15, 0.786],
        [tab + 0.12, 0.814],
        [tab - 0.055, 0.814],
        [tab - 0.08, 0.78],
        [tab - 0.095, 0.72],
        [-0.61, 0.72],
        [-0.65, 0.667],
      ];
      outline(
        p,
        points,
        0.022,
        i % 4 === 3 ? coat("#b6cbde", 0.12, 0.47) : white,
        0.006,
      );
      box(p, 0.16, 0.018, 0.006, tab + 0.033, 0.767, 0.021, blue, 0.001);
      if (i === 12 || i === 0 || i % 3 === 0) {
        sign(
          p,
          i === 12 ? "Hohoo." : i === 0 ? "INDEX" : "FIELD NOTES",
          0.79,
          0.158,
          -0.09,
          0.475,
          0.021,
          "#274f92",
        );
        for (let line = 0; line < 3; line++)
          box(
            p,
            0.52 + line * 0.105,
            0.01,
            0.004,
            -0.19 + line * 0.04,
            0.345 - line * 0.074,
            0.018,
            coat("#829aa6", 0.15, 0.55),
            0,
          );
      }
      for (const side of [-1, 1]) {
        box(p, 0.055, 0.125, 0.038, side * 0.3, 0.032, 0, alu, 0.009);
      }
      leaves.push(p);
    }
    for (const side of [-1, 1]) {
      ring(g, 0.13, 0.102, 0.067, side * 0.3, cy, 0, alu, "x");
    }
    movers.push((a) => {
      leaves.forEach((p, i) => {
        p.rotation.x = -1.0 + i * 0.135 + (i - 6) * a * 0.14;
      });
      knob.rotation.x = a * 1.4;
    });
    root.rotation.set(0.24, -0.41, -0.028);
  }

  if (design === "photo") about ? foldingCamera() : viewfinder();
  else if (design === "construct") about ? scissor() : calculator();
  else if (design === "clear") about ? rotaryIndex() : indexingDock();
  else throw new Error("Unknown instrument theme: " + design);
  function update(_time: number, amount: number) {
    const a = Math.max(0, Math.min(1, amount));
    movers.forEach((move) => move(a));
  }
  update(0, 0);
  return { root, update };
}
