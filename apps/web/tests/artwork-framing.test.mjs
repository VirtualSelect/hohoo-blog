import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  artworkBounds,
  fitArtworkCamera,
} from "../components/theme-artwork-framing.ts";

function verifyVertices(root, camera, margin = 0.84) {
  const frustum = new T.Frustum().setFromProjectionMatrix(
    new T.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    ),
  );
  root.updateWorldMatrix(true, true);
  root.traverseVisible((object) => {
    if (!(object instanceof T.Mesh) || object.userData.excludeFromFraming)
      return;
    const vertices = object.geometry.getAttribute("position");
    for (let i = 0; i < vertices.count; i++) {
      const world = new T.Vector3()
        .fromBufferAttribute(vertices, i)
        .applyMatrix4(object.matrixWorld);
      assert.ok(
        frustum.containsPoint(world),
        "real vertex must be between near/far and inside all four edges",
      );
      const ndc = world.clone().project(camera);
      assert.ok(
        Math.abs(ndc.x) <= margin + 1e-8 && Math.abs(ndc.y) <= margin + 1e-8,
        `vertex outside the safe frame: ${ndc.toArray()}`,
      );
    }
  });
}
function box(t, x, y, z) {
  const geometry = new T.BoxGeometry(x, y, z),
    material = new T.MeshBasicMaterial();
  t.after(() => {
    geometry.dispose();
    material.dispose();
  });
  return new T.Mesh(geometry, material);
}

test("offset deep geometry stays centered and inside near/far after landscape-to-portrait resize", (t) => {
  const root = new T.Group();
  root.position.set(23, -17, 8);
  const foreground = box(t, 4, 2, 1);
  foreground.position.set(-2, 1, 6);
  root.add(foreground);
  const background = box(t, 2, 7, 2);
  background.position.set(3, -1, -9);
  root.add(background);
  const camera = new T.PerspectiveCamera(35, 2.6, 0.1, 100);
  for (const aspect of [2.6, 1.6, 1, 0.8, 0.375, 2.6]) {
    camera.aspect = aspect;
    const bounds = artworkBounds(root);
    fitArtworkCamera(camera, bounds, 0.84);
    verifyVertices(root, camera);
    const center = bounds.getCenter(new T.Vector3()).project(camera);
    assert.ok(Math.abs(center.x) < 1e-10 && Math.abs(center.y) < 1e-10);
    assert.ok(camera.near > 0 && camera.far > camera.near);
    assert.ok(
      [...camera.position.toArray(), camera.near, camera.far].every(
        Number.isFinite,
      ),
    );
  }
});

test("expanded hinged panels, rotations, and a low book base all remain in frame", (t) => {
  const root = new T.Group(),
    panels = [];
  const base = box(t, 5, 0.2, 3);
  base.position.set(0.7, -2.8, -0.4);
  root.add(base);
  for (let i = 0; i < 4; i++) {
    const panel = box(t, 1.6, 3.3, 0.025);
    root.add(panel);
    panels.push(panel);
  }
  const camera = new T.PerspectiveCamera(35, 1, 0.1, 100);
  for (const expanded of [0, 0.5, 1])
    for (const rotation of [0, 0.7, 1.6, Math.PI])
      for (const aspect of [0.55, 0.8, 1.4, 2.8]) {
        panels.forEach((panel, i) => {
          panel.position.set(
            (i - 1.5) * (1 + expanded),
            expanded * i * 0.3,
            Math.sin(i) * 1.2,
          );
          panel.rotation.y = (i % 2 ? 1 : -1) * (1 - expanded * 0.5);
        });
        root.rotation.set(0.15, rotation, -0.1);
        camera.aspect = aspect;
        fitArtworkCamera(camera, artworkBounds(root), 0.84);
        verifyVertices(root, camera);
      }
});

test("rotated triangle uses actual vertices rather than an inflated transformed local box", () => {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute(
    "position",
    new T.Float32BufferAttribute([0, 0, 0, 4, 0, 0, 0, 4, 0], 3),
  );
  const material = new T.MeshBasicMaterial(),
    triangle = new T.Mesh(geometry, material);
  triangle.rotation.z = Math.PI / 4;
  const bounds = artworkBounds(triangle);
  assert.ok(Math.abs(bounds.max.y - Math.sqrt(8)) < 1e-7);
  assert.ok(Math.abs(bounds.min.y) < 1e-7);
  geometry.dispose();
  material.dispose();
});

test("hidden groups and projected light never enlarge sculpture bounds", (t) => {
  const root = new T.Group(),
    visible = box(t, 2, 3, 4);
  root.add(visible);
  const hidden = new T.Group();
  hidden.visible = false;
  hidden.add(box(t, 10000, 10000, 10000));
  root.add(hidden);
  const projection = new T.Group();
  projection.userData.excludeFromFraming = true;
  projection.add(box(t, 5000, 5000, 5000));
  root.add(projection);
  const bounds = artworkBounds(root);
  assert.deepEqual(bounds.min.toArray(), [-1, -1.5, -2]);
  assert.deepEqual(bounds.max.toArray(), [1, 1.5, 2]);
});

test("instanced constellation nodes are included and mutable geometry updates invalidate old bounds", (t) => {
  const source = box(t, 1, 1, 1),
    root = new T.Group();
  const instances = new T.InstancedMesh(source.geometry, source.material, 2);
  t.after(() => instances.dispose());
  instances.setMatrixAt(0, new T.Matrix4().makeTranslation(-4, 0, 0));
  instances.setMatrixAt(1, new T.Matrix4().makeTranslation(6, 0, 0));
  root.add(instances);
  assert.equal(artworkBounds(root).max.x, 6.5);
  instances.setMatrixAt(1, new T.Matrix4().makeTranslation(10, 2, 0));
  assert.equal(artworkBounds(root).max.x, 10.5);
  const morph = box(t, 2, 2, 2);
  root.add(morph);
  morph.geometry.getAttribute("position").setXYZ(0, 20, 1, 1);
  assert.equal(artworkBounds(root).max.x, 20);
});

test("empty sculpture does not introduce invalid camera state", () => {
  const camera = new T.PerspectiveCamera(35, 1, 0.1, 100),
    before = camera.position.clone();
  assert.equal(
    fitArtworkCamera(camera, artworkBounds(new T.Group())),
    undefined,
  );
  assert.deepEqual(camera.position.toArray(), before.toArray());
});

test("deep twisted geometry fits real vertices without shrinking for empty box corners", (t) => {
  const root = new T.Group();
  const geometry = new T.TorusKnotGeometry(2, 0.35, 96, 12);
  const material = new T.MeshBasicMaterial();
  t.after(() => {
    geometry.dispose();
    material.dispose();
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.rotation.set(0.6, 0.8, 0.2);
  root.add(mesh);
  const camera = new T.PerspectiveCamera(35, 1.4, 0.1, 100);
  const bounds = artworkBounds(root);
  fitArtworkCamera(camera, bounds, 0.84);
  const conservativeDistance = camera.position.z;
  const tight = fitArtworkCamera(camera, bounds, 0.84, root);
  assert.ok(camera.position.z < conservativeDistance - 0.1);
  assert.equal(tight.measured, "visible-vertices");
  assert.ok(Math.max(tight.coverage.width, tight.coverage.height) > 0.7);
  verifyVertices(root, camera);
  for (const aspect of [0.375, 0.7, 1, 2.8])
    for (const rotation of [0, 1.6, Math.PI]) {
      root.rotation.y = rotation;
      camera.aspect = aspect;
      fitArtworkCamera(camera, artworkBounds(root), 0.84, root);
      verifyVertices(root, camera);
    }
});
