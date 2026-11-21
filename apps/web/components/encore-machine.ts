import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

type Keep = <V extends { dispose(): void }>(value: V) => V;
type Point = [number, number, number];
const cycle = 2 * Math.PI;
function travel(value: number, delay = 0, end = 1) {
  const t = T.MathUtils.clamp((value - delay) / (end - delay), 0, 1);
  return t * t * (3 - 2 * t);
}

export function makeMachineSecret(theme: string, keep: Keep) {
  const root = new T.Group();
  const moves: Array<(t: number, r: number) => void> = [];
  const materials = new Map<string, T.MeshStandardMaterial>();
  function enamel(color: string, metalness = 0, roughness = 0.45) {
    const id = color + metalness + ":" + roughness;
    if (!materials.has(id))
      materials.set(
        id,
        keep(
          new T.MeshStandardMaterial({
            color,
            metalness,
            roughness,
            side: T.DoubleSide,
          }),
        ),
      );
    return materials.get(id)!;
  }
  const ivory = enamel("#f0e8d6", 0.11, 0.35),
    black = enamel("#25262a", 0.57, 0.32);
  const nickel = enamel("#b6c1c1", 0.76, 0.26),
    brass = enamel("#b89d66", 0.74, 0.29);
  const cobalt = enamel("#2349ab", 0.36, 0.29),
    paleBlue = enamel("#afc7df", 0.12, 0.39);
  const red = enamel("#bd3025", 0.4, 0.3),
    wood = enamel("#966c48", 0.12, 0.51);
  const graphite = enamel("#3b3837", 0.61, 0.33);
  const shapes = new Map<string, T.BufferGeometry>();
  function geometry(id: string, construct: () => T.BufferGeometry) {
    if (!shapes.has(id)) shapes.set(id, keep(construct()));
    return shapes.get(id)!;
  }
  function mesh(g: T.BufferGeometry, m: T.Material, parent: T.Object3D = root) {
    const o = new T.Mesh(g, m);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function group(parent: T.Object3D = root) {
    const g = new T.Group();
    parent.add(g);
    return g;
  }
  function at<TObj extends T.Object3D>(
    object: TObj,
    x: number,
    y: number,
    z: number,
  ) {
    object.position.set(x, y, z);
    return object;
  }
  function box(
    parent: T.Object3D,
    color: T.Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    r = 0.025,
  ) {
    const radius = Math.min(w, h, d, r * 3) / 3;
    const g = geometry(
      "b" + [w, h, d, r],
      () => new RoundedBoxGeometry(w, h, d, 2, radius),
    );
    return at(mesh(g, color, parent), x, y, z);
  }
  function disk(
    parent: T.Object3D,
    color: T.Material,
    rad: number,
    h: number,
    x: number,
    y: number,
    z: number,
    segments = 32,
  ) {
    const g = geometry(
      "d" + [rad, h, segments],
      () => new T.CylinderGeometry(rad, rad, h, segments),
    );
    return at(mesh(g, color, parent), x, y, z);
  }
  function orb(
    parent: T.Object3D,
    color: T.Material,
    r: number,
    x: number,
    y: number,
    z: number,
  ) {
    const g = geometry("s" + r, () => new T.SphereGeometry(r, 18, 10));
    return at(mesh(g, color, parent), x, y, z);
  }
  function ring(
    parent: T.Object3D,
    color: T.Material,
    r: number,
    thickness: number,
    x: number,
    y: number,
    z: number,
  ) {
    const g = geometry(
      "r" + [r, thickness],
      () => new T.TorusGeometry(r, thickness, 7, 48),
    );
    return at(mesh(g, color, parent), x, y, z);
  }
  function bar(
    parent: T.Object3D,
    color: T.Material,
    rad: number,
    a: Point,
    b: Point,
  ) {
    const v = new T.Vector3(...a),
      w = new T.Vector3(...b),
      axis = w.clone().sub(v);
    const o = mesh(
      geometry("u" + rad, () => new T.CylinderGeometry(rad, rad, 1, 10)),
      color,
      parent,
    );
    o.scale.y = axis.length();
    o.position.copy(v).lerp(w, 0.5);
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis.normalize());
    return o;
  }
  function shape(
    parent: T.Object3D,
    color: T.Material,
    s: T.Shape,
    depth = 0.014,
  ) {
    const o = mesh(
      keep(
        new T.ExtrudeGeometry(s, {
          depth,
          curveSegments: 8,
          bevelEnabled: false,
        }),
      ),
      color,
      parent,
    );
    return o;
  }
  function silhouette(
    parent: T.Object3D,
    color: T.Material,
    points: number[][],
    depth = 0.015,
  ) {
    const s = new T.Shape();
    points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    return shape(parent, color, s, depth);
  }
  function topRing(
    parent: T.Object3D,
    color: T.Material,
    r: number,
    t: number,
    y: number,
  ) {
    const o = ring(parent, color, r, t, 0, y, 0);
    o.rotation.x = Math.PI / 2;
    return o;
  }
  // A slotted drum has two banks of curved enamel shutters. The individual slats
  // converge behind the cards, leaving each drawn phase of the bird exposed.
  function carousel() {
    const plumage = enamel("#193750", 0.04, 0.7),
      lightWing = enamel("#396590", 0.08, 0.61);
    disk(root, nickel, 0.84, 0.08, 0, -0.77, 0);
    disk(root, ivory, 0.87, 0.14, 0, -0.66, 0);
    disk(root, cobalt, 0.69, 0.19, 0, -0.51, 0);
    topRing(root, brass, 0.67, 0.018, -0.42);
    const carousel = group();
    disk(carousel, ivory, 0.91, 0.09, 0, -0.33, 0);
    topRing(carousel, nickel, 0.88, 0.028, -0.29);
    disk(root, nickel, 0.085, 1.3, 0, 0.13, 0);
    for (let i = 0; i < 9; i++) {
      const card = group(carousel),
        angle = (cycle * i) / 9;
      card.rotation.y = angle;
      const page = at(group(card), 0, 0.066, 0.627);
      box(page, paleBlue, 0.53, 0.68, 0.044, 0, 0.02, 0);
      box(page, ivory, 0.487, 0.619, 0.016, 0, 0.018, 0.029);
      box(page, cobalt, 0.487, 0.034, 0.016, 0, -0.26, 0.045, 0);
      for (let mark = 0; mark <= i % 4; mark++)
        box(
          page,
          nickel,
          0.023,
          0.013,
          0.008,
          -0.197 + mark * 0.045,
          0.274,
          0.044,
          0,
        );
      // A swallow with a forked tail and a different pair of wings on each leaf.
      const flight = group(page);
      flight.position.set(0.008, 0.015, 0.056);
      const f = Math.sin((i * cycle) / 9);
      const near = new T.Shape();
      near.moveTo(-0.07, 0);
      near.quadraticCurveTo(-0.11, 0.1 + 0.1 * f, -0.16, 0.16 + 0.075 * f);
      near.quadraticCurveTo(0.023, 0.105 + 0.06 * f, 0.1, 0.009);
      near.closePath();
      shape(flight, lightWing, near, 0.006);
      silhouette(flight, plumage, [
        [-0.2, -0.071],
        [-0.146, 0.004],
        [-0.19, 0.055],
        [-0.056, 0.018],
        [0.07, 0.031],
        [0.117, 0.06],
        [0.15, 0.052],
        [0.178, 0.033],
        [0.129, 0.024],
        [0.087, -0.011],
        [0.029, -0.033],
        [-0.092, -0.019],
      ]);
      const lead = new T.Shape();
      lead.moveTo(-0.071, 0);
      lead.quadraticCurveTo(-0.093, 0.088 * (1 + f), -0.041, 0.21 * f);
      lead.quadraticCurveTo(0.009, 0.118 * f, 0.065, 0.011);
      lead.closePath();
      at(shape(flight, cobalt, lead, 0.01), 0, 0, 0.017);
      for (const x of [-0.19, 0.19])
        bar(card, nickel, 0.013, [x, -0.3, 0.625], [x, -0.24, 0.625]);
    }
    const lid = group(),
      cap = at(group(lid), 0, 0.54, 0);
    disk(cap, ivory, 0.95, 0.095, 0, 0, 0);
    topRing(cap, nickel, 0.91, 0.013, 0.05);
    disk(cap, cobalt, 0.83, 0.027, 0, 0.059, 0);
    disk(cap, ivory, 0.52, 0.029, 0, 0.081, 0);
    disk(cap, brass, 0.073, 0.07, 0, 0.13, 0);
    orb(cap, cobalt, 0.074, 0, 0.2, 0);
    for (let i = 0; i < 12; i++) {
      const n = at(group(cap), 0, 0.098, 0);
      n.rotation.y = (i * cycle) / 12;
      box(n, nickel, 0.013, 0.01, i % 3 === 0 ? 0.111 : 0.048, 0, 0, 0.43);
    }
    const slats: Array<{
      holder: T.Group;
      side: number;
      initial: number;
      terminal: number;
    }> = [];
    for (const side of [-1, 1])
      for (let i = 0; i < 9; i++) {
        const angle = ((i + 0.5) * Math.PI) / 9,
          leaf = group();
        const surface = box(
          leaf,
          i % 3 === 0 ? enamel("#355daa", 0.37, 0.28) : cobalt,
          0.303,
          0.79,
          0.038,
          0,
          0.085,
          0.86,
          0.012,
        );
        for (const y of [-0.265, 0.44])
          box(leaf, nickel, 0.246, 0.013, 0.012, 0, y, 0.888, 0.002);
        for (let row = 0; row < 3; row++)
          box(
            leaf,
            paleBlue,
            0.055,
            0.012,
            0.009,
            0,
            0.258 + row * 0.038,
            0.885,
            0.002,
          );
        surface.castShadow = true;
        slats.push({
          holder: leaf,
          side,
          initial: angle,
          terminal: 1.76 + 0.126 * i,
        });
      }
    const handle = group(root);
    handle.position.set(0.87, -0.57, 0);
    bar(handle, nickel, 0.047, [0, 0, 0], [0.2, 0, 0]);
    bar(handle, cobalt, 0.042, [0.2, 0, 0], [0.2, 0.18, 0.09]);
    bar(handle, brass, 0.045, [0.2, 0.18, 0.09], [0.33, 0.18, 0.09]);
    root.rotation.set(0.17, -0.14, -0.015);
    moves.push((time, reveal) => {
      const r = travel(reveal);
      slats.forEach((s) => {
        s.holder.rotation.y =
          s.side * T.MathUtils.lerp(s.initial, s.terminal, r);
      });
      lid.position.y = 0.2 * r;
      carousel.rotation.y = r * (0.64 + time * 0.18);
      handle.rotation.x = r * time * 0.7;
    });
  }
  // Magic-lantern bench with a sliding glass carrier, hinged lamp cover, and
  // a spring screen. The moon and ridgelines are separate painted reliefs.
  function lantern() {
    const machine = at(group(), -0.86, -0.22, 0.3),
      screenOrigin = new T.Vector3(0.91, -0.63, -0.83);
    const projectionCentre = screenOrigin
      .clone()
      .add(new T.Vector3(0, 0.64, 0));
    machine.lookAt(projectionCentre);
    const lamp = enamel("#fbeac0", 0.02, 0.22);
    lamp.emissive.set("#e98d31");
    lamp.emissiveIntensity = 0.48;
    const shell = enamel("#786348", 0.55, 0.32),
      lacquer = enamel("#49433d", 0.32, 0.37);
    box(machine, wood, 1.1, 0.13, 1.0, 0, -0.43, -0.02);
    for (const x of [-0.4, 0.4])
      for (const z of [-0.35, 0.34])
        disk(machine, graphite, 0.081, 0.095, x, -0.53, z);
    box(machine, black, 0.91, 0.556, 0.74, 0, -0.079, -0.12);
    for (const x of [-0.47, 0.47]) {
      box(machine, shell, 0.05, 0.47, 0.66, x, -0.07, -0.105);
      for (let i = 0; i < 6; i++)
        box(
          machine,
          black,
          0.015,
          0.155,
          0.029,
          x * 1.065,
          0.008,
          -0.33 + 0.085 * i,
          0.003,
        );
    }
    box(machine, wood, 0.83, 0.395, 0.043, 0, -0.09, -0.51);
    const hoodPivot = at(group(machine), 0, 0.198, -0.47);
    box(hoodPivot, shell, 0.97, 0.071, 0.72, 0, 0, 0.35);
    for (const x of [-0.19, 0.19])
      bar(hoodPivot, brass, 0.028, [x, 0.044, 0.32], [x, 0.133, 0.32]);
    bar(hoodPivot, lacquer, 0.04, [-0.19, 0.135, 0.32], [0.19, 0.135, 0.32]);
    const bulb = orb(machine, lamp, 0.155, 0, 0.206, -0.12);
    bulb.scale.set(0.83, 1.24, 0.83);
    const plate = at(group(machine), 0, 0, 0.157);
    for (const x of [-0.3, 0.3])
      bar(machine, brass, 0.026, [x, -0.04, 0.17], [x, 0.61, 0.17]);
    const glass = enamel("#b9cebf", 0.21, 0.24);
    glass.transparent = true;
    glass.opacity = 0.63;
    box(plate, glass, 0.5, 0.38, 0.025, 0, 0.13, 0);
    for (const y of [-0.085, 0.34])
      box(plate, wood, 0.58, 0.047, 0.053, 0, y, 0, 0.006);
    for (const x of [-0.276, 0.276])
      box(plate, wood, 0.042, 0.42, 0.057, x, 0.13, 0, 0.005);
    const moonDisk = disk(plate, ivory, 0.064, 0.01, 0.08, 0.2, 0.023);
    moonDisk.rotation.x = Math.PI / 2;
    at(
      silhouette(
        plate,
        enamel("#34516a", 0.12, 0.72),
        [
          [-0.24, -0.047],
          [-0.24, 0.042],
          [-0.11, 0.16],
          [0.028, 0.034],
          [0.095, 0.104],
          [0.24, 0.02],
          [0.24, -0.047],
        ],
        0.008,
      ),
      0,
      0,
      0.02,
    );
    box(plate, brass, 0.12, 0.022, 0.04, 0, 0.378, 0, 0.008);
    for (const [radius, z, len, mat] of [
      [0.3, 0.276, 0.105, brass],
      [0.255, 0.389, 0.16, black],
      [0.24, 0.493, 0.066, brass],
      [0.197, 0.555, 0.062, lacquer],
    ] as Array<[number, number, number, T.Material]>) {
      const o = disk(machine, mat, radius, len, 0, -0.015, z);
      o.rotation.x = Math.PI / 2;
    }
    const lens = disk(
      machine,
      enamel("#41696d", 0.72, 0.16),
      0.166,
      0.03,
      0,
      -0.016,
      0.592,
    );
    lens.rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++)
      ring(machine, black, 0.256, 0.006, 0, -0.015, 0.326 + i * 0.022);
    const knob = disk(machine, brass, 0.095, 0.09, -0.526, -0.116, 0.109);
    knob.rotation.z = Math.PI / 2;
    const screen = at(group(), screenOrigin.x, screenOrigin.y, screenOrigin.z);
    const target = new T.Vector3(-0.82, -0.63, 1.13);
    screen.lookAt(target);
    const post = bar(
      screen,
      nickel,
      0.027,
      [0, -0.02, -0.06],
      [0, 1.29, -0.06],
    );
    box(screen, wood, 1.53, 0.12, 0.18, 0, 0, 0);
    for (const x of [-0.49, 0.49])
      box(screen, graphite, 0.09, 0.06, 0.36, x, -0.095, 0);
    const cloth = group(screen),
      imageGroup = group(cloth);
    box(cloth, ivory, 1.38, 1.04, 0.023, 0, 0.578, 0, 0.005);
    const glow = keep(
      new T.MeshBasicMaterial({ color: "#363748", side: T.DoubleSide }),
    );
    box(imageGroup, glow, 1.245, 0.84, 0.01, 0, 0.581, 0.023);
    const moon = keep(new T.MeshBasicMaterial({ color: "#f6dca1" }));
    const moonFace = disk(
      imageGroup,
      moon,
      0.161,
      0.01,
      0.224,
      0.786,
      0.036,
      48,
    );
    moonFace.rotation.x = Math.PI / 2;
    const ridge1 = keep(new T.MeshBasicMaterial({ color: "#84778b" })),
      ridge2 = keep(new T.MeshBasicMaterial({ color: "#534f61" })),
      ridge3 = keep(new T.MeshBasicMaterial({ color: "#303841" }));
    at(
      silhouette(imageGroup, ridge1, [
        [-0.62, 0.16],
        [-0.62, 0.482],
        [-0.43, 0.536],
        [-0.31, 0.636],
        [-0.166, 0.534],
        [0.04, 0.695],
        [0.292, 0.483],
        [0.43, 0.568],
        [0.62, 0.4],
        [0.62, 0.16],
      ]),
      0,
      0,
      0.044,
    );
    at(
      silhouette(imageGroup, ridge2, [
        [-0.62, 0.16],
        [-0.62, 0.324],
        [-0.454, 0.422],
        [-0.295, 0.396],
        [-0.1, 0.527],
        [0.12, 0.376],
        [0.28, 0.421],
        [0.42, 0.374],
        [0.62, 0.463],
        [0.62, 0.16],
      ]),
      0,
      0,
      0.066,
    );
    at(
      silhouette(imageGroup, ridge3, [
        [-0.62, 0.16],
        [-0.62, 0.276],
        [-0.45, 0.327],
        [-0.25, 0.263],
        [-0.11, 0.298],
        [0.02, 0.25],
        [0.28, 0.331],
        [0.397, 0.296],
        [0.62, 0.348],
        [0.62, 0.16],
      ]),
      0,
      0,
      0.086,
    );
    const rail = box(screen, brass, 1.48, 0.045, 0.065, 0, 1.105, 0, 0.012);
    const beamGeo = keep(new T.BufferGeometry());
    const beamMat = keep(
      new T.ShaderMaterial({
        uniforms: { strength: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide,
        vertexShader:
          "attribute float distanceAlong; attribute float across; varying float t; varying float u; void main(){t=distanceAlong;u=across;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "uniform float strength; varying float t; varying float u; void main(){float illumination=(.08+.22*sin(3.14159*u))*(1.-.55*t);gl_FragColor=vec4(1.,.78,.41,strength*illumination);}",
      }),
    );
    const beam = mesh(beamGeo, beamMat);
    beam.castShadow = false;
    beam.receiveShadow = false;
    beam.renderOrder = 4;
    const corners: Array<[number, number]> = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    // Convert to the shared parent frame before its final presentation rotation.
    root.updateMatrixWorld(true);
    const near = corners.map(([x, y]) =>
      machine.localToWorld(new T.Vector3(x * 0.079, y * 0.065 - 0.016, 0.603)),
    );
    const far = corners.map(([x, y]) =>
      screen.localToWorld(new T.Vector3(x * 0.605, 0.581 + y * 0.41, 0.102)),
    );
    const vertices: number[] = [],
      along: number[] = [],
      across: number[] = [];
    for (let n = 0; n < 4; n++) {
      const n1 = (n + 1) % 4;
      for (const p of [near[n], far[n], far[n1], near[n], far[n1], near[n1]])
        vertices.push(p.x, p.y, p.z);
      along.push(0, 1, 1, 0, 1, 0);
      across.push(0, 0, 1, 0, 1, 1);
    }
    beamGeo.setAttribute(
      "distanceAlong",
      new T.Float32BufferAttribute(along, 1),
    );
    beamGeo.setAttribute("across", new T.Float32BufferAttribute(across, 1));
    beamGeo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    beamGeo.computeVertexNormals();
    root.rotation.set(0.115, 0.06, 0);
    moves.push((_t, reveal) => {
      const lift = travel(reveal, 0.04, 0.7),
        pict = travel(reveal, 0.51, 1);
      hoodPivot.rotation.x = -1.31 * travel(reveal, 0, 0.58);
      plate.position.y = -0.235 + 0.7 * travel(reveal, 0.15, 0.75);
      const height = 0.12 + 0.88 * lift;
      cloth.scale.y = height;
      rail.position.y = 1.105 * height;
      post.scale.y = 1.31 * height;
      post.position.y = 0.637 * height;
      imageGroup.visible = pict > 0.012;
      imageGroup.scale.x = Math.max(0.005, pict);
      beam.visible = pict > 0.015;
      beamMat.uniforms.strength.value = pict;
      lamp.emissiveIntensity = 0.08 + 0.95 * pict;
    });
  }
  // The cabinet's four lids fold against the outside faces before the
  // telescopic shaft lifts the ten paired cams above the hinges.
  function kineticBloom() {
    box(root, black, 1.55, 0.15, 1.55, 0, -0.706, 0, 0.046);
    box(root, ivory, 1.431, 0.055, 1.431, 0, -0.61, 0, 0.015);
    box(root, graphite, 1.37, 0.09, 1.37, 0, -0.548, 0);
    for (const x of [-0.54, 0.54])
      for (const z of [-0.54, 0.54])
        disk(root, black, 0.094, 0.084, x, -0.806, z);
    const panels: Array<[T.Group, T.Group]> = [];
    for (let i = 0; i < 4; i++) {
      const arm = group();
      arm.rotation.y = (i * Math.PI) / 2;
      const hinge = at(group(arm), 0, -0.529, 0.7);
      box(
        hinge,
        i % 2 === 0 ? ivory : red,
        1.366,
        1.06,
        0.049,
        0,
        0.533,
        0,
        0.013,
      );
      box(hinge, graphite, 1.287, 0.028, 0.008, 0, 0.979, 0.029, 0.002);
      box(hinge, brass, 0.32, 0.032, 0.025, 0, 0.83, 0.038, 0.004);
      for (const x of [-0.51, 0.51]) {
        bar(
          arm,
          black,
          0.065,
          [x - 0.092, -0.538, 0.697],
          [x + 0.092, -0.538, 0.697],
        );
        bar(
          arm,
          nickel,
          0.032,
          [x - 0.123, -0.538, 0.697],
          [x + 0.123, -0.538, 0.697],
        );
        const screw = disk(hinge, nickel, 0.026, 0.017, x, 0.13, 0.037);
        screw.rotation.x = Math.PI / 2;
      }
      const lip = at(group(hinge), 0, 1.058, 0);
      const triangle = silhouette(
        lip,
        i % 2 === 0 ? graphite : red,
        [
          [-0.676, 0],
          [0.676, 0],
          [0, 0.682],
        ],
        0.027,
      );
      triangle.castShadow = true;
      panels.push([hinge, lip]);
    }
    const stem = group();
    disk(root, black, 0.48, 0.12, 0, -0.425, 0);
    topRing(root, brass, 0.375, 0.027, -0.344);
    const mast = disk(root, nickel, 0.097, 1, 0, -0.1, 0);
    const crown = group(stem);
    disk(crown, red, 0.304, 0.123, 0, 0.02, 0);
    topRing(crown, nickel, 0.298, 0.025, 0.09);
    function cog(parent: T.Object3D, r: number, y: number, m: T.Material) {
      const teeth = 14,
        p = new T.Shape();
      for (let k = 0; k < teeth * 4; k++) {
        const a = (cycle * k) / (teeth * 4),
          rr = k % 4 === 1 || k % 4 === 2 ? r : r * 0.83;
        const x = rr * Math.cos(a),
          v = rr * Math.sin(a);
        if (!k) p.moveTo(x, v);
        else p.lineTo(x, v);
      }
      p.closePath();
      const hole = new T.Path();
      hole.absarc(0, 0, r * 0.35, 0, cycle, true);
      p.holes.push(hole);
      const gear = shape(parent, m, p, 0.056);
      gear.rotation.x = -Math.PI / 2;
      gear.position.y = y;
      return gear;
    }
    const gearing = cog(root, 0.292, -0.287, brass),
      eccentric = cog(root, 0.172, -0.275, nickel);
    eccentric.position.x = 0.397;
    const leaves: Array<{ arm: T.Group; link: T.Group; index: number }> = [];
    for (let i = 0; i < 10; i++) {
      const a = (i * cycle) / 10,
        carrier = group(crown);
      carrier.rotation.y = a;
      const bearing = at(group(carrier), 0, 0.11, 0.215);
      bar(bearing, black, 0.049, [-0.115, 0, 0], [0.115, 0, 0]);
      bar(bearing, brass, 0.026, [-0.129, 0, 0], [0.129, 0, 0]);
      const arm = group(bearing);
      // Folded sheet paddle, two convex facets with a coloured metal ridge.
      const width = i % 2 === 0 ? 0.19 : 0.14,
        h = i % 2 === 0 ? 0.84 : 0.65;
      const contour: Array<[number, number]> = [
        [0, 0.026],
        [-width * 0.45, 0.16],
        [-width, 0.44 * h],
        [-width * 0.79, 0.76 * h],
        [0, h],
        [width * 0.79, 0.76 * h],
        [width, 0.44 * h],
        [width * 0.45, 0.16],
      ];
      const pos: number[] = [],
        id: number[] = [];
      for (const [x, y] of contour) pos.push(x, y, 0);
      pos.push(0, h * 0.53, 0.093);
      for (let n = 0; n < contour.length; n++)
        id.push(n, (n + 1) % contour.length, contour.length);
      const g = keep(new T.BufferGeometry());
      g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
      g.setIndex(id);
      g.computeVertexNormals();
      mesh(g, i % 2 === 0 ? red : ivory, arm);
      bar(arm, graphite, 0.031, [0, 0, 0], [0, 0.166, 0.031]);
      rodTrim(arm, 0.012, [0, 0.14, 0.03], [0, h * 0.54, 0.1]);
      rodTrim(arm, 0.009, [0, h * 0.54, 0.1], [0, h, 0.006]);
      orb(arm, brass, 0.031, 0, 0.12, 0.037);
      const link = at(group(carrier), 0, -0.15, 0.237);
      bar(link, nickel, 0.019, [0, 0, 0], [0, 0.235, 0.045]);
      orb(link, red, 0.033, 0, 0.232, 0.047);
      leaves.push({ arm, link, index: i });
    }
    function rodTrim(p: T.Object3D, r: number, a: Point, b: Point) {
      bar(p, nickel, r, a, b);
    }
    const boss = disk(crown, brass, 0.132, 0.09, 0, 0.18, 0);
    const jewel = orb(crown, black, 0.083, 0, 0.245, 0);
    jewel.scale.y = 0.67;
    root.rotation.set(0.265, -0.39, -0.025);
    moves.push((time, reveal) => {
      panels.forEach(([wall, cap], i) => {
        const opening = travel(reveal, i * 0.024, 0.6 + i * 0.016);
        wall.rotation.x = opening * 1.05;
        cap.rotation.x = -Math.PI / 2 - opening * 1.29;
      });
      const rise = travel(reveal, 0.15, 0.83);
      stem.position.y = -0.4 + 0.78 * rise;
      const length = 0.11 + 0.78 * rise;
      mast.scale.y = length;
      mast.position.y = -0.42 + length / 2;
      const spin = travel(reveal, 0.38, 1);
      crown.rotation.y = 0.98 * spin + 0.12 * Math.sin(time * 0.6) * spin;
      gearing.rotation.z = spin * 2.4;
      eccentric.rotation.z = -spin * 4.2;
      leaves.forEach(({ arm, link, index: i }) => {
        const phase = travel(
          reveal,
          0.36 + (i % 3) * 0.044,
          0.89 + (i % 3) * 0.045,
        );
        arm.rotation.x =
          0.077 +
          phase *
            (0.88 + 0.26 * (i % 2) + 0.052 * Math.sin(time * 0.9 + i * 0.63));
        link.rotation.x = 0.1 + phase * 0.49;
      });
      boss.position.y = 0.18 + 0.025 * spin;
    });
  }
  if (theme === "clear") carousel();
  else if (theme === "photo") lantern();
  else if (theme === "construct") kineticBloom();
  else throw new Error("No mechanical secret for " + theme);
  root.name = theme + "-encore";
  const update = (time: number, reveal: number) => {
    const amount = T.MathUtils.clamp(reveal, 0, 1);
    for (const move of moves) move(time, amount);
  };
  update(0, 0);
  return { root, update };
}
