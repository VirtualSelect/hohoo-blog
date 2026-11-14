import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createGardenSculpture } from "../components/theme-artwork-garden.ts";
for (const tree of [false, true])
  test(`garden ${tree ? "tree" : "sprout"} has solid leaves and connected seed terminals throughout rotation`, () => {
    const resources = [];
    const sculpture = createGardenSculpture(tree, (v) => {
      resources.push(v);
      return v;
    });
    try {
      for (const amount of [0, 0.5, 1]) {
        sculpture.update(0, amount);
        sculpture.root.updateMatrixWorld(true);
        const size = new T.Box3()
          .setFromObject(sculpture.root)
          .getSize(new T.Vector3());
        assert.ok(size.y > 2.5 && size.y < 4.5);
        assert.ok(size.x < 4.5 && size.z < 4.5);
        sculpture.root.traverse((object) => {
          if (!object.isMesh) return;
          const positions = object.geometry.getAttribute("position");
          for (let i = 0; i < positions.count; i++)
            assert.ok(
              Number.isFinite(positions.getX(i)) &&
                Number.isFinite(positions.getY(i)) &&
                Number.isFinite(positions.getZ(i)),
            );
          if (/^garden-leaf-\d+$/.test(object.name)) {
            assert.equal(
              object.geometry.groups.length,
              3,
              "front, back and connecting edge must all exist",
            );
            assert.ok(object.geometry.groups[2].count > 0);
          }
          if (/^garden-star-seed-\d+$/.test(object.name)) {
            const index = object.name.split("-").at(-1);
            const curve = sculpture.root.getObjectByName(
              `garden-branch-${index}`,
            ).geometry.parameters.path;
            assert.ok(object.position.distanceTo(curve.getPoint(1)) < 1e-8);
          }
        });
        assert.equal(
          sculpture.root.getObjectByName("garden-closed-root-disc").geometry
            .parameters.openEnded,
          false,
        );
      }
    } finally {
      resources.forEach((r) => r.dispose());
    }
  });

test("unfurling changes leaf angles while the trunk, joints and star chains stay connected", () => {
  const resources = [];
  const sculpture = createGardenSculpture(true, (v) => {
    resources.push(v);
    return v;
  });
  try {
    const seed = sculpture.root.getObjectByName("garden-star-seed-0");
    const leaf = sculpture.root.getObjectByName("garden-leaf-0");
    const trunk = sculpture.root.getObjectByName("garden-trunk");
    sculpture.update(0, 0);
    const initial = seed.material.emissiveIntensity;
    const closed = leaf.getWorldQuaternion(new T.Quaternion());
    const trunkMatrix = trunk.matrixWorld.clone();
    sculpture.update(0, 1);
    assert.deepEqual(sculpture.root.scale.toArray(), [1, 1, 1]);
    assert.ok(trunk.matrixWorld.equals(trunkMatrix));
    assert.ok(
      closed.angleTo(leaf.getWorldQuaternion(new T.Quaternion())) > 0.65,
    );
    assert.ok(seed.material.emissiveIntensity > initial * 2);
    for (const amount of [0, 0.25, 0.5, 0.75, 1]) {
      sculpture.update(0, amount);
      for (const [index, chain] of [
        [0, 2, 5],
        [1, 4, 6],
      ].entries()) {
        const line = sculpture.root.getObjectByName(
          `garden-constellation-${index}`,
        );
        chain.forEach((seedIndex, i) =>
          assert.ok(
            new T.Vector3()
              .fromBufferAttribute(line.geometry.getAttribute("position"), i)
              .distanceTo(
                sculpture.root.worldToLocal(
                  sculpture.root
                    .getObjectByName(`garden-star-seed-${seedIndex}`)
                    .getWorldPosition(new T.Vector3()),
                ),
              ) < 1e-6,
          ),
        );
      }
      sculpture.root.traverse((joint) => {
        if (!/^garden-branch-joint-\d+$/.test(joint.name)) return;
        const branch = joint.children.find((o) =>
          /^garden-branch-\d+$/.test(o.name),
        );
        const attached = branch.geometry.parameters.path.getPoint(0);
        assert.ok(
          attached.length() < 1e-8,
          "branch must pivot on its attachment",
        );
        const leafJoint = joint.children.find((o) =>
          /^garden-leaf-joint-\d+$/.test(o.name),
        );
        assert.ok(
          leafJoint.position.distanceTo(
            branch.geometry.parameters.path.getPoint(0.52),
          ) < 1e-8,
        );
      });
    }
  } finally {
    resources.forEach((r) => r.dispose());
  }
});

