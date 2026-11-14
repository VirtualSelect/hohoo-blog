import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  artworkBounds,
  fitArtworkCamera,
} from "../components/theme-artwork-framing.ts";

test("unrestricted vertical and diagonal rotations remain framed on mobile and desktop", () => {
  const geometry = new T.BoxGeometry(5, 1, 2);
  const material = new T.MeshBasicMaterial();
  const mesh = new T.Mesh(geometry, material);
  mesh.position.set(1.2, -0.4, 0.8);
  const root = new T.Group();
  root.add(mesh);
  const camera = new T.PerspectiveCamera(35, 1, 0.1, 80);
  const step = new T.Quaternion();
  try {
    for (const aspect of [0.375, 0.7, 1.8]) {
      camera.aspect = aspect;
      root.quaternion.identity();
      for (let i = 0; i < 96; i++) {
        step.setFromAxisAngle(
          new T.Vector3(1, i % 2 ? 1 : 0, 0).normalize(),
          Math.PI / 12,
        );
        root.quaternion.premultiply(step).normalize();
        fitArtworkCamera(camera, artworkBounds(root), 0.84, root);
        root.updateWorldMatrix(true, true);
        const vertices = geometry.getAttribute("position");
        for (let n = 0; n < vertices.count; n++) {
          const point = new T.Vector3()
            .fromBufferAttribute(vertices, n)
            .applyMatrix4(mesh.matrixWorld)
            .project(camera);
          assert.ok(
            Math.abs(point.x) <= 0.840001 && Math.abs(point.y) <= 0.840001,
          );
          assert.ok(point.z >= -1 && point.z <= 1);
        }
      }
    }
  } finally {
    geometry.dispose();
    material.dispose();
  }
});
