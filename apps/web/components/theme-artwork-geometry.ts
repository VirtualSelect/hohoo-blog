import * as T from "three";

/** Closed sweep with rounded rectangular cross-section and welded seam normals. */
export function closedRibbonGeometry(
  curve: T.Curve<T.Vector3>,
  segments = 224,
  width = 0.38,
  thickness = 0.085,
) {
  const crossSegments = 24,
    frames = curve.computeFrenetFrames(segments, true);
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const frameIndex = i === segments ? 0 : i;
    const center = curve.getPointAt(frameIndex / segments);
    for (let j = 0; j <= crossSegments; j++) {
      const angle = (j / crossSegments) * Math.PI * 2;
      const round = (value: number) =>
        Math.sign(value) * Math.pow(Math.abs(value), 0.7);
      const p = center
        .clone()
        .addScaledVector(
          frames.normals[frameIndex],
          round(Math.cos(angle)) * width,
        )
        .addScaledVector(
          frames.binormals[frameIndex],
          round(Math.sin(angle)) * thickness,
        );
      positions.push(...p.toArray());
      uvs.push(i / segments, j / crossSegments);
    }
  }
  for (let i = 0; i < segments; i++)
    for (let j = 0; j < crossSegments; j++) {
      const a = i * (crossSegments + 1) + j,
        b = a + crossSegments + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute("normal");
  const weld = (a: number, b: number) => {
    const n = new T.Vector3()
      .fromBufferAttribute(normals, a)
      .add(new T.Vector3().fromBufferAttribute(normals, b))
      .normalize();
    normals.setXYZ(a, n.x, n.y, n.z);
    normals.setXYZ(b, n.x, n.y, n.z);
  };
  for (let i = 0; i <= segments; i++)
    weld(i * (crossSegments + 1), i * (crossSegments + 1) + crossSegments);
  for (let j = 0; j <= crossSegments; j++)
    weld(j, segments * (crossSegments + 1) + j);
  return geometry;
}

/** Physical circular apertures include their inner walls; no alpha-test tearing. */
export function perforatedPaperGeometry(
  outline: T.Vector2[],
  holes: Array<{ x: number; y: number; radius: number }>,
  thickness = 0.012,
  warp?: (x: number, y: number) => T.Vector3,
) {
  const shape = new T.Shape(outline);
  shape.closePath();
  const accepted: typeof holes = [];
  for (const hole of holes) {
    // Earcut requires disjoint hole contours. Keep deterministic ordering and
    // a small material bridge so overlapping candidates cannot create slivers.
    if (
      accepted.some(
        (previous) =>
          Math.hypot(hole.x - previous.x, hole.y - previous.y) <
          hole.radius + previous.radius + 0.004,
      )
    )
      continue;
    accepted.push(hole);
    const path = new T.Path();
    path.absarc(hole.x, hole.y, hole.radius, 0, Math.PI * 2, true);
    shape.holes.push(path);
  }
  let geometry: T.BufferGeometry = new T.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 6,
    steps: 1,
  });
  if (warp) {
    // Earcut may span most of a page with one triangle. Refine in the bending
    // direction before warping so cap faces follow the same curve as hole walls.
    const source = geometry.getAttribute("position"),
      normal = geometry.getAttribute("normal");
    const xyz: number[] = [],
      ns: number[] = [],
      refined = new T.BufferGeometry();
    type Vertex = { p: T.Vector3; n: T.Vector3 };
    const split = (triangle: Vertex[]) => {
      let edge = 0,
        span = 0;
      for (let i = 0; i < 3; i++) {
        const delta = Math.abs(triangle[i].p.x - triangle[(i + 1) % 3].p.x);
        if (delta > span) {
          span = delta;
          edge = i;
        }
      }
      if (span > 0.06) {
        const a = triangle[edge],
          b = triangle[(edge + 1) % 3],
          c = triangle[(edge + 2) % 3];
        const midpoint = {
          p: a.p.clone().lerp(b.p, 0.5),
          n: a.n.clone().lerp(b.n, 0.5).normalize(),
        };
        split([a, midpoint, c]);
        split([midpoint, b, c]);
      } else
        for (const vertex of triangle) {
          xyz.push(...vertex.p.toArray());
          ns.push(...vertex.n.toArray());
        }
    };
    for (const group of geometry.groups) {
      const start = xyz.length / 3;
      for (let i = group.start; i < group.start + group.count; i += 3)
        split(
          [0, 1, 2].map((j) => ({
            p: new T.Vector3().fromBufferAttribute(source, i + j),
            n: new T.Vector3().fromBufferAttribute(normal, i + j),
          })),
        );
      refined.addGroup(start, xyz.length / 3 - start, group.materialIndex);
    }
    refined.setAttribute("position", new T.Float32BufferAttribute(xyz, 3));
    refined.setAttribute("normal", new T.Float32BufferAttribute(ns, 3));
    refined.setAttribute(
      "uv",
      new T.Float32BufferAttribute(new Float32Array((xyz.length / 3) * 2), 2),
    );
    geometry.dispose();
    geometry = refined;
  }
  const positions = geometry.getAttribute("position"),
    uv = geometry.getAttribute("uv"),
    normals = geometry.getAttribute("normal");
  const minX = Math.min(...outline.map((p) => p.x)),
    maxX = Math.max(...outline.map((p) => p.x));
  const minY = Math.min(...outline.map((p) => p.y)),
    maxY = Math.max(...outline.map((p) => p.y));
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      depth = positions.getZ(i) - thickness / 2;
    uv.setXY(i, (x - minX) / (maxX - minX), (y - minY) / (maxY - minY));
    if (warp) {
      const p = warp(x, y);
      const du = warp(x + 0.0001, y).sub(warp(x - 0.0001, y));
      const dv = warp(x, y + 0.0001).sub(warp(x, y - 0.0001));
      const n = du.clone().cross(dv).normalize();
      p.addScaledVector(n, depth);
      positions.setXYZ(i, p.x, p.y, p.z);
      const transformedNormal = du
        .normalize()
        .multiplyScalar(normals.getX(i))
        .addScaledVector(dv.normalize(), normals.getY(i))
        .addScaledVector(n, normals.getZ(i))
        .normalize();
      normals.setXYZ(
        i,
        transformedNormal.x,
        transformedNormal.y,
        transformedNormal.z,
      );
    } else positions.setZ(i, depth);
  }
  return geometry;
}

