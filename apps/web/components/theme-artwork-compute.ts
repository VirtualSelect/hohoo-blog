import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { ArtworkDesign } from "./theme-artwork-config";

type Keep = <V extends { dispose(): void }>(value: V) => V;

/** A joined instrument chassis; the same rails support its expanded view. */
export function createComputeSculpture(
  design: ArtworkDesign,
  starMap: boolean,
  keep: Keep,
) {
  const root = new T.Group();
  const surface = (color: string, metalness: number, roughness: number) =>
    keep(new T.MeshStandardMaterial({ color, metalness, roughness }));
  const aluminium = surface("#bbc3cd", 0.95, 0.27);
  const ceramic = surface("#e1ded7", 0.08, 0.5);
  const graphite = surface("#20242a", 0.5, 0.4);
  const recess = surface("#0c1014", 0.2, 0.58);
  const red = keep(
    new T.MeshStandardMaterial({
      color: design === "construct" ? "#c43823" : "#427c86",
      emissive: design === "construct" ? "#a52614" : "#245d69",
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.25,
    }),
  );
  function block(
    parent: T.Object3D,
    dimensions: [number, number, number],
    mat: T.Material,
    position: [number, number, number] = [0, 0, 0],
    bevel = 0.045,
  ) {
    const object = new T.Mesh(
      keep(
        new RoundedBoxGeometry(
          ...dimensions,
          3,
          Math.min(bevel, Math.min(...dimensions) / 3),
        ),
      ),
      mat,
    );
    object.position.set(...position);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const bottom = new T.Group(),
    top = new T.Group(),
    core = new T.Group();
  root.add(bottom, top, core);
  block(bottom, [3.55, 0.25, 2.45], aluminium);
  block(bottom, [3.28, 0.13, 2.18], graphite, [0, 0.16, 0]);
  block(core, [2.9, 0.85, 1.9], graphite);
  // A thin front gasket and recessed vents make the block read as an object
  // assembled from distinct materials, without an arbitrary stack of boxes.
  block(core, [2.66, 0.045, 0.025], red, [0, -0.26, 0.958], 0.006);
  for (let i = 0; i < 7; i++) {
    block(
      core,
      [0.17, 0.27, 0.035],
      recess,
      [-0.91 + i * 0.29, 0.04, 0.952],
      0.01,
    );
  }
  block(top, [3.55, 0.23, 2.45], aluminium);
  block(top, [3.25, 0.09, 2.16], starMap ? graphite : ceramic, [0, 0.145, 0]);
  for (let i = 0; i < 4; i++) {
    block(
      top,
      [0.028, 0.009, 1.34],
      recess,
      [0.49 + i * 0.19, 0.195, 0],
      0.002,
    );
  }
  const posts: T.Mesh[] = [];
  for (const x of [-1.58, 1.58])
    for (const z of [-0.99, 0.99]) {
      const post = block(
        root,
        [0.115, 1.64, 0.115],
        aluminium,
        [x, 0, z],
        0.028,
      );
      posts.push(post);
      for (const part of [bottom, top]) {
        const head = new T.Mesh(
          keep(new T.CylinderGeometry(0.085, 0.085, 0.035, 20)),
          graphite,
        );
        head.position.set(x, 0.14, z);
        head.castShadow = true;
        part.add(head);
        block(part, [0.085, 0.009, 0.012], aluminium, [x, 0.161, z], 0.002);
      }
    }
  for (const x of [-1.38, 1.38])
    for (const z of [-0.8, 0.8]) {
      block(bottom, [0.27, 0.11, 0.27], recess, [x, -0.17, z], 0.04);
    }
  if (starMap) {
    // Authored decorative constellation on the upper ceramic/graphite panel.
    const points = [
      [-1.26, -0.4],
      [-0.78, -0.63],
      [-0.29, -0.32],
      [-0.56, 0.19],
      [-1.03, 0.51],
      [-0.21, 0.7],
      [0.23, 0.32],
    ].map(([x, z]) => new T.Vector3(x, 0.202, z));
    const path = new T.Line(
      keep(new T.BufferGeometry().setFromPoints(points)),
      keep(
        new T.LineBasicMaterial({
          color: "#b3bdc6",
          transparent: true,
          opacity: 0.65,
        }),
      ),
    );
    top.add(path);
    const dot = keep(new T.SphereGeometry(0.035, 12, 8));
    for (const point of points) {
      const node = new T.Mesh(dot, aluminium);
      node.scale.y = 0.35;
      node.position.copy(point);
      top.add(node);
    }
  } else {
    block(top, [0.37, 0.018, 0.07], red, [-1.03, 0.202, -0.65], 0.01);
  }
  root.rotation.set(0.38, -0.52, 0.02);
  function update(_time: number, amount: number) {
    top.position.y = 0.82 + amount * 0.65;
    bottom.position.y = -0.82 - amount * 0.35;
    for (const post of posts) {
      post.scale.y = 1 + amount / 1.64;
      post.position.y = amount * 0.15;
    }
  }
  update(0, 0);
  return { root, update };
}
