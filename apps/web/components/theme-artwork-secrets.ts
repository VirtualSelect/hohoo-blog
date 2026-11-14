import * as T from "three";
import { createIrisSculpture } from "./theme-artwork-iris";
import {
  createCraneRig,
  createPaperBoatRig,
  mobiusBandGeometry,
} from "./theme-artwork-origami";
import {
  createArtworkTextureBinder,
  type ArtworkTextureOptions,
} from "./theme-artwork-textures";
import type { ArtworkDesign } from "./theme-artwork-config";
import type { Sculpture } from "./theme-artwork-models";
type Keep = <V extends { dispose(): void }>(value: V) => V;

export function createArtworkSecret(
  design: ArtworkDesign,
  keep: Keep,
  textureOptions: ArtworkTextureOptions = {},
): Sculpture {
  const root = new T.Group();
  root.name = `secret-${design}`;
  const updates: Array<(time: number) => void> = [];
  const silver = keep(
    new T.MeshStandardMaterial({
      color: "#bfc9d3",
      metalness: 1,
      roughness: 0.16,
    }),
  );
  const paper = keep(
    new T.MeshStandardMaterial({
      color: "#f4e7cc",
      roughness: 0.84,
    }),
  );
  const reversePaper = keep(
    new T.MeshStandardMaterial({ color: "#eee2c9", roughness: 0.9 }),
  );
  const paperEdge = keep(
    new T.MeshStandardMaterial({ color: "#d5c7ac", roughness: 0.95 }),
  );
  const boatOutside = keep(
    new T.MeshStandardMaterial({ color: "#74313e", roughness: 0.82 }),
  );
  if (["classic", "garden", "chapters"].includes(design)) {
    const bind = createArtworkTextureBinder(keep, {
      ...textureOptions,
      onTextureReady() {
        // Share relief, not albedo: the red exterior must retain its pigment.
        boatOutside.bumpMap = paper.bumpMap;
        boatOutside.bumpScale = 0.003;
        boatOutside.roughnessMap = paper.roughnessMap;
        boatOutside.needsUpdate = true;
        textureOptions.onTextureReady?.();
      },
    });
    bind("paper", paper);
    bind("paper", reversePaper);
  }
  const accent = keep(
    new T.MeshStandardMaterial({
      color:
        design === "photo"
          ? "#303a38"
          : design === "chapters"
            ? "#833847"
            : design === "construct"
              ? "#ba3525"
              : "#397b79",
      metalness: 0.4,
      roughness: 0.3,
    }),
  );
  const mesh = (
    g: T.BufferGeometry,
    m: T.Material,
    parent: T.Object3D = root,
  ) => {
    const o = new T.Mesh(keep(g), m);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const line = (
    points: T.Vector3[],
    color = "#8ed4e9",
    parent: T.Object3D = root,
  ) => {
    const o = new T.Line(
      keep(new T.BufferGeometry().setFromPoints(points)),
      keep(new T.LineBasicMaterial({ color })),
    );
    parent.add(o);
    return o;
  };
  if (design === "space") {
    const outline = new T.Shape();
    outline.moveTo(283, 80);
    outline.bezierCurveTo(260, 77, 253, 49, 270, 33);
    outline.bezierCurveTo(286, 18, 309, 29, 313, 46);
    outline.bezierCurveTo(340, 34, 382, 34, 409, 46);
    outline.bezierCurveTo(414, 26, 439, 20, 453, 35);
    outline.bezierCurveTo(469, 53, 460, 77, 439, 81);
    outline.bezierCurveTo(457, 108, 452, 150, 430, 174);
    outline.bezierCurveTo(407, 199, 316, 199, 293, 174);
    outline.bezierCurveTo(270, 150, 265, 108, 283, 80);
    const paths = [
      outline.getPoints(16),
      new T.EllipseCurve(320, 102, 3, 3, 0, Math.PI * 2, false, 0).getPoints(
        16,
      ),
      new T.EllipseCurve(402, 102, 3, 3, 0, Math.PI * 2, false, 0).getPoints(
        16,
      ),
      [
        new T.Vector2(351, 122),
        new T.Vector2(371, 122),
        new T.Vector2(361, 132),
        new T.Vector2(351, 122),
      ],
      [
        new T.Vector2(341, 141),
        new T.Vector2(351, 147),
        new T.Vector2(361, 141),
        new T.Vector2(373, 147),
        new T.Vector2(381, 141),
      ],
    ];
    paths.forEach((path) =>
      line(
        path.map(
          (p) => new T.Vector3((p.x - 361) * 0.025, -(p.y - 110) * 0.025, 0),
        ),
      ),
    );
  } else if (design === "clear") {
    const ribbon = mesh(mobiusBandGeometry(), silver);
    ribbon.name = "continuous-half-twist";
    ribbon.rotation.set(0.55, 0.38, 0.2);
    updates.push((t) => (ribbon.rotation.z = 0.2 + t * 0.08));
  } else if (design === "classic") {
    const crane = createCraneRig([paper, reversePaper, paperEdge], keep);
    root.add(crane.root);
    updates.push(crane.update);
  } else if (design === "garden") {
    const body = mesh(new T.CapsuleGeometry(0.075, 0.66, 6, 12), accent);
    body.position.y = -0.08;
    mesh(new T.SphereGeometry(0.105, 12, 8), accent).position.y = 0.4;
    const veinMaterial = keep(
      new T.MeshStandardMaterial({ color: "#65734b", roughness: 0.8 }),
    );
    const tube = (points: T.Vector3[], radius: number, parent: T.Object3D) =>
      mesh(
        new T.TubeGeometry(
          new T.CatmullRomCurve3(points),
          16,
          radius,
          5,
          false,
        ),
        veinMaterial,
        parent,
      );
    for (const side of [-1, 1])
      tube(
        [
          new T.Vector3(side * 0.045, 0.47, 0.04),
          new T.Vector3(side * 0.14, 0.7, 0.04),
          new T.Vector3(side * 0.28, 0.79, 0.03),
        ],
        0.012,
        root,
      );
    for (const side of [-1, 1]) {
      const wing = new T.Group();
      wing.position.x = side * 0.06;
      wing.scale.x = side;
      root.add(wing);
      const upper = new T.Shape();
      upper.moveTo(0, 0.05);
      upper.bezierCurveTo(0.55, 0.5, 1.65, 1.45, 1.72, 1.02);
      upper.bezierCurveTo(1.96, 0.45, 1.3, 0.15, 0.56, 0);
      upper.lineTo(0, -0.05);
      upper.closePath();
      const lower = new T.Shape();
      lower.moveTo(0, -0.05);
      lower.bezierCurveTo(0.8, 0.1, 1.5, -0.5, 1.05, -1.0);
      lower.bezierCurveTo(0.65, -1.35, 0.18, -0.75, 0, -0.3);
      lower.closePath();
      for (const [shape, z] of [
        [upper, 0.012],
        [lower, -0.022],
      ] as const) {
        const part = mesh(
          new T.ExtrudeGeometry(shape, {
            depth: 0.018,
            bevelEnabled: true,
            bevelSize: 0.004,
            bevelThickness: 0.004,
            bevelSegments: 1,
            steps: 1,
            curveSegments: 24,
          }),
          paper,
          wing,
        );
        part.position.z = z;
      }
      for (const [x, y] of [
        [1.5, 0.85],
        [1.3, 0.48],
        [0.92, 0.22],
        [1.0, -0.72],
        [0.65, -0.95],
      ] as const) {
        const z = y < 0 ? 0.002 : 0.038;
        tube(
          [
            new T.Vector3(0.02, y < 0 ? -0.1 : 0.1, z),
            new T.Vector3(x * 0.45, y * 0.65, z),
            new T.Vector3(x, y, z),
          ],
          0.007,
          wing,
        );
      }
      updates.push(
        (t) => (wing.rotation.y = side * (0.18 + Math.sin(t * 1.2) * 0.28)),
      );
    }
    root.rotation.set(0.1, -0.18, 0);
  } else if (design === "photo") {
    const iris = createIrisSculpture(keep, silver);
    root.add(iris.root);
    updates.push((time) => iris.update(time, 0));
  } else if (design === "construct") {
    mesh(new T.CylinderGeometry(0.42, 0.42, 0.28, 24), accent).rotation.x =
      Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4,
        base = new T.Group();
      base.position.set(Math.cos(angle) * 0.42, Math.sin(angle) * 0.42, 0.035);
      base.rotation.z = angle - Math.PI / 2;
      root.add(base);
      const petal = new T.Group();
      base.add(petal);
      const shape = new T.Shape();
      shape.moveTo(-0.07, -0.035);
      shape.lineTo(-0.23, 0.42);
      shape.lineTo(-0.16, 1.25);
      shape.quadraticCurveTo(0, 1.34, 0.16, 1.25);
      shape.lineTo(0.23, 0.42);
      shape.lineTo(0.07, -0.035);
      shape.closePath();
      const plate = mesh(
        new T.ExtrudeGeometry(shape, {
          depth: 0.07,
          bevelEnabled: true,
          bevelSize: 0.012,
          bevelThickness: 0.012,
          bevelSegments: 2,
          curveSegments: 12,
          steps: 1,
        }),
        i % 2 ? silver : paper,
        petal,
      );
      plate.position.z = -0.035;
      const axle = mesh(
        new T.CylinderGeometry(0.085, 0.085, 0.28, 12),
        silver,
        base,
      );
      axle.rotation.z = Math.PI / 2;
      updates.push((t) => (petal.rotation.x = 0.12 + Math.sin(t * 0.6) * 0.18));
    }
    root.rotation.set(0.16, -0.16, 0);
  } else if (design === "map") {
    const vertices = Array.from({ length: 16 }, (_, i) => [
      i & 1 ? 1 : -1,
      i & 2 ? 1 : -1,
      i & 4 ? 1 : -1,
      i & 8 ? 1 : -1,
    ]);
    const geometry = keep(new T.BufferGeometry()),
      positions = new Float32Array(32 * 2 * 3);
    geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
    root.add(
      new T.LineSegments(
        geometry,
        keep(new T.LineBasicMaterial({ color: "#147e88" })),
      ),
    );
    const points = mesh(new T.SphereGeometry(0.055, 8, 6), silver);
    points.visible = false;
    const balls = vertices.map(() =>
      mesh(new T.SphereGeometry(0.055, 8, 6), silver),
    );
    updates.push((t) => {
      const angle = 0.42 + t * 0.15;
      const projected = vertices.map(([x, y, z, w]) => {
        const xx = x * Math.cos(angle) - w * Math.sin(angle),
          ww = x * Math.sin(angle) + w * Math.cos(angle),
          factor = 2.5 / (2.5 - ww * 0.65);
        return new T.Vector3(xx * factor, y * factor, z * factor * 0.6);
      });
      let offset = 0;
      vertices.forEach((_, i) => {
        balls[i].position.copy(projected[i]);
        for (let bit = 0; bit < 4; bit++) {
          const j = i ^ (1 << bit);
          if (j > i) {
            projected[i].toArray(positions, offset);
            projected[j].toArray(positions, offset + 3);
            offset += 6;
          }
        }
      });
      geometry.attributes.position.needsUpdate = true;
      geometry.computeBoundingBox();
    });
  } else {
    const boat = createPaperBoatRig(boatOutside, paper, paperEdge, keep);
    root.add(boat.root);
    updates.push(boat.update);
  }
  return {
    root,
    update(time) {
      updates.forEach((fn) => fn(time));
    },
  };
}
