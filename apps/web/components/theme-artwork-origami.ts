import * as T from "three";

type Point = [number, number, number];
type Face = [number, number, number];
type Keep = <V extends { dispose(): void }>(value: V) => V;
export type PaperMaterials = [T.Material, T.Material, T.Material];

function solid(
  vertices: Point[],
  groups: Face[][],
  uv: (p: Point) => [number, number] = (p) => [p[2] / 4 + 0.5, p[1] / 3 + 0.3],
) {
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vertices.flat(), 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(vertices.flatMap(uv), 2));
  const indices: number[] = [];
  groups.forEach((faces, material) => {
    const start = indices.length;
    faces.forEach((face) => indices.push(...face));
    g.addGroup(start, indices.length - start, material);
  });
  g.setIndex(indices);
  const flat = g.toNonIndexed();
  g.dispose();
  flat.computeVertexNormals();
  return flat;
}

/** One folded sheet, with shared folds, a reverse skin and a complete cut edge. */
export function origamiSheet(
  points: Point[],
  faces: Face[],
  boundary: number[],
  thickness = 0.014,
) {
  const normals = points.map(() => new T.Vector3());
  for (const [a, b, c] of faces) {
    const normal = new T.Vector3(...points[b])
      .sub(new T.Vector3(...points[a]))
      .cross(new T.Vector3(...points[c]).sub(new T.Vector3(...points[a])));
    for (const i of [a, b, c]) normals[i].add(normal);
  }
  const n = points.length;
  const vertices: Point[] = [];
  for (const sign of [1, -1])
    points.forEach((point, i) => {
      vertices.push(
        new T.Vector3(...point)
          .addScaledVector(
            normals[i].clone().normalize(),
            (sign * thickness) / 2,
          )
          .toArray() as Point,
      );
    });
  const reverse: Face[] = faces.map(([a, b, c]) => [a + n, c + n, b + n]);
  const edges: Face[] = [];
  boundary.forEach((a, i) => {
    const b = boundary[(i + 1) % boundary.length];
    edges.push([a, a + n, b], [b, a + n, b + n]);
  });
  return solid(vertices, [faces, reverse, edges], (p) => [p[0] / 3, p[2] / 2]);
}

/** A continuous bird base, reverse-folded neck, downturned beak and raised tail. */
export function craneBodyGeometry() {
  const outline = [
    [-1.8, 1.03],
    [-0.27, 0.34],
    [0.32, 0.27],
    [0.72, 1.55],
    [0.92, 1.85],
    [1.62, 1.28],
    [0.98, 1.48],
    [0.83, 0.95],
    [0.65, -0.05],
    [0.06, -0.28],
    [-0.5, 0.1],
  ].map(
    ([z, y]) =>
      new T.Vector2(z, z > 0.45 && y > 0.32 ? 0.2 + (y - 0.2) * 0.72 : y),
  );
  if (T.ShapeUtils.area(outline) < 0) outline.reverse();
  const contourCount = outline.length;
  const faces = T.ShapeUtils.triangulateShape(outline, []) as Face[];
  const widths = outline.map(
    (p) => 0.012 + 0.19 * Math.exp(-((p.x / 0.6) ** 2) - (p.y / 0.6) ** 2),
  );
  // These internal raised vertices make a diamond bird base and a V-fold neck,
  // rather than an extruded flat silhouette with a constant cross-section.
  for (const [z, y, width] of [
    [0.03, 0.03, 0.3],
    [0.68, 0.7184, 0.062],
  ]) {
    const point = new T.Vector2(z, y);
    const found = faces.findIndex(([a, b, c]) => {
      const tri = new T.Triangle(
        new T.Vector3(outline[a].x, outline[a].y, 0),
        new T.Vector3(outline[b].x, outline[b].y, 0),
        new T.Vector3(outline[c].x, outline[c].y, 0),
      );
      const bary = tri.getBarycoord(new T.Vector3(z, y, 0), new T.Vector3());
      return bary && Math.min(bary.x, bary.y, bary.z) > 1e-5;
    });
    if (found >= 0) {
      const [a, b, c] = faces[found],
        i = outline.length;
      outline.push(point);
      widths.push(width);
      faces.splice(found, 1, [a, b, i], [b, c, i], [c, a, i]);
    }
  }
  const n = outline.length;
  const vertices: Point[] = [];
  for (const sign of [1, -1])
    outline.forEach((p, i) => vertices.push([sign * widths[i], p.y, p.x]));
  const front = faces.map(([a, b, c]): Face => {
    const normal = new T.Vector3(...vertices[b])
      .sub(new T.Vector3(...vertices[a]))
      .cross(new T.Vector3(...vertices[c]).sub(new T.Vector3(...vertices[a])));
    return normal.x > 0 ? [a, b, c] : [a, c, b];
  });
  const back: Face[] = front.map(([a, b, c]) => [a + n, c + n, b + n]);
  const edge: Face[] = [];
  for (let i = 0; i < contourCount; i++) {
    const j = (i + 1) % contourCount;
    edge.push([i, j, i + n], [j, j + n, i + n]);
  }
  return solid(vertices, [front, back, edge]);
}

