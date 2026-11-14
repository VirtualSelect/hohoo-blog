import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createIrisSculpture } from "../components/theme-artwork-iris.ts";

function fixture() {
  const resources = [];
  const keep = (value) => {
    resources.push(value);
    return value;
  };
  const iris = createIrisSculpture(keep, keep(new T.MeshStandardMaterial()));
  iris.root.rotation.set(0, 0, 0);
  return {
    ...iris,
    dispose: () => resources.reverse().forEach((r) => r.dispose()),
  };
}

test("all nine iris joins remain cyclic at rest and through the opening cycle", () => {
  const iris = fixture();
  try {
    for (const time of [0, Math.PI / 1.2, Math.PI / 0.6, Math.PI / 0.4]) {
      iris.update(time, 0);
      iris.root.updateMatrixWorld(true);
      const first = iris.root.getObjectByName("iris-blade-0");
      const attr = first.geometry.getAttribute("position");
      for (let i = 1; i < 9; i++) {
        const blade = iris.root.getObjectByName(`iris-blade-${i}`);
        const unrotate = new T.Matrix4().makeRotationZ((-i * Math.PI * 2) / 9);
        for (let v = 0; v < attr.count; v++) {
          const expected = new T.Vector3()
            .fromBufferAttribute(attr, v)
            .applyMatrix4(first.matrixWorld);
          const actual = new T.Vector3()
            .fromBufferAttribute(blade.geometry.getAttribute("position"), v)
            .applyMatrix4(blade.matrixWorld)
            .applyMatrix4(unrotate);
          assert.ok(
            actual.distanceTo(expected) < 1e-6,
            `blade ${i} must not accumulate a depth offset`,
          );
        }
      }
    }
  } finally {
    iris.dispose();
  }
});

test("iris leaves cover the complete annulus while retaining a real open bore", () => {
  const iris = fixture();
  try {
    const blades = Array.from({ length: 9 }, (_, i) =>
      iris.root.getObjectByName(`iris-blade-${i}`),
    );
    const ray = new T.Raycaster();
    for (const time of [0, Math.PI / 1.2, Math.PI / 0.4]) {
      iris.update(time, 0);
      iris.root.updateMatrixWorld(true);
      for (let n = 0; n < 360; n++) {
        const angle = ((n + 0.31) * Math.PI) / 180;
        for (const radius of [0.65, 0.9, 1.2, 1.43]) {
          ray.set(
            new T.Vector3(
              Math.cos(angle) * radius,
              Math.sin(angle) * radius,
              2,
            ),
            new T.Vector3(0, 0, -1),
          );
          assert.ok(
            ray.intersectObjects(blades, false).length > 0,
            `uncovered slit at ${n} degrees, r=${radius}`,
          );
        }
      }
      for (const radius of [0, 0.32]) {
        ray.set(new T.Vector3(radius, 0, 2), new T.Vector3(0, 0, -1));
        assert.equal(
          ray.intersectObjects(blades, false).length,
          0,
          "do not hide the seam by filling the aperture",
        );
      }
    }
  } finally {
    iris.dispose();
  }
});

test("iris bore stays concentric and coplanar through a full opening cycle, front and back", () => {
  const iris = fixture();
  try {
    const blades = Array.from({ length: 9 }, (_, i) =>
      iris.root.getObjectByName(`iris-blade-${i}`),
    );
    const ray = new T.Raycaster();
    for (let frame = 0; frame < 12; frame++) {
      const time = (frame * Math.PI * 2) / 12 / 0.6;
      iris.update(time, 0);
      iris.root.updateMatrixWorld(true);
      const radius = 0.5 + Math.sin(time * 0.6) * 0.075;
      const p = blades[0].geometry.getAttribute("position");
      let rimVertices = 0;
      for (let i = 0; i < p.count; i++) {
        const r = Math.hypot(p.getX(i), p.getY(i));
        if (r < radius + 0.001) {
          rimVertices++;
          assert.ok(
            Math.abs(r - radius) < 1e-7,
            "every rim vertex must lie on the common circle",
          );
          assert.ok(
            Math.min(Math.abs(p.getZ(i) - 0.06), Math.abs(p.getZ(i) - 0.064)) <
              1e-7,
            "no bank-induced depth steps at the rim",
          );
        }
      }
      assert.ok(rimVertices >= 98);
      for (const side of [-1, 1])
        for (let degree = 0; degree < 360; degree += 5) {
          const angle = ((degree + 0.27) * Math.PI) / 180;
          for (const offset of [-0.001, 0.001]) {
            ray.set(
              new T.Vector3(
                Math.cos(angle) * (radius + offset),
                Math.sin(angle) * (radius + offset),
                side * 2,
              ),
              new T.Vector3(0, 0, -side),
            );
            assert.equal(
              ray.intersectObjects(blades, false).length > 0,
              offset > 0,
              `circular bore fails at frame ${frame}, angle ${degree}, side ${side}`,
            );
          }
        }
    }
  } finally {
    iris.dispose();
  }
});

test("iris closed shell faces point outward on both caps and the bore wall", () => {
  const iris = fixture();
  try {
    const geometry = iris.root.getObjectByName("iris-blade-0").geometry;
    const p = geometry.getAttribute("position"),
      index = geometry.index;
    let low = 0,
      high = 0,
      inner = 0;
    for (let i = 0; i < index.count; i += 3) {
      const vertices = [0, 1, 2].map((j) =>
        new T.Vector3().fromBufferAttribute(p, index.getX(i + j)),
      );
      const [a, b, c] = vertices;
      const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      if (vertices.every((v) => Math.abs(v.z - 0.06) < 1e-7)) {
        assert.ok(normal.z < -0.99);
        low++;
      }
      if (vertices.every((v) => Math.abs(v.z - 0.064) < 1e-7)) {
        assert.ok(normal.z > 0.99);
        high++;
      }
      if (vertices.every((v) => Math.abs(Math.hypot(v.x, v.y) - 0.5) < 1e-7)) {
        const center = a
          .clone()
          .add(b)
          .add(c)
          .multiplyScalar(1 / 3);
        assert.ok(
          normal.x * center.x + normal.y * center.y < 0,
          "bore wall faces inward toward empty space",
        );
        inner++;
      }
    }
    assert.ok(low > 0 && high > 0 && inner > 0);
  } finally {
    iris.dispose();
  }
});