/** Closed two-skin sheet with connected edges. Groups: face / reverse / cut edge. */
export function thickSheet(
  fn: (u: number, v: number) => T.Vector3,
  nu = 64,
  nv = 16,
  thickness = 0.025,
): T.BufferGeometry {
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const count = (nu + 1) * (nv + 1);
  for (const sign of [1, -1])
    for (let i = 0; i <= nu; i++)
      for (let j = 0; j <= nv; j++) {
        const u = i / nu,
          v = j / nv,
          p = fn(u, v),
          du = fn(Math.min(1, u + 0.0005), v).sub(
            fn(Math.max(0, u - 0.0005), v),
          ),
          dv = fn(u, Math.min(1, v + 0.0005)).sub(
            fn(u, Math.max(0, v - 0.0005)),
          );
        const n = du.cross(dv).normalize();
        p.addScaledVector(n, sign * thickness * 0.5);
        positions.push(p.x, p.y, p.z);
        uv.push(u, v);
      }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j,
        b = a + nv + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const front = indices.length;
  for (let i = 0; i < front; i += 3)
    indices.push(
      indices[i] + count,
      indices[i + 2] + count,
      indices[i + 1] + count,
    );
  const boundary: number[] = [];
  for (let i = 0; i <= nu; i++) boundary.push(i * (nv + 1));
  for (let j = 1; j <= nv; j++) boundary.push(nu * (nv + 1) + j);
  for (let i = nu - 1; i >= 0; i--) boundary.push(i * (nv + 1) + nv);
  for (let j = nv - 1; j > 0; j--) boundary.push(j);
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i],
      b = boundary[(i + 1) % boundary.length];
    indices.push(a, a + count, b, b, a + count, b + count);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.addGroup(0, front, 0);
  geometry.addGroup(front, front, 1);
  geometry.addGroup(front * 2, indices.length - front * 2, 2);
  geometry.computeVertexNormals();
  return geometry;
}

export function foldedPolygon(
  points: T.Vector3[],
  thickness = 0.025,
): T.BufferGeometry {
  // Fan triangulation for convex origami facets, offset along their plane normal.
  const normal = points[1]
    .clone()
    .sub(points[0])
    .cross(points[2].clone().sub(points[0]))
    .normalize();
  const xyz: number[] = [],
    index: number[] = [];
  for (const sign of [1, -1])
    for (const p of points) {
      const q = p.clone().addScaledVector(normal, sign * thickness * 0.5);
      xyz.push(q.x, q.y, q.z);
    }
  const n = points.length;
  for (let i = 1; i < n - 1; i++) {
    index.push(0, i, i + 1, n, n + i + 1, n + i);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    index.push(i, j, n + i, j, n + j, n + i);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(xyz, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}
