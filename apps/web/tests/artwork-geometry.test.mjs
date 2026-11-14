import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  closedRibbonGeometry,
  perforatedPaperGeometry,
} from "../components/theme-artwork-geometry.ts";

test("closed metal sweep has coincident positions and normals across both seams", () => {
  class Ring extends T.Curve {
    getPoint(t, target = new T.Vector3()) {
      return target.set(
        Math.cos(t * Math.PI * 2) * 2,
        Math.sin(t * Math.PI * 2) * 2,
        0,
      );
    }
  }
  const geometry = closedRibbonGeometry(new Ring(), 64, 0.35, 0.08);
  const positions = geometry.getAttribute("position"),
    normals = geometry.getAttribute("normal");
  const delta = (attribute, a, b) =>
    new T.Vector3()
      .fromBufferAttribute(attribute, a)
      .distanceTo(new T.Vector3().fromBufferAttribute(attribute, b));
  for (let i = 0; i <= 64; i++)
    for (const attr of [positions, normals])
      assert.ok(delta(attr, i * 25, i * 25 + 24) < 1e-5);
  for (let j = 0; j <= 24; j++)
    for (const attr of [positions, normals])
      assert.ok(delta(attr, j, 64 * 25 + j) < 1e-5);
  for (let i = 0; i < positions.count; i++)
    assert.ok(
      Math.abs(new T.Vector3().fromBufferAttribute(normals, i).length() - 1) <
        1e-5,
    );
  geometry.dispose();
});

test("paper apertures are empty through the complete thickness and have physical inner walls", () => {
  const geometry = perforatedPaperGeometry(
    [
      new T.Vector2(-1, -1),
      new T.Vector2(1, -1),
      new T.Vector2(1, 1),
      new T.Vector2(-1, 1),
    ],
    [{ x: 0.3, y: 0.25, radius: 0.15 }],
    0.03,
  );
  const material = new T.MeshBasicMaterial({ side: T.DoubleSide }),
    mesh = new T.Mesh(geometry, [material, material]);
  mesh.updateMatrixWorld();
  const ray = new T.Raycaster(
    new T.Vector3(0.3, 0.25, 2),
    new T.Vector3(0, 0, -1),
  );
  assert.equal(
    ray.intersectObject(mesh).length,
    0,
    "hole must not be filled by an opaque back face",
  );
  ray.set(new T.Vector3(-0.5, -0.5, 2), new T.Vector3(0, 0, -1));
  assert.ok(
    ray.intersectObject(mesh).length >= 2,
    "intact paper retains front and rear surfaces",
  );
  ray.set(new T.Vector3(0.3, 0.25, 0), new T.Vector3(1, 0, 0));
  const walls = ray.intersectObject(mesh);
  assert.ok(walls.length > 0 && Math.abs(walls[0].distance - 0.15) < 0.01);
  for (const key of ["position", "normal", "uv"])
    assert.ok([...geometry.getAttribute(key).array].every(Number.isFinite));
  geometry.dispose();
  material.dispose();
});

test("curved perforated page retains finite unit normals and nondegenerate texture coordinates", () => {
  const outline = [];
  for (let i = 0; i <= 16; i++) outline.push(new T.Vector2(i / 16, -1));
  for (let i = 16; i >= 0; i--) outline.push(new T.Vector2(i / 16, 1));
  const geometry = perforatedPaperGeometry(
    outline,
    [{ x: 0.5, y: 0, radius: 0.05 }],
    0.012,
    (u, v) => new T.Vector3(1 - Math.cos(u * 1.8), Math.sin(u * 1.8) * 2.6, v),
  );
  const normals = geometry.getAttribute("normal"),
    uv = geometry.getAttribute("uv");
  for (let i = 0; i < normals.count; i++)
    assert.ok(
      Math.abs(new T.Vector3().fromBufferAttribute(normals, i).length() - 1) <
        1e-5,
    );
  assert.ok([...uv.array].every(Number.isFinite));
  assert.ok(Math.max(...uv.array) - Math.min(...uv.array) > 0.9);
  for (let i = 0; i < uv.count; i += 3) {
    const span =
      Math.max(uv.getX(i), uv.getX(i + 1), uv.getX(i + 2)) -
      Math.min(uv.getX(i), uv.getX(i + 1), uv.getX(i + 2));
    assert.ok(
      span <= 0.060001,
      "curved cap faces must not form long chords between apertures",
    );
  }
  geometry.dispose();
});

test("overlapping and nearly touching paper holes retain the first contour without torn bridges", () => {
  const outline = [
    new T.Vector2(-1, -1),
    new T.Vector2(1, -1),
    new T.Vector2(1, 1),
    new T.Vector2(-1, 1),
  ];
  for (const secondX of [0.1, 0.401]) {
    const geometry = perforatedPaperGeometry(
      outline,
      [
        { x: 0, y: 0, radius: 0.2 },
        { x: secondX, y: 0, radius: 0.2 },
        { x: 0, y: 0.65, radius: 0.1 },
      ],
      0.02,
    );
    const material = new T.MeshBasicMaterial({ side: T.DoubleSide }),
      mesh = new T.Mesh(geometry, [material, material]);
    mesh.updateMatrixWorld();
    const ray = new T.Raycaster(
      new T.Vector3(0, 0, 1),
      new T.Vector3(0, 0, -1),
    );
    assert.equal(
      ray.intersectObject(mesh).length,
      0,
      "first aperture stays open",
    );
    ray.set(new T.Vector3(secondX + 0.18, 0, 1), new T.Vector3(0, 0, -1));
    assert.ok(
      ray.intersectObject(mesh).length >= 2,
      "rejected contour leaves intact front and back skins",
    );
    ray.set(new T.Vector3(0, 0.65, 1), new T.Vector3(0, 0, -1));
    assert.equal(
      ray.intersectObject(mesh).length,
      0,
      "independent aperture is preserved",
    );
    geometry.dispose();
    material.dispose();
  }
});
