import * as T from "three";

type Positions = T.BufferAttribute | T.InterleavedBufferAttribute;
type VisitPoint = (point: T.Vector3) => void;
const spriteCorners = new T.Float32BufferAttribute(
  [-0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0],
  3,
);

function visitArtworkParts(
  root: T.Object3D,
  visit: (vertices: Positions, transform: T.Matrix4) => void,
) {
  root.updateWorldMatrix(true, true);
  const instance = new T.Matrix4(),
    matrix = new T.Matrix4(),
    size = new T.Vector3(),
    center = new T.Vector3();
  function walk(object: T.Object3D) {
    if (!object.visible || object.userData.excludeFromFraming) return;
    if (
      object instanceof T.Mesh ||
      object instanceof T.Line ||
      object instanceof T.Points
    ) {
      const vertices = object.geometry.getAttribute("position");
      if (object instanceof T.InstancedMesh) {
        for (let i = 0; i < object.count; i++) {
          object.getMatrixAt(i, instance);
          visit(
            vertices,
            matrix.multiplyMatrices(object.matrixWorld, instance),
          );
        }
      } else visit(vertices, object.matrixWorld);
    } else if (object instanceof T.Sprite) {
      object.getWorldScale(size);
      object.getWorldPosition(center);
      visit(
        spriteCorners,
        matrix.makeScale(size.x, size.y, 1).setPosition(center),
      );
    }
    object.children.forEach(walk);
  }
  walk(root);
}

/** Visits real world vertices; invisible or optical-only subtrees are excluded. The point is reused. */
export function visitArtworkPoints(root: T.Object3D, visit: VisitPoint) {
  const point = new T.Vector3();
  visitArtworkParts(root, (vertices, matrix) => {
    for (let i = 0; i < vertices.count; i++) {
      visit(point.fromBufferAttribute(vertices, i).applyMatrix4(matrix));
    }
  });
}

export function artworkBounds(root: T.Object3D): T.Box3 {
  const bounds = new T.Box3();
  visitArtworkPoints(root, (point) => bounds.expandByPoint(point));
  return bounds;
}
export function boxCorners(bounds: T.Box3): T.Vector3[] {
  return [0, 1, 2, 3, 4, 5, 6, 7].map(
    (i) =>
      new T.Vector3(
        i & 1 ? bounds.max.x : bounds.min.x,
        i & 2 ? bounds.max.y : bounds.min.y,
        i & 4 ? bounds.max.z : bounds.min.z,
      ),
  );
}
/** With geometry, fits actual vertices rather than fictitious empty box corners. */
export function fitArtworkCamera(
  camera: T.PerspectiveCamera,
  bounds: T.Box3,
  occupancy = 0.86,
  root?: T.Object3D,
) {
  return fitPoints(
    camera,
    bounds,
    occupancy,
    (visit) =>
      root
        ? visitArtworkPoints(root, visit)
        : boxCorners(bounds).forEach(visit),
    root ? "visible-vertices" : "box-corners",
  );
}

function fitPoints(
  camera: T.PerspectiveCamera,
  bounds: T.Box3,
  occupancy: number,
  points: (visit: VisitPoint) => void,
  measured: "visible-vertices" | "box-corners",
) {
  if (bounds.isEmpty()) return;
  const center = bounds.getCenter(new T.Vector3()),
    tan = Math.tan(T.MathUtils.degToRad(camera.fov * 0.5));
  let distance = Math.max(0.1, bounds.max.z - center.z + 0.02);
  points((p) => {
    const z = p.z - center.z;
    distance = Math.max(
      distance,
      z + Math.abs(p.x - center.x) / (tan * camera.aspect * occupancy),
      z + Math.abs(p.y - center.y) / (tan * occupancy),
    );
  });
  camera.position.set(center.x, center.y, center.z + distance);
  camera.lookAt(center);
  camera.near = Math.max(0.001, distance - (bounds.max.z - center.z) - 1);
  camera.far = distance + bounds.getSize(new T.Vector3()).length() + 10;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const min = [Infinity, Infinity],
    max = [-Infinity, -Infinity];
  points((p) => {
    const depth = camera.position.z - p.z;
    const x = (p.x - center.x) / (depth * tan * camera.aspect),
      y = (p.y - center.y) / (depth * tan);
    min[0] = Math.min(min[0], x);
    min[1] = Math.min(min[1], y);
    max[0] = Math.max(max[0], x);
    max[1] = Math.max(max[1], y);
  });
  return {
    world: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    ndc: { min, max },
    coverage: { width: (max[0] - min[0]) / 2, height: (max[1] - min[1]) / 2 },
    measured,
    aspect: camera.aspect,
    occupancy,
  };
}

/** Cache exact positions separately from UVs, normals, and material changes. */
function uniquePositions(vertices: Positions) {
  const seen = new Set<string>(),
    coords: number[] = [];
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i),
      y = vertices.getY(i),
      z = vertices.getZ(i);
    const key = `${x},${y},${z}`;
    if (seen.has(key)) continue;
    seen.add(key);
    coords.push(x, y, z);
  }
  return new Float64Array(coords);
}

interface FramingPart {
  local: Float64Array;
  matrix: T.Matrix4;
  world: Float64Array;
  bounds: T.Box3;
}

/** One cache per camera. Moving parts retain exact silhouettes, including instances and sprites. */
export function createArtworkFramer(
  camera: T.PerspectiveCamera,
  occupancy: number,
) {
  const sources = new WeakMap<
    Positions,
    { version: number; local: Float64Array }
  >();
  const parts: FramingPart[] = [],
    point = new T.Vector3();
  let previousRoot: T.Object3D | undefined,
    previousAspect = 0,
    previousFov = 0;
  return (root: T.Object3D) => {
    let count = 0;
    let changed =
      root !== previousRoot ||
      previousAspect !== camera.aspect ||
      previousFov !== camera.fov;
    visitArtworkParts(root, (vertices, matrix) => {
      const version =
        "data" in vertices ? vertices.data.version : vertices.version;
      let source = sources.get(vertices);
      if (!source || version !== source.version) {
        source = { version, local: uniquePositions(vertices) };
        sources.set(vertices, source);
      }
      const local = source.local;
      const index = count++;
      let part = parts[index];
      if (part && part.local === local && part.matrix.equals(matrix)) return;
      changed = true;
      if (!part || part.local !== local) {
        part = {
          local,
          world: new Float64Array(local.length),
          matrix: new T.Matrix4(),
          bounds: new T.Box3(),
        };
        parts[index] = part;
      }
      part.matrix.copy(matrix);
      part.bounds.makeEmpty();
      for (let i = 0; i < local.length; i += 3) {
        point.fromArray(local, i).applyMatrix4(matrix).toArray(part.world, i);
        part.bounds.expandByPoint(point);
      }
    });
    if (!changed && parts.length === count) return;
    parts.length = count;
    previousRoot = root;
    previousAspect = camera.aspect;
    previousFov = camera.fov;
    const bounds = new T.Box3();
    for (const part of parts) bounds.union(part.bounds);
    const diagnostic = fitPoints(
      camera,
      bounds,
      occupancy,
      (visit) => {
        for (const { world } of parts)
          for (let i = 0; i < world.length; i += 3)
            visit(point.fromArray(world, i));
      },
      "visible-vertices",
    );
    return { bounds, diagnostic };
  };
}
