import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  craneBodyGeometry,
  craneWingGeometry,
  createCraneRig,
  paperBoatHullGeometry,
  paperBoatRidgeGeometry,
  mobiusBandGeometry,
} from "../components/theme-artwork-origami.ts";

function verifyClosed(geometry) {
  const p = geometry.getAttribute("position"),
    index = geometry.index;
  const at = (i) =>
    new T.Vector3().fromBufferAttribute(p, index ? index.getX(i) : i);
  const edges = new Map();
  let volume = 0;
  const key = (p) =>
    p
      .toArray()
      .map((x) => Math.round(x * 1e6))
      .join(",");
  const count = index ? index.count : p.count;
  for (let i = 0; i < count; i += 3) {
    const points = [at(i), at(i + 1), at(i + 2)];
    assert.ok(points.every((p) => p.toArray().every(Number.isFinite)));
    const normal = points[1]
      .clone()
      .sub(points[0])
      .cross(points[2].clone().sub(points[0]));
    assert.ok(
      normal.length() > 1e-9,
      "no zero-area triangles at a fold or seam",
    );
    volume += points[0].dot(points[1].clone().cross(points[2])) / 6;
    for (let j = 0; j < 3; j++) {
      const a = key(points[j]),
        b = key(points[(j + 1) % 3]),
        id = [a, b].sort().join("|");
      const value = edges.get(id) || { count: 0, direction: 0 };
      value.count++;
      value.direction += a < b ? 1 : -1;
      edges.set(id, value);
    }
  }
  for (const edge of edges.values()) {
    assert.equal(
      edge.count,
      2,
      "every material edge meets exactly two triangles",
    );
    assert.equal(
      edge.direction,
      0,
      "adjacent faces have coherent outward winding",
    );
  }
  assert.ok(volume > 1e-5, "the solid has outward faces and nonzero volume");
}

test("origami body, folded wings and hollow hull are closed physical solids", () => {
  const geometries = [
    craneBodyGeometry(),
    craneWingGeometry(-1),
    craneWingGeometry(1),
    paperBoatHullGeometry(),
    paperBoatRidgeGeometry(),
  ];
  try {
    geometries.forEach(verifyClosed);
  } finally {
    geometries.forEach((g) => g.dispose());
  }
});

test("crane has a raised diamond body instead of a constant-depth cutout", () => {
  const g = craneBodyGeometry();
  g.computeBoundingBox();
  assert.ok(g.boundingBox.max.x >= 0.299 && g.boundingBox.min.x <= -0.299);
  assert.ok(
    g.boundingBox.max.y > 1.3 &&
      g.boundingBox.max.y < 1.5 &&
      g.boundingBox.max.z > 1.6 &&
      g.boundingBox.min.z < -1.7,
  );
  const p = g.getAttribute("position");
  let narrowNeck = false;
  for (let i = 0; i < p.count; i++)
    if (p.getY(i) > 1.1 && Math.abs(p.getX(i)) < 0.03) narrowNeck = true;
  assert.ok(
    narrowNeck,
    "neck and folded head taper down to paper-scale thickness",
  );
  g.dispose();
});

test("wing movements pivot around both fixed shoulder endpoints", () => {
  const resources = [],
    material = new T.MeshBasicMaterial();
  const rig = createCraneRig([material, material, material], (v) => {
    resources.push(v);
    return v;
  });
  const anchors = [
    "crane-left-shoulder-rear",
    "crane-left-shoulder-front",
    "crane-right-shoulder-rear",
    "crane-right-shoulder-front",
  ].map((n) => rig.root.getObjectByName(n));
  const before = anchors.map((a) => a.getWorldPosition(new T.Vector3()));
  for (const time of [0, 1, 3, 9, 20]) {
    rig.update(time);
    anchors.forEach((a, i) =>
      assert.ok(
        a.getWorldPosition(new T.Vector3()).distanceTo(before[i]) < 1e-10,
        "wing must not detach or swing around a distant origin",
      ),
    );
  }
  resources.forEach((r) => r.dispose());
  material.dispose();
});

test("boat opening is a real cavity with liner and keel, not a filled top", () => {
  const g = paperBoatHullGeometry(),
    m = new T.MeshBasicMaterial({ side: T.DoubleSide }),
    boat = new T.Mesh(g, [m, m, m]);
  boat.updateMatrixWorld();
  const ray = new T.Raycaster(
    new T.Vector3(0, 2, 0.5),
    new T.Vector3(0, -1, 0),
  );
  const throughOpening = ray.intersectObject(boat);
  assert.ok(throughOpening.length >= 2);
  assert.ok(
    throughOpening[0].point.y < -0.1,
    "ray enters past the mouth before meeting the liner",
  );
  ray.set(new T.Vector3(0, -0.3, 2), new T.Vector3(0, 0, -1));
  const walls = ray.intersectObject(boat);
  const depths = [
    ...new Set(walls.map((hit) => Math.round(hit.point.z * 1e5))),
  ];
  assert.ok(
    depths.length >= 4,
    "both sides have physically separated outside and inside walls",
  );
  ray.set(new T.Vector3(0.95, 1, 0.07), new T.Vector3(0, -1, 0));
  const floor = ray.intersectObject(boat);
  assert.ok(
    floor[0].point.y > -0.73 && floor[0].point.y < -0.65,
    "the central fold root tucks into the liner above the exterior bottom",
  );
  g.dispose();
  m.dispose();
});

test("half-twist metal band has no seam caps, open cracks or filled central hole", () => {
  const g = mobiusBandGeometry(64, 8);
  verifyClosed(g);
  const m = new T.MeshBasicMaterial({ side: T.DoubleSide }),
    mesh = new T.Mesh(g, m);
  mesh.updateMatrixWorld();
  const ray = new T.Raycaster(new T.Vector3(0, 0, 3), new T.Vector3(0, 0, -1));
  assert.equal(ray.intersectObject(mesh).length, 0);
  g.dispose();
  m.dispose();
});