export function craneWingGeometry(side: number) {
  const points: Point[] = [
    [0, 0, -0.48],
    [0, 0, 0.4],
    [side * 2.2, 1.15, -0.55],
    [side * 0.78, -0.08, -0.85],
    [side * 0.95, 0.73, -0.4],
  ];
  let faces: Face[] = [
    [0, 1, 4],
    [1, 2, 4],
    [2, 3, 4],
    [3, 0, 4],
  ];
  if (side < 0) faces = faces.map(([a, b, c]) => [a, c, b]);
  return origamiSheet(points, faces, side > 0 ? [0, 1, 2, 3] : [3, 2, 1, 0]);
}

function paperMesh(
  geometry: T.BufferGeometry,
  materials: PaperMaterials,
  keep: Keep,
  name: string,
) {
  const mesh = new T.Mesh(keep(geometry), materials);
  mesh.name = name;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export function createCraneRig(materials: PaperMaterials, keep: Keep) {
  const root = new T.Group();
  root.name = "origami-crane";
  root.add(
    paperMesh(
      craneBodyGeometry(),
      materials,
      keep,
      "crane-body-neck-beak-tail",
    ),
  );
  const wings = [-1, 1].map((side) => {
    const hinge = new T.Group();
    hinge.name = side < 0 ? "crane-left-shoulder" : "crane-right-shoulder";
    hinge.position.set(side * 0.12, 0.16, 0);
    hinge.add(
      paperMesh(craneWingGeometry(side), materials, keep, "crane-folded-wing"),
    );
    for (const [name, z] of [
      ["rear", -0.48],
      ["front", 0.4],
    ] as const) {
      const anchor = new T.Object3D();
      anchor.name = `${hinge.name}-${name}`;
      anchor.position.z = z;
      hinge.add(anchor);
    }
    root.add(hinge);
    return { hinge, side };
  });
  root.rotation.set(0.12, -0.32, -0.035);
  return {
    root,
    update(time: number) {
      wings.forEach(({ hinge, side }) => {
        hinge.rotation.z = side * (0.035 + Math.sin(time * 0.85) * 0.075);
      });
    },
  };
}

/** Continuous material shell: outer hull -> lip -> liner -> inner floor -> keel. */
export function paperBoatHullGeometry() {
  const vertices: Point[] = [];
  const loop = (points: Point[]) => {
    const start = vertices.length;
    vertices.push(...points);
    return start;
  };
  const outerTop = loop([
    [2.2, 0, 0],
    [1.12, -0.04, 0.78],
    [-1.12, -0.04, 0.78],
    [-2.2, 0, 0],
    [-1.12, -0.04, -0.78],
    [1.12, -0.04, -0.78],
  ]);
  const outerBottom = loop([
    [1.35, -0.74, 0],
    [0.81, -0.73, 0.26],
    [-0.81, -0.73, 0.26],
    [-1.35, -0.74, 0],
    [-0.81, -0.73, -0.26],
    [0.81, -0.73, -0.26],
  ]);
  const innerTop = loop([
    [2.12, -0.012, 0],
    [1.1, -0.046, 0.73],
    [-1.1, -0.046, 0.73],
    [-2.12, -0.012, 0],
    [-1.1, -0.046, -0.73],
    [1.1, -0.046, -0.73],
  ]);
  const innerBottom = loop([
    [1.26, -0.7, 0],
    [0.78, -0.69, 0.22],
    [-0.78, -0.69, 0.22],
    [-1.26, -0.7, 0],
    [-0.78, -0.69, -0.22],
    [0.78, -0.69, -0.22],
  ]);
  const keel = vertices.length;
  vertices.push([0, -0.77, 0]);
  const floor = vertices.length;
  vertices.push([0, -0.73, 0]);
  const outer: Face[] = [],
    inner: Face[] = [],
    lip: Face[] = [];
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6,
      a = outerTop + i,
      b = outerTop + j,
      c = outerBottom + i,
      d = outerBottom + j;
    outer.push([a, b, c], [b, d, c], [c, d, keel]);
    const e = innerTop + i,
      f = innerTop + j,
      g = innerBottom + i,
      h = innerBottom + j;
    inner.push([e, g, f], [f, g, h], [h, g, floor]);
    lip.push([a, e, b], [b, e, f]);
  }
  return solid(vertices, [outer, inner, lip], (p) => [
    (p[0] + 2.2) / 4.4,
    (p[1] + 0.8) / 1.8,
  ]);
}

