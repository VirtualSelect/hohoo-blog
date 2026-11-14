import * as T from "three";
import { thickSheet } from "./theme-artwork-geometry";
import {
  createArtworkTextureBinder,
  type ArtworkTextureOptions,
} from "./theme-artwork-textures";
import type { Sculpture } from "./theme-artwork-models";

type Keep = <V extends { dispose(): void }>(value: V) => V;
type PageSurface = (u: number, v: number) => T.Vector3;

/** A bound atlas: the turning leaf shares the same gutter as both page blocks. */
export function createBookSculpture(
  keep: Keep,
  textureOptions: ArtworkTextureOptions = {},
): Sculpture {
  const root = new T.Group();
  root.name = "bound-star-atlas";
  const bindTexture = createArtworkTextureBinder(keep, textureOptions);
  const material = (color: string, roughness = 0.85, metalness = 0) =>
    keep(
      new T.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        side: T.DoubleSide,
      }),
    );
  const paper = material("#f3ebd8"),
    edge = material("#ded3b9"),
    leather = material("#552831", 0.7),
    gold = material("#a1844e", 0.36, 0.72);
  bindTexture("paper", paper);
  const mesh = (
    geometry: T.BufferGeometry,
    mat: T.Material | T.Material[],
    parent: T.Object3D = root,
  ) => {
    const object = new T.Mesh(keep(geometry), mat);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const lineMaterials = new Map<string, T.LineBasicMaterial>();
  const line = (
    points: T.Vector3[],
    color: string,
    parent: T.Object3D = root,
  ) => {
    let mat = lineMaterials.get(color);
    if (!mat) {
      mat = keep(new T.LineBasicMaterial({ color }));
      lineMaterials.set(color, mat);
    }
    const object = new T.Line(
      keep(new T.BufferGeometry().setFromPoints(points)),
      mat,
    );
    parent.add(object);
    return object;
  };
  const pageSurface =
    (side: number): PageSurface =>
    (u, v) =>
      new T.Vector3(
        side * (0.065 + u * 2.12),
        -0.25 + 0.18 * Math.sin(u * Math.PI * 0.9) + 0.08 * u,
        (v - 0.5) * 3.08,
      );
  const offset =
    (surface: PageSurface, lift: number): PageSurface =>
    (u, v) =>
      surface(u, v).add(new T.Vector3(0, lift, 0));

  // The fine ruled edges belong to a solid page block, not disconnected slabs.
  for (const side of [-1, 1]) {
    const surface = pageSurface(side);
    const block = mesh(thickSheet(offset(surface, -0.105), 36, 12, 0.21), [
      paper,
      paper,
      edge,
    ]);
    block.name = side < 0 ? "left-bound-pages" : "right-bound-pages";
    for (let i = 0; i < 10; i++) {
      const level = -0.2 + i * 0.019;
      for (const v of [0, 1])
        line(
          Array.from({ length: 49 }, (_, n) =>
            offset(surface, level)(n / 48, v),
          ),
          "#c4b99f",
        );
      line(
        Array.from({ length: 25 }, (_, n) => offset(surface, level)(1, n / 24)),
        "#c4b99f",
      );
    }
    const coverSurface: PageSurface = (u, v) => {
      const p = surface(u, v);
      p.x *= 1.045;
      p.z *= 1.045;
      p.y -= 0.265;
      return p;
    };
    mesh(thickSheet(coverSurface, 36, 12, 0.07), leather).name = "bound-cover";
    for (const v of [0.025, 0.975])
      line(
        Array.from({ length: 49 }, (_, n) =>
          coverSurface(n / 48, v).add(new T.Vector3(0, 0.04, 0)),
        ),
        "#b59a67",
      );
  }
  const spine = mesh(
    thickSheet(
      (u, v) =>
        new T.Vector3(
          (u - 0.5) * 0.22,
          -0.51 - 0.055 * Math.sin(u * Math.PI),
          (v - 0.5) * 3.23,
        ),
      24,
      8,
      0.045,
    ),
    leather,
  );
  spine.name = "stitched-spine";
  mesh(
    thickSheet(
      (u, v) =>
        new T.Vector3(
          (u - 0.5) * 0.15,
          -0.25 - 0.06 * Math.sin(u * Math.PI),
          (v - 0.5) * 3.08,
        ),
      16,
      8,
      0.012,
    ),
    edge,
  ).name = "bound-gutter";
  // A fine central seam remains visible between the bound signatures.
  line(
    [new T.Vector3(0, -0.245, -1.52), new T.Vector3(0, -0.245, 1.52)],
    "#8e7761",
  );

  function chart(surface: PageSurface, parent: T.Object3D, variant: number) {
    const at = (u: number, v: number) =>
      surface(u, v).add(new T.Vector3(0, 0.016, 0));
    const circle = (radius: number) =>
      Array.from({ length: 97 }, (_, i) => {
        const angle = (i / 96) * Math.PI * 2;
        return at(
          0.53 + Math.cos(angle) * radius,
          0.51 + Math.sin(angle) * radius * 0.7,
        );
      });
    for (const radius of [0.3, 0.34]) line(circle(radius), "#ac9671", parent);
    const nodes =
      variant === 0
        ? [
            [0.29, 0.52],
            [0.42, 0.43],
            [0.52, 0.49],
            [0.64, 0.4],
            [0.78, 0.51],
            [0.67, 0.63],
            [0.52, 0.61],
          ]
        : [
            [0.27, 0.61],
            [0.43, 0.57],
            [0.47, 0.38],
            [0.63, 0.34],
            [0.75, 0.5],
            [0.65, 0.66],
          ];
    line(
      nodes.map(([u, v]) => at(u, v)),
      "#70424b",
      parent,
    );
    for (const [u, v] of nodes) {
      const star = mesh(new T.SphereGeometry(0.023, 10, 8), gold, parent);
      star.position.copy(at(u, v));
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      line(
        [0.34, i % 3 ? 0.354 : 0.367].map((r) =>
          at(0.53 + Math.cos(a) * r, 0.51 + Math.sin(a) * r * 0.7),
        ),
        "#ac9671",
        parent,
      );
    }
    // Printed marginal rules express an atlas without inventing labels or data.
    for (const v of [0.13, 0.87])
      line([at(0.16, v), at(0.88, v)], "#b6a68b", parent);
    for (let i = 0; i < 4; i++) {
      const u = 0.3 + i * 0.15,
        v = 0.22 + ((i * 7) % 3) * 0.21;
      line([at(u - 0.012, v), at(u + 0.012, v)], "#93775b", parent);
      line([at(u, v - 0.009), at(u, v + 0.009)], "#93775b", parent);
    }
  }
  chart(pageSurface(-1), root, 0);
  chart(pageSurface(1), root, 1);

  // One full leaf turns from the gutter. Its width is never scaled into a tall plume.
  const turning = new T.Group();
  turning.position.set(0.065, -0.235, 0);
  root.add(turning);
  const turnSurface: PageSurface = (u, v) => {
    const angle = 0.84 - 0.36 * u;
    return new T.Vector3(
      2.12 * u * Math.cos(angle),
      2.12 * u * Math.sin(angle) + 0.06 * Math.sin(u * Math.PI),
      (v - 0.5) * 3.08,
    );
  };
  mesh(
    thickSheet(turnSurface, 56, 20, 0.012),
    [paper, paper, edge],
    turning,
  ).name = "turning-bound-leaf";
  chart(turnSurface, turning, 1);

  const bookmark = mesh(
    thickSheet(
      (u, v) =>
        new T.Vector3(
          0.39 + (v - 0.5) * 0.16,
          -0.36 - Math.max(0, u - 0.62) * 0.36,
          0.85 + u * 1.3,
        ),
      20,
      2,
      0.012,
    ),
    leather,
  );
  bookmark.name = "ribbon-bookmark";
  root.rotation.set(0.66, -0.3, -0.1);
  return {
    root,
    update(time, amount) {
      turning.rotation.z = amount * 0.58 + Math.sin(time * 0.24) * 0.018;
    },
  };
}
