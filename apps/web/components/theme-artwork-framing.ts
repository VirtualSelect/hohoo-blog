import * as T from "three";

/** Visits real world vertices; invisible or optical-only subtrees are excluded. The point is reused. */
export function visitArtworkPoints(
  root: T.Object3D,
  visit: (point: T.Vector3) => void,
) {
  root.updateWorldMatrix(true, true);
  const point = new T.Vector3(),
    instance = new T.Matrix4(),
    matrix = new T.Matrix4();
  function walk(object: T.Object3D) {
    if (!object.visible || object.userData.excludeFromFraming) return;
    if (
      object instanceof T.Mesh ||
      object instanceof T.Line ||
      object instanceof T.Points
    ) {
      const vertices = object.geometry.getAttribute("position");
      const count = object instanceof T.InstancedMesh ? object.count : 1;
      for (let j = 0; j < count; j++) {
        if (object instanceof T.InstancedMesh) {
          object.getMatrixAt(j, instance);
          matrix.multiplyMatrices(object.matrixWorld, instance);
        } else matrix.copy(object.matrixWorld);
        for (let i = 0; i < vertices.count; i++) {
          point.fromBufferAttribute(vertices, i).applyMatrix4(matrix);
          visit(point);
        }
      }
    } else if (object instanceof T.Sprite) {
      const size = object.getWorldScale(new T.Vector3()),
        center = object.getWorldPosition(new T.Vector3());
      for (const x of [-0.5, 0.5])
        for (const y of [-0.5, 0.5]) {
          point.set(center.x + x * size.x, center.y + y * size.y, center.z);
          visit(point);
        }
    }
    object.children.forEach(walk);
  }
  walk(root);
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
  if (bounds.isEmpty()) return;
  const center = bounds.getCenter(new T.Vector3()),
    tan = Math.tan(T.MathUtils.degToRad(camera.fov * 0.5));
  const points = (visit: (point: T.Vector3) => void) =>
    root ? visitArtworkPoints(root, visit) : boxCorners(bounds).forEach(visit);
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
    measured: root ? "visible-vertices" : "box-corners",
    aspect: camera.aspect,
    occupancy,
  };
}
