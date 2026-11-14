import * as T from "three";
import { createGardenSculpture } from "./theme-artwork-garden";
import { createHomeIdentitySculpture } from "./theme-artwork-home";
import { createComputeSculpture } from "./theme-artwork-compute";
import { createBookSculpture } from "./theme-artwork-book";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import {
  thickSheet,
  closedRibbonGeometry,
  perforatedPaperGeometry,
} from "./theme-artwork-geometry";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  createArtworkTextureBinder,
  type ArtworkTextureOptions,
} from "./theme-artwork-textures";

import type { ArtworkDesign, ArtworkKind } from "./theme-artwork-config";
export interface Sculpture {
  root: T.Group;
  update(time: number, amount: number): void;
}
type Keep = <V extends { dispose(): void }>(value: V) => V;

// All forms are authored conceptual sculpture, never research data or knowledge links.
export function createSculpture(
  design: ArtworkDesign,
  kind: ArtworkKind,
  about: boolean,
  mobile: boolean,
  keep: Keep,
  textureOptions: ArtworkTextureOptions = {},
): Sculpture {
  const root = new T.Group();
  const bindTexture = createArtworkTextureBinder(keep, textureOptions);
  const updates: Array<(time: number, amount: number) => void> = [];
  const accentColor = {
    space: "#90d5ff",
    clear: "#274bf0",
    classic: "#36533a",
    garden: "#677c42",
    photo: "#897149",
    construct: "#d52a15",
    map: "#008f99",
    chapters: "#732f3b",
  }[design];
  const material = (color: string, metalness = 0, roughness = 0.5) =>
    keep(
      new T.MeshStandardMaterial({
        color,
        metalness,
        roughness,
        side: T.DoubleSide,
      }),
    );
  const silver = material("#b9c0ca", 0.96, 0.23);
  const paper = material("#f5e9d0", 0.03, 0.78);
  const charcoal = material("#18212c", 0.5, 0.35);
  const accent = material(accentColor, 0.45, 0.3);
  const porcelain = material("#eeeae0", 0.12, 0.38);
  const luminous = keep(
    new T.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 1.5,
      roughness: 0.3,
    }),
  );
  function mesh(
    geometry: T.BufferGeometry,
    mat: T.Material | T.Material[],
    parent: T.Object3D = root,
  ) {
    const object = new T.Mesh(geometry, mat);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function surface(fn: (u: number, v: number) => T.Vector3, nu = 64, nv = 16) {
    const geometry = keep(new T.BufferGeometry());
    const xyz: number[] = [],
      uv: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= nu; i++)
      for (let j = 0; j <= nv; j++) {
        const p = fn(i / nu, j / nv);
        xyz.push(p.x, p.y, p.z);
        uv.push(i / nu, j / nv);
      }
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const a = i * (nv + 1) + j,
          b = a + nv + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    geometry.setAttribute("position", new T.Float32BufferAttribute(xyz, 3));
    geometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }
  function line(
    points: T.Vector3[],
    color = accentColor,
    opacity = 0.5,
    parent: T.Object3D = root,
  ) {
    const geometry = keep(new T.BufferGeometry()).setFromPoints(points);
    const object = new T.Line(
      geometry,
      keep(new T.LineBasicMaterial({ color, transparent: true, opacity })),
    );
    parent.add(object);
    return object;
  }
  function stars(
    points: T.Vector3[],
    color = accentColor,
    size = 0.035,
    parent: T.Object3D = root,
  ) {
    const geometry = keep(new T.BufferGeometry()).setFromPoints(points);
    const mat = keep(
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          color: { value: new T.Color(color) },
          size: { value: size },
          pixelRatio: { value: 1 },
        },
        vertexShader:
          "uniform float size; uniform float pixelRatio; void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*900./max(1.,-p.z),1.5,10.)*pixelRatio;}",
        fragmentShader:
          "uniform vec3 color; void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(color,pow(1.-d,1.5));}",
      }),
    );
    const object = new T.Points(geometry, mat);
    parent.add(object);
    return object;
  }
  function nodes(
    points: T.Vector3[],
    radius = 0.04,
    parent: T.Object3D = root,
  ) {
    const geometry = keep(new T.SphereGeometry(radius, 10, 8));
    const instanced = new T.InstancedMesh(geometry, silver, points.length);
    keep(instanced);
    const dummy = new T.Object3D();
    points.forEach((point, i) => {
      dummy.position.copy(point);
      dummy.scale.setScalar(i % 11 === 0 ? 2.5 : 1);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    });
    parent.add(instanced);
    return instanced;
  }
  function box(
    x: number,
    y: number,
    z: number,
    mat: T.Material,
    parent: T.Object3D = root,
  ) {
    return mesh(
      keep(new RoundedBoxGeometry(x, y, z, 3, Math.min(0.055, y * 0.15))),
      mat,
      parent,
    );
  }
  function grain(linen = false) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const pixels = ctx.createImageData(256, 256);
      for (let i = 0; i < 256 * 256; i++) {
        const x = i % 256,
          y = Math.floor(i / 256);
        const n =
          (linen ? 145 : 224) +
          Math.sin(i * 12.9898) * (linen ? 18 : 11) +
          (linen ? (x % 4 === 0 || y % 4 === 0 ? 45 : 0) : 0);
        pixels.data.set([n, n, n, 255], i * 4);
      }
      ctx.putImageData(pixels, 0, 0);
    }
    const texture = keep(new T.CanvasTexture(canvas));
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.repeat.set(linen ? 4 : 2, linen ? 4 : 2);
    return texture;
  }
  function perforated(linen = false) {
    const mat = material(
      linen ? "#bfae90" : "#eee2c9",
      0.03,
      linen ? 0.95 : 0.8,
    );
    mat.bumpMap = grain(linen);
    if (!linen) {
      mat.map = mat.bumpMap;
      mat.map.colorSpace = T.SRGBColorSpace;
    }
    if (linen) {
      mat.map = mat.bumpMap;
      mat.map.colorSpace = T.SRGBColorSpace;
      mat.roughnessMap = mat.bumpMap;
    }
    mat.bumpScale = linen ? 0.055 : 0.025;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = "black";
      for (let i = 0; i < (linen ? 170 : 110); i++) {
        const random = (seed: number) => {
          const value = Math.sin(seed * 127.1) * 43758.5453;
          return value - Math.floor(value);
        };
        const x = 16 + random(i + 0.13) * 480,
          y = 16 + random(i + 3.71) * 480;
        ctx.beginPath();
        const radius = linen
          ? i % 13 === 0
            ? 4
            : 1.4 + (i % 3) * 0.65
          : i % 11 === 0
            ? 13
            : 3.5 + (i % 4);
        ctx.ellipse(
          x,
          y,
          radius * (linen ? 0.8 : 0.88),
          radius,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    mat.alphaMap = keep(new T.CanvasTexture(canvas));
    mat.alphaTest = 0.45;
    bindTexture(linen ? "linen" : "paper", mat);
    return mat;
  }
  function crystal() {
    const stone = keep(
      new T.MeshPhysicalMaterial({
        color: "#081725",
        metalness: 0.32,
        roughness: 0.3,
        clearcoat: 0.45,
        clearcoatRoughness: 0.25,
        flatShading: true,
        bumpMap: grain(),
        bumpScale: 0.015,
      }),
    );
    bindTexture("obsidian", stone);
    for (let section = 0; section < 3; section++) {
      const start = 2.25 + section * 1.37;
      const fn = (u: number, v: number) => {
        const theta = 0.24 + v * (Math.PI - 0.48),
          phi = start + u * 1.25,
          r = 1.9;
        return new T.Vector3(
          -r * Math.cos(phi) * Math.sin(theta),
          r * Math.cos(theta) * 1.12,
          r * Math.sin(phi) * Math.sin(theta) * 0.8,
        );
      };
      const chunk = mesh(keep(thickSheet(fn, 3, 5, 0.28)), [
        stone,
        stone,
        stone,
      ]);
      const direction = new T.Vector3(
        -Math.cos(start + 0.62),
        0,
        Math.sin(start + 0.62),
      );
      updates.push((_, a) =>
        chunk.position.copy(direction).multiplyScalar(0.12 + a * 0.62),
      );
    }
    const crystalMaterial = keep(
      new T.MeshPhysicalMaterial({
        color: "#4398c2",
        roughness: 0.16,
        metalness: 0.05,
        transmission: mobile ? 0 : 0.22,
        thickness: 0.8,
        ior: 1.46,
        clearcoat: 0.8,
        envMapIntensity: 0.55,
        emissive: "#0b4563",
        emissiveIntensity: 0.16,
        flatShading: true,
      }),
    );
    const cluster = new T.Group();
    cluster.position.set(0, -1.12, 0.5);
    root.add(cluster);
    for (const [radius, height, x, tilt] of [
      [0.48, 2.6, 0, 0],
      [0.28, 1.65, -0.43, 0.23],
      [0.25, 1.4, 0.4, -0.22],
    ]) {
      const points: T.Vector3[] = [];
      for (const [y, r] of [
        [0, radius * 0.72],
        [height * 0.72, radius],
        [height, 0],
      ]) {
        if (!r) {
          points.push(new T.Vector3(0, y, 0));
          continue;
        }
        for (let k = 0; k < 6; k++)
          points.push(
            new T.Vector3(
              Math.cos((k * Math.PI) / 3) * r,
              y,
              Math.sin((k * Math.PI) / 3) * r,
            ),
          );
      }
      const crystal = mesh(
        keep(new ConvexGeometry(points)),
        crystalMaterial,
        cluster,
      );
      crystal.position.x = x;
      crystal.rotation.z = tilt;
    }
    updates.push((_, a) => (cluster.rotation.y = a * 0.23));
    root.rotation.set(0.08, -0.2, -0.16);
  }

  function ribbon(withNet = false) {
    const polished = keep(
      new T.MeshPhysicalMaterial({
        color: "#cbd0d5",
        metalness: 1,
        roughness: 0.16,
        clearcoat: 0.35,
        envMapIntensity: 1.2,
      }),
    );
    class Knot extends T.Curve<T.Vector3> {
      constructor() {
        super();
      }
      getPoint(u: number, target = new T.Vector3()) {
        const t = u * Math.PI * 2,
          r = 1.35 + 0.4 * Math.cos(3 * t);
        return target.set(
          r * Math.cos(2 * t),
          r * Math.sin(2 * t) * 0.88,
          0.72 * Math.sin(3 * t),
        );
      }
    }
    const curve = new Knot();
    const band = mesh(
      keep(closedRibbonGeometry(curve, mobile ? 192 : 288, 0.27, 0.085)),
      polished,
    );
    if (withNet) {
      const frames = curve.computeFrenetFrames(96, true);
      const pts = Array.from({ length: 32 }, (_, i) =>
        curve.getPointAt(i / 32).addScaledVector(frames.normals[i * 3], 0.285),
      );
      nodes(pts, 0.022, band);
      line([...pts, pts[0]], "#6e7c8b", 0.45, band);
    }
    updates.push((_, a) => {
      band.scale.set(1 + a * 0.12, 1 - a * 0.05, 1 + a * 0.24);
      band.rotation.z = a * 0.14;
    });
    root.rotation.set(0.46, -0.3, -0.23);
  }

  function compute(starMap = false) {
    const model = createComputeSculpture(design, starMap, keep);
    root.add(model.root);
    updates.push(model.update);
  }
  function leafGeometry(length: number, width: number) {
    return surface(
      (u, v) => {
        const w = (v - 0.5) * 2;
        return new T.Vector3(
          Math.sin(u * Math.PI) * width * w,
          u * length,
          Math.sin(u * Math.PI) * 0.65 +
            Math.abs(w) * Math.sin(u * Math.PI) * 0.28,
        );
      },
      32,
      12,
    );
  }
  function growth(tree = false) {
    const garden = createGardenSculpture(tree, keep);
    root.add(garden.root);
    updates.push(garden.update);
  }

  function weave(network = false, space = false) {
    const fn = (u: number, v: number) => {
      const x = (u - 0.5) * 5.6;
      const phase = u * Math.PI * 2;
      const w = (v - 0.5) * 2;
      return new T.Vector3(
        x,
        Math.sin(phase) * 0.95 + w * Math.cos(phase * 0.65),
        Math.cos(phase) * 0.75 + w * Math.sin(phase * 0.65),
      );
    };
    const ribbons = mobile ? 36 : 60;
    for (let j = 0; j < ribbons; j++) {
      const points = Array.from({ length: 100 }, (_, i) =>
        fn(i / 99, j / (ribbons - 1)),
      );
      line(
        points,
        space ? "#81bff2" : network ? "#a0b3bd" : accentColor,
        space ? 0.38 : 0.48,
      );
    }
    if (network) {
      const pts: T.Vector3[] = [];
      for (let i = 0; i < 15; i++)
        for (let j = 0; j < 5; j++) pts.push(fn(i / 14, j / 4));
      nodes(pts, 0.027);
      for (let i = 0; i < 70; i++) {
        line([pts[i], pts[i + 5]], "#7e999f", 0.65);
        if (i % 5 < 4) line([pts[i], pts[i + 1]], "#80979c", 0.6);
      }
      for (const i of [11, 32, 58]) {
        const orb = mesh(keep(new T.SphereGeometry(0.075, 12, 10)), accent);
        orb.position.copy(pts[i]);
      }
    }
    const points = Array.from({ length: mobile ? 550 : 1600 }, (_, i) => {
      const p = fn(((i * 73.71) % 997) / 997, ((i * 37.13) % 991) / 991);
      p.z += Math.sin(i * 7.3) * 0.08;
      return p;
    });
    stars(
      points,
      space ? "#ccecff" : network ? "#4c7d85" : accentColor,
      space ? 0.03 : 0.018,
    );
    root.rotation.set(0.15, 0.12, 0.32);
    updates.push((t, a) => {
      root.scale.y = 1 + a * 0.32 + Math.sin(t * 0.3) * 0.025;
      root.rotation.x = 0.15 + a * 0.35;
    });
  }
  function starFlow() {
    const fn = (u: number, lane: number, branch: number) => {
      const x = (u - 0.5) * 7.0,
        eye = Math.sin(Math.PI * u);
      return new T.Vector3(
        x,
        0.37 * x +
          branch * (0.18 + 1.05 * eye * eye) +
          lane * 0.23 * eye +
          Math.sin(lane * 4.7 + u * 7) * 0.055 * eye,
        Math.sin(u * Math.PI * 2 + lane * 0.35) * 0.85 + lane * 0.13,
      );
    };
    for (const branch of [-1, 1]) {
      const count = mobile ? 70 : 130;
      for (let i = 0; i < count; i++) {
        const lane = (i / count - 0.5) * 4;
        const path = Array.from({ length: 130 }, (_, n) =>
          fn(n / 129, lane, branch),
        );
        const beam = line(
          path,
          i % 19 === 0 ? "#d8f2ff" : i % 4 === 0 ? "#7aa6ca" : "#2b70b2",
          i % 19 === 0 ? 0.42 : 0.07 + (i % 5) * 0.018,
        );
        const mat = beam.material as T.LineBasicMaterial;
        mat.blending = i % 19 === 0 ? T.AdditiveBlending : T.NormalBlending;
        mat.depthWrite = false;
        mat.toneMapped = false;
      }
      const pts = Array.from({ length: mobile ? 800 : 2400 }, (_, i) =>
        fn(
          ((i * 71.791) % 997) / 997,
          (((i * 37.19) % 991) / 991) * 4 - 2,
          branch,
        ),
      );
      const dust = stars(pts, "#afdfff", 0.023);
      (dust.material as T.ShaderMaterial).blending = T.AdditiveBlending;
      const bright = stars(
        pts.filter((_, i) => i % 41 === 0),
        "#f2fbff",
        0.085,
      );
      (bright.material as T.ShaderMaterial).blending = T.AdditiveBlending;
      const focus = fn(branch === 1 ? 0.64 : 0.32, 0, branch);
      halo(focus, 0.48, "#78beff", 0.22);
      halo(focus, 0.12, "#e8f8ff", 0.9);
    }
    updates.push((t, a) => {
      root.rotation.x = 0.06 + Math.sin(t * 0.15) * 0.04 + a * 0.28;
      root.scale.y = 1 + a * 0.4;
    });
  }
  function halo(
    position: T.Vector3,
    radius: number,
    color: string,
    opacity: number,
    parent: T.Object3D = root,
  ) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.15, "rgba(255,255,255,.45)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    const sprite = new T.Sprite(
      keep(
        new T.SpriteMaterial({
          map: keep(new T.CanvasTexture(c)),
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          blending: design === "space" ? T.AdditiveBlending : T.NormalBlending,
          toneMapped: false,
        }),
      ),
    );
    sprite.position.copy(position);
    sprite.scale.setScalar(radius);
    parent.add(sprite);
    return sprite;
  }
  function projectedLight(map: T.Texture, width: number, height: number) {
    const light = mesh(
      keep(new T.PlaneGeometry(width, height)),
      keep(
        new T.MeshBasicMaterial({
          color: "#ffcf83",
          alphaMap: map,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
          side: T.DoubleSide,
        }),
      ),
    );
    light.rotation.x = -Math.PI / 2;
    light.position.set(0.3, -2.19, 0.2);
    light.userData.excludeFromFraming = true;
    light.castShadow = false;
    light.receiveShadow = false;
    return light;
  }
  function folded() {
    const face = material("#f4e7d1", 0, 0.86),
      edge = material("#c9bda6", 0, 0.88),
      ink = material("#2f513a", 0, 0.85);
    bindTexture("paper", face);
    bindTexture("paper", paper);
    const random = (seed: number) => {
      const n = Math.sin(seed * 127.1) * 43758.5453;
      return n - Math.floor(n);
    };
    const inkPath = (pts: T.Vector3[], parent: T.Object3D) => {
      line(pts, "#476048", 0.7, parent);
      for (let i = 0; i < pts.length; i += 2) {
        const dot = mesh(keep(new T.SphereGeometry(0.021, 8, 6)), ink, parent);
        dot.position.copy(pts[i]);
      }
    };
    const accordion = new T.Group();
    root.add(accordion);
    accordion.position.set(-2.65, -0.08, 0);
    accordion.rotation.set(-0.12, 0, -0.1);
    const upper = [-0.6, 1.5, 0.65, 2.6, 1.25, 0.45],
      lower = [-1.5, -0.9, -1.35, -0.65, -0.9, 0.1],
      width = 1.35;
    let previous: T.Group = accordion;
    for (let i = 0; i < 5; i++) {
      const hinge = new T.Group();
      previous.add(hinge);
      if (i) hinge.position.x = width;
      const outline = [
        new T.Vector2(0, lower[i]),
        new T.Vector2(width, lower[i + 1]),
        new T.Vector2(width, upper[i + 1]),
        new T.Vector2(0, upper[i]),
      ];
      const holes = [];
      for (let n = 0; n < 24; n++) {
        const x = 0.1 + random(i * 71 + n + 0.2) * (width - 0.2),
          u = x / width,
          lo = T.MathUtils.lerp(lower[i], lower[i + 1], u),
          hi = T.MathUtils.lerp(upper[i], upper[i + 1], u);
        holes.push({
          x,
          y: T.MathUtils.lerp(lo + 0.12, hi - 0.12, random(n + i * 41 + 0.8)),
          radius: n % 11 === 0 ? 0.035 : 0.014 + random(n + 2) * 0.009,
        });
      }
      mesh(
        keep(perforatedPaperGeometry(outline, holes, 0.014)),
        [face, edge],
        hinge,
      );
      const pts = Array.from({ length: 5 }, (_, n) => {
        const x = 0.13 + n * 0.27,
          u = x / width;
        return new T.Vector3(
          x,
          T.MathUtils.lerp(
            T.MathUtils.lerp(lower[i], lower[i + 1], u),
            T.MathUtils.lerp(upper[i], upper[i + 1], u),
            0.52 + Math.sin(n + i) * 0.12,
          ),
          0.013,
        );
      });
      inkPath(pts, hinge);
      updates.push(
        (_, amount) =>
          (hinge.rotation.y =
            i === 0 ? -0.2 : (i % 2 ? 1 : -1) * (1.1 - amount * 0.4)),
      );
      previous = hinge;
    }
    root.rotation.set(0.06, -0.15, 0);
  }
  function cloth() {
    const mat = perforated(true);
    mat.color.set("#bcaa8d");
    mat.envMapIntensity = 0.28;
    mat.bumpScale = 0.045;
    mat.roughness = 1;
    const fn = (u: number, v: number) => {
      const phase = u * Math.PI * 5.1 + 0.65 * Math.sin(u * Math.PI * 2);
      const bottom = -1.85 + 0.08 * Math.sin(u * Math.PI * 3),
        top = 1.35 + u * 0.85 - 0.35 * Math.sin(u * Math.PI);
      return new T.Vector3(
        (u - 0.5) * 5.3 + 0.1 * Math.sin(v * Math.PI) * Math.sin(u * 4),
        T.MathUtils.lerp(bottom, top, v),
        Math.sin(phase) * (0.22 + 0.32 * v) +
          Math.sin(u * 7 + v * 3) * Math.sin(v * Math.PI) * 0.12 +
          Math.pow(1 - v, 3) * 0.65,
      );
    };
    const geometry = surface(fn, 144, 72);
    const drape = mesh(geometry, mat);
    drape.rotation.y = -0.2;
    mat.alphaToCoverage = true;
    // Narrow rolled hems define a fabric edge, with no solid duplicate behind the apertures.
    const hemMaterial = keep(mat.clone());
    hemMaterial.alphaMap = null;
    hemMaterial.alphaTest = 0;
    bindTexture("linen", hemMaterial);
    for (const edge of [0, 1, 2]) {
      const points = Array.from({ length: 81 }, (_, n) =>
        edge === 0 ? fn(n / 80, 0) : fn(edge - 1, n / 80),
      );
      mesh(
        keep(
          new T.TubeGeometry(
            new T.CatmullRomCurve3(points),
            100,
            0.012,
            5,
            false,
          ),
        ),
        hemMaterial,
        drape,
      );
    }
    // Reuse the hole distribution as projected light, rather than adding floating dots.
    const source = mat.alphaMap!.image as HTMLCanvasElement;
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 512, 512);
      ctx.globalCompositeOperation = "difference";
      ctx.drawImage(source, 0, 0);
      ctx.globalCompositeOperation = "source-over";
    }
    const projection = keep(new T.CanvasTexture(c));
    const floorLight = projectedLight(projection, 6, 3.5);
    floorLight.position.x = 0.6;
    const wall = mesh(
      keep(new T.PlaneGeometry(5.7, 4.5)),
      keep(
        new T.MeshBasicMaterial({
          color: "#d5ad6f",
          alphaMap: projection,
          transparent: true,
          opacity: 0.21,
          depthWrite: false,
        }),
      ),
    );
    wall.position.set(-0.5, 0.2, -1.7);
    wall.userData.excludeFromFraming = true;
    wall.castShadow = false;
    wall.receiveShadow = false;
    updates.push((t, a) => {
      drape.rotation.y = -0.2 + Math.sin(t * 0.2) * 0.025 + a * 0.4;
      drape.scale.x = 1 + a * 0.15;
      (floorLight.material as T.MeshBasicMaterial).opacity = 0.4 + a * 0.2;
    });
  }
  if (about) {
    switch (design) {
      case "space":
        starFlow();
        break;
      case "clear":
        ribbon(true);
        break;
      case "classic":
        folded();
        break;
      case "garden":
        growth(true);
        break;
      case "photo":
        cloth();
        break;
      case "construct":
        compute(true);
        break;
      case "map":
        weave(true);
        break;
      case "chapters": {
        const book = createBookSculpture(keep, textureOptions);
        root.add(book.root);
        updates.push(book.update);
        break;
      }
    }
  } else {
    switch (kind) {
      case "crystal":
        crystal();
        break;
      case "metal":
        ribbon();
        break;
      case "compute":
        compute();
        break;
      case "weave":
        weave();
        break;
      case "growth":
        growth();
        break;
      case "terrain":
      case "optics":
      case "orrery": {
        const model = createHomeIdentitySculpture(
          kind,
          mobile,
          keep,
          textureOptions,
        );
        root.add(model.root);
        updates.push(model.update);
        break;
      }
    }
  }
  return {
    root,
    update(time, amount) {
      updates.forEach((fn) => fn(time, amount));
    },
  };
}