export function paperBoatRidgeGeometry() {
  return origamiSheet(
    [
      [-0.95, -0.72, 0.07],
      [0.95, -0.72, 0.07],
      [0, 1.02, 0],
      [0, -0.14, 0.18],
    ],
    [
      [0, 1, 3],
      [1, 2, 3],
      [2, 0, 3],
    ],
    [0, 1, 2],
    0.016,
  );
}

export function createPaperBoatRig(
  outside: T.Material,
  inside: T.Material,
  edge: T.Material,
  keep: Keep,
) {
  const root = new T.Group();
  root.name = "origami-paper-boat";
  root.add(
    paperMesh(
      paperBoatHullGeometry(),
      [outside, inside, edge],
      keep,
      "boat-hollow-hull",
    ),
  );
  root.add(
    paperMesh(
      paperBoatRidgeGeometry(),
      [inside, inside, edge],
      keep,
      "boat-central-fold",
    ),
  );
  root.rotation.set(0.34, -0.3, 0);
  return {
    root,
    update(time: number) {
      root.rotation.z = Math.sin(time * 0.5) * 0.025;
    },
  };
}

/** A thickened half-twist joins the opposite skin and reversed transverse index. */
export function mobiusBandGeometry(nu = 160, nv = 16, thickness = 0.055) {
  const vertices: Point[] = [],
    faces: Face[] = [];
  const point = (u: number, v: number) => {
    const a = u * Math.PI * 2,
      w = (v - 0.5) * 1.08;
    return new T.Vector3(
      (1.65 + w * Math.cos(a / 2)) * Math.cos(a),
      (1.65 + w * Math.cos(a / 2)) * Math.sin(a),
      w * Math.sin(a / 2),
    );
  };
  for (let layer = 0; layer < 2; layer++)
    for (let i = 0; i < nu; i++)
      for (let j = 0; j <= nv; j++) {
        const u = i / nu,
          v = j / nv,
          p = point(u, v),
          du = point(u + 0.00001, v).sub(point(u - 0.00001, v)),
          dv = point(u, v + 0.00001).sub(point(u, v - 0.00001));
        p.addScaledVector(
          du.cross(dv).normalize(),
          ((layer === 0 ? 1 : -1) * thickness) / 2,
        );
        vertices.push(p.toArray() as Point);
      }
  const at = (layer: number, i: number, j: number) => {
    if (i === nu) return (1 - layer) * nu * (nv + 1) + (nv - j);
    return layer * nu * (nv + 1) + i * (nv + 1) + j;
  };
  for (let layer = 0; layer < 2; layer++)
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const a = at(layer, i, j),
          b = at(layer, i + 1, j),
          c = at(layer, i, j + 1),
          d = at(layer, i + 1, j + 1);
        if (layer === 0) faces.push([a, b, c], [b, d, c]);
        else faces.push([a, c, b], [b, c, d]);
      }
  for (let i = 0; i < nu; i++) {
    for (const j of [0, nv]) {
      const a = at(0, i, j),
        b = at(0, i + 1, j),
        c = at(1, i, j),
        d = at(1, i + 1, j);
      if (j === 0) faces.push([a, c, b], [b, c, d]);
      else faces.push([a, b, c], [b, d, c]);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(vertices.flat(), 3),
  );
  geometry.setIndex(faces.flat());
  geometry.computeVertexNormals();
  return geometry;
}