for (const tree of [false, true])
  test(`garden ${tree ? "tree" : "sprout"} leaves have green upward faces, gently crowned blades and attached veins`, () => {
    const resources = [];
    const { root } = createGardenSculpture(tree, (value) => {
      resources.push(value);
      return value;
    });
    try {
      const leaves = [];
      root.traverse((o) => {
        if (/^garden-(?:crown-)?leaf-\d+$/.test(o.name)) leaves.push(o);
      });
      assert.ok(leaves.length > 0);
      assert.equal(root.getObjectByName("garden-terminal-seed"), undefined);
      assert.ok(root.getObjectByName("garden-terminal-bud"));
      assert.equal(
        leaves.filter((o) => o.name.startsWith("garden-crown-leaf-")).length,
        3,
      );
      for (const leaf of leaves) {
        const geometry = leaf.geometry;
        const positions = geometry.getAttribute("position");
        const uv = geometry.getAttribute("uv");
        const index = geometry.index;
        function triangles(group) {
          const result = [];
          for (let i = group.start; i < group.start + group.count; i += 3)
            result.push(
              new T.Triangle(
                ...[0, 1, 2].map((offset) =>
                  new T.Vector3().fromBufferAttribute(
                    positions,
                    index.getX(i + offset),
                  ),
                ),
              ),
            );
          return result;
        }
        const faces = geometry.groups.slice(0, 2).map((group) => {
          const tris = triangles(group);
          const normal = new T.Vector3();
          for (const tri of tris)
            normal.addScaledVector(
              tri.getNormal(new T.Vector3()),
              tri.getArea(),
            );
          return {
            group,
            tris,
            normal: normal.normalize(),
            material: leaf.material[group.materialIndex],
          };
        });
        // Group zero is the front surface contract of thickSheet, independent of tessellation.
        assert.ok(
          faces[0].normal.y > 0.5,
          leaf.name + " front must face botanical up",
        );
        assert.ok(
          faces[1].normal.y < -0.5,
          leaf.name + " reverse must face down",
        );
        const luminance = ({ color: c }) =>
          c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
        assert.ok(
          luminance(faces[0].material) < luminance(faces[1].material),
          leaf.name + " upper green must be darker than reverse",
        );
        assert.ok(faces[0].material.color.g > faces[0].material.color.r);
        function at(u, v) {
          let best = Infinity,
            selected = 0;
          const group = faces[0].group;
          for (let i = group.start; i < group.start + group.count; i++) {
            const n = index.getX(i);
            const distance = Math.hypot(uv.getX(n) - u, uv.getY(n) - v);
            if (distance < best) {
              best = distance;
              selected = n;
            }
          }
          return new T.Vector3().fromBufferAttribute(positions, selected);
        }
        const left = at(0.5, 0),
          right = at(0.5, 1),
          center = at(0.5, 0.5);
        const width = left.distanceTo(right),
          length = at(0, 0.5).distanceTo(at(1, 0.5));
        assert.ok(
          width < length * 0.7,
          leaf.name + " blade must be narrower than its length",
        );
        assert.ok(
          at(1, 0).distanceTo(at(1, 1)) < width * 0.12,
          leaf.name + " tip must taper",
        );
        const crown = center.y - (left.y + right.y) / 2;
        assert.ok(
          crown > 0.001 && crown < width * 0.2,
          leaf.name + " midrib must gently crown above edges",
        );
        const surface = faces.flatMap((face) => face.tris);
        for (const vein of leaf.parent.children.filter(
          (o) =>
            o.name.startsWith(leaf.name + "-") && o.geometry?.parameters?.path,
        )) {
          const curve = vein.geometry.parameters.path;
          for (let i = 1; i < 10; i++) {
            const p = curve.getPoint(i / 10);
            let distance = Infinity;
            for (const tri of surface)
              distance = Math.min(
                distance,
                tri.closestPointToPoint(p, new T.Vector3()).distanceTo(p),
              );
            assert.ok(
              distance < 0.035,
              vein.name + " must follow a physical leaf surface",
            );
          }
        }
      }
    } finally {
      resources.forEach((r) => r.dispose());
    }
  });
