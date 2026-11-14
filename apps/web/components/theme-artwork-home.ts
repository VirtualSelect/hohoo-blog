import * as T from "three";
import {
  createArtworkTextureBinder,
  type ArtworkTextureOptions,
} from "./theme-artwork-textures";
import type { Sculpture } from "./theme-artwork-models";

type Keep = <V extends { dispose(): void }>(value: V) => V;
type IdentityKind = "terrain" | "optics" | "orrery";

/** Three distinct home instruments. None reuse the About or secret silhouettes. */
export function createHomeIdentitySculpture(
  kind: IdentityKind,
  mobile: boolean,
  keep: Keep,
  textures: ArtworkTextureOptions = {},
): Sculpture {
  const root = new T.Group();
  root.name = `home-${kind}`;
  const updates: Array<(time: number, amount: number) => void> = [];
  const bind = createArtworkTextureBinder(keep, textures);
  const material = (color: string, metalness = 0, roughness = 0.55) =>
    keep(new T.MeshStandardMaterial({ color, metalness, roughness }));
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
  const rod = (
    radius: number,
    length: number,
    mat: T.Material,
    parent: T.Object3D = root,
  ) => mesh(new T.CylinderGeometry(radius, radius, length, 12), mat, parent);
  const annulus = (
    outer: number,
    inner: number,
    depth: number,
    mat: T.Material,
    parent: T.Object3D = root,
  ) => {
    const shape = new T.Shape();
    shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const hole = new T.Path();
    hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geometry = new T.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.015,
      curveSegments: mobile ? 36 : 64,
    });
    geometry.translate(0, 0, -depth / 2);
    return mesh(geometry, mat, parent);
  };
  if (kind === "terrain") {
    const paper = material("#eee8d9", 0, 0.88),
      edge = material("#d4d0c1", 0, 0.85),
      green = material("#3e5746", 0.04, 0.76),
      brass = material("#a29262", 0.65, 0.38);
    bind("paper", paper);
    // True level sets of two unequal hills: each terrace follows the same
    // landscape, including the saddle and disconnected upper summits.
    const height = (x: number, z: number) =>
      1.06 *
        Math.exp(
          -Math.pow((x - 0.75) / 0.85, 2) - Math.pow((z + 0.05) / 0.8, 2),
        ) +
      0.78 *
        Math.exp(
          -Math.pow((x + 0.95) / 0.7, 2) - Math.pow((z - 0.28) / 0.6, 2),
        ) +
      0.16 * Math.exp(-Math.pow((z + 0.1) / 0.65, 2) - Math.pow(x / 2, 4));
    const contours = (level: number) => {
      const segments: Array<[T.Vector2, T.Vector2]> = [];
      const key = (p: T.Vector2) =>
        `${Math.round(p.x * 1e5)},${Math.round(p.y * 1e5)}`;
      for (let ix = 0; ix < 60; ix++)
        for (let iz = 0; iz < 44; iz++) {
          const x = -2.7 + ix * 0.09,
            z = -1.98 + iz * 0.09;
          const corners = [
            new T.Vector2(x, z),
            new T.Vector2(x + 0.09, z),
            new T.Vector2(x + 0.09, z + 0.09),
            new T.Vector2(x, z + 0.09),
          ];
          const values = corners.map((p) => height(p.x, p.y)),
            crossings: T.Vector2[] = [];
          for (let edge = 0; edge < 4; edge++) {
            const next = (edge + 1) % 4;
            if (values[edge] >= level !== values[next] >= level)
              crossings.push(
                corners[edge]
                  .clone()
                  .lerp(
                    corners[next],
                    (level - values[edge]) / (values[next] - values[edge]),
                  ),
              );
          }
          if (crossings.length === 2)
            segments.push([crossings[0], crossings[1]]);
          if (crossings.length === 4) {
            const joined =
              height(x + 0.045, z + 0.045) >= level === values[0] >= level;
            segments.push(
              [crossings[0], crossings[joined ? 1 : 3]],
              [crossings[2], crossings[joined ? 3 : 1]],
            );
          }
        }
      const adjacency = new Map<string, number[]>();
      segments.forEach((pair, i) =>
        pair.forEach((p) => {
          const k = key(p);
          adjacency.set(k, [...(adjacency.get(k) || []), i]);
        }),
      );
      const used = new Set<number>(),
        loops: T.Vector2[][] = [];
      for (let i = 0; i < segments.length; i++)
        if (!used.has(i)) {
          const start = segments[i][0],
            loop = [start];
          let current = start,
            edge = i;
          while (!used.has(edge)) {
            used.add(edge);
            const pair = segments[edge],
              next = key(pair[0]) === key(current) ? pair[1] : pair[0];
            if (key(next) === key(start)) {
              if (loop.length > 4) loops.push(loop);
              break;
            }
            loop.push(next);
            current = next;
            const following = adjacency
              .get(key(next))
              ?.find((n) => !used.has(n));
            if (following === undefined) break;
            edge = following;
          }
        }
      return loops;
    };
    const layers: T.Group[] = [];
    for (let i = 0; i < 10; i++) {
      const layer = new T.Group();
      root.add(layer);
      layers.push(layer);
      layer.position.y = -0.45 + i * 0.077;
      for (const points of contours(0.12 + i * 0.1)) {
        const shape = new T.Shape(points);
        shape.closePath();
        const geometry = new T.ExtrudeGeometry(shape, {
          depth: 0.06,
          bevelEnabled: true,
          bevelSegments: 2,
          bevelSize: 0.008,
          bevelThickness: 0.007,
          curveSegments: 1,
        });
        const position = geometry.getAttribute("position"),
          uv = geometry.getAttribute("uv");
        for (let v = 0; v < position.count; v++)
          uv.setXY(
            v,
            (position.getX(v) + 2.7) / 5.4,
            (position.getY(v) + 1.98) / 3.96,
          );
        geometry.rotateX(-Math.PI / 2);
        mesh(geometry, [i === 0 ? green : paper, edge], layer);
        if (i % 2 === 1) {
          const outline = [...points, points[0]].map(
            (p) => new T.Vector3(p.x, 0.072, -p.y),
          );
          layer.add(
            new T.Line(
              keep(new T.BufferGeometry().setFromPoints(outline)),
              keep(
                new T.LineBasicMaterial({
                  color: "#596b51",
                  transparent: true,
                  opacity: 0.4,
                }),
              ),
            ),
          );
        }
      }
    }
    const pins = [new T.Vector2(0.75, -0.05), new T.Vector2(-0.95, 0.28)].map(
      (p) => {
        const last = Math.min(9, Math.floor((height(p.x, p.y) - 0.12) / 0.1)),
          length = last * 0.077 + 0.05,
          pin = rod(0.018, length, brass);
        pin.position.set(p.x, -0.45 + length / 2, -p.y);
        return { pin, last, length };
      },
    );
    updates.push((_, amount) => {
      layers.forEach(
        (layer, i) => (layer.position.y = -0.45 + i * (0.077 + amount * 0.065)),
      );
      pins.forEach(({ pin, last, length }) => {
        const expanded = length + last * amount * 0.065;
        pin.scale.y = expanded / length;
        pin.position.y = -0.45 + expanded / 2;
      });
    });
    root.rotation.set(0.58, -0.38, 0.02);
  } else if (kind === "optics") {
    const aluminium = material("#b7bdc1", 0.94, 0.25),
      graphite = material("#242b2d", 0.65, 0.35),
      mark = material("#d6cab3", 0.5, 0.42);
    const glass = keep(
      new T.MeshPhysicalMaterial({
        color: "#aac6c7",
        metalness: 0,
        roughness: 0.075,
        transmission: mobile ? 0.25 : 0.68,
        thickness: 0.38,
        ior: 1.52,
        clearcoat: 1,
        envMapIntensity: 1.2,
        attenuationColor: "#98bec5",
        attenuationDistance: 4,
      }),
    );
    const cells: T.Group[] = [];
    for (let i = 0; i < 3; i++) {
      const cell = new T.Group();
      root.add(cell);
      cells.push(cell);
      annulus(1.18, 1.035, 0.17, i === 1 ? aluminium : graphite, cell);
      annulus(1.19, 1.14, 0.2, aluminium, cell);
      const profile: T.Vector2[] = [];
      for (let j = 0; j <= 18; j++) {
        const r = j / 18;
        profile.push(new T.Vector2(r, 0.035 + 0.17 * Math.sqrt(1 - r * r)));
      }
      for (let j = 18; j >= 0; j--) {
        const r = j / 18;
        profile.push(new T.Vector2(r, -0.035 - 0.17 * Math.sqrt(1 - r * r)));
      }
      const lens = mesh(
        new T.LatheGeometry(profile, mobile ? 48 : 72),
        glass,
        cell,
      );
      lens.rotation.x = Math.PI / 2;
      if (i === 2) {
        for (let n = 0; n < 36; n++) {
          const angle = (n / 36) * Math.PI * 2;
          const tick = mesh(
            new T.BoxGeometry(0.018, n % 3 === 0 ? 0.085 : 0.045, 0.018),
            mark,
            cell,
          );
          tick.position.set(
            Math.sin(angle) * 1.095,
            Math.cos(angle) * 1.095,
            0.112,
          );
          tick.rotation.z = -angle;
        }
      }
    }
    const supports: T.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 + 0.35,
        bar = rod(0.036, 2.2, aluminium);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(Math.cos(a) * 1.14, Math.sin(a) * 1.14, 0);
      supports.push(bar);
    }
    const back = annulus(1.13, 0.96, 0.42, graphite);
    back.position.z = -1.13;
    for (let i = 0; i < 5; i++) {
      const rib = annulus(1.155, 1.125, 0.025, aluminium);
      rib.position.z = -1.3 + i * 0.075;
    }
    updates.push((_, amount) => {
      cells.forEach(
        (cell, i) => (cell.position.z = (i - 1) * (0.82 + amount * 0.43)),
      );
      supports.forEach((bar) => (bar.scale.y = 1 + amount * 0.4));
    });
    root.rotation.set(0.12, -0.72, -0.15);
  } else {
    const brass = material("#c4a466", 0.82, 0.3),
      satin = material("#a18a67", 0.75, 0.42),
      red = material("#632d38", 0.32, 0.3),
      ink = material("#4a443b", 0.3, 0.5);
    const base = mesh(new T.CylinderGeometry(1.24, 1.34, 0.18, 64), satin);
    base.position.y = -1.62;
    const baseRim = annulus(1.27, 1.18, 0.045, brass);
    baseRim.rotation.x = Math.PI / 2;
    baseRim.position.y = -1.51;
    const stem = rod(0.11, 0.29, brass);
    stem.position.y = -1.42;
    const assembly = new T.Group();
    assembly.position.y = 0.15;
    root.add(assembly);
    const meridian = annulus(1.55, 1.42, 0.065, brass, assembly);
    for (let i = 0; i < 60; i++) {
      const a = (i * Math.PI * 2) / 60,
        tick = mesh(
          new T.BoxGeometry(0.014, i % 5 === 0 ? 0.078 : 0.038, 0.009),
          ink,
          meridian,
        );
      tick.position.set(Math.sin(a) * 1.49, Math.cos(a) * 1.49, 0.05);
      tick.rotation.z = -a;
    }
    const equator = annulus(1.32, 1.21, 0.06, brass, assembly);
    equator.rotation.x = Math.PI / 2;
    const orbit = annulus(1.09, 0.99, 0.055, satin, assembly);
    orbit.rotation.set(0.56, 0.35, 0.12);
    mesh(new T.SphereGeometry(0.31, mobile ? 24 : 40, 24), red, assembly);
    const axis = rod(0.025, 2.78, brass, assembly);
    axis.rotation.z = Math.PI / 2;
    for (const x of [-1.42, 1.42]) {
      const boss = mesh(new T.SphereGeometry(0.075, 12, 10), brass, assembly);
      boss.position.x = x;
    }
    const moon = mesh(new T.SphereGeometry(0.12, 16, 12), red, orbit);
    moon.position.set(0.73, 0.73, 0);
    updates.push((time, amount) => {
      equator.rotation.x = Math.PI / 2 + amount * 0.32;
      orbit.rotation.y = 0.35 + amount * 0.6 + Math.sin(time * 0.12) * 0.04;
    });
    root.rotation.set(0.18, -0.4, 0.07);
  }
  return {
    root,
    update(time, amount) {
      updates.forEach((fn) => fn(time, amount));
    },
  };
}
