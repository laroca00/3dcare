import * as THREE from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import type { QualityLevel } from "./quality";
import { LAYERS, LAYER_HEIGHT, MUG_RADIUS, nozzlePath } from "./storyMotion";
import { smoothstep } from "./timeline";

export interface PrintJob {
  /** The printed mug; stands on the bed surface. */
  object: THREE.Group;
  /** 0..1: how much of the mug has been printed. */
  setProgress(t: number): void;
  /** 0..1: how full of coffee the mug is. */
  setCoffee(t: number): void;
  /** Keeps the logo printed only up to the current layer; call after the mug has moved. */
  syncClip(): void;
  /**
   * Slicer preview: the mug's toolpaths as lines, drawn layer by layer
   * (reveal 0..1); they fade back while the mug prints (printed 0..1).
   */
  setPreview(reveal: number, printed: number): void;
  /**
   * The looks after the print, each 0..1: the thermal camera's colours (and
   * how far the mug has cooled), and the real 0.3 mm layer ridges for the close-up.
   */
  setLooks(thermal: number, cool: number, ridges: number): void;
  /** Filament colour for the mug and its preview. */
  setColor(color: number): void;
  /** Line widths are in pixels, so the preview needs the canvas size. */
  setResolution(width: number, height: number): void;
  dispose(): void;
}

// The two-handled mug: a round wall with a loop handle on each side, built
// from the same layers a slicer would print.
const BASE_LAYERS = 2;
const ARM_LAYERS = new Set([5, 6, 7, 22, 23, 24]);
const GRIP_FROM = 8;
const GRIP_TO = 21;

/**
 * The 3D Care mark (three concentric arcs opening to the right and a dot),
 * raised slightly off the mug wall and bent around it, facing +z.
 */
function logoGeometry(segments: number) {
  const scale = 0.068;
  const width = 5.5 * scale;
  const shapes: THREE.Shape[] = [];
  const a0 = Math.PI / 4;
  const a1 = (Math.PI * 7) / 4;
  for (const radius of [26, 18, 10]) {
    const r = radius * scale;
    const shape = new THREE.Shape();
    shape.absarc(0, 0, r + width / 2, a0, a1, false);
    // Round ends, like the logo's stroke caps.
    shape.absarc(Math.cos(a1) * r, Math.sin(a1) * r, width / 2, a1, a1 + Math.PI, false);
    shape.absarc(0, 0, r - width / 2, a1, a0, true);
    shape.absarc(Math.cos(a0) * r, Math.sin(a0) * r, width / 2, a0 + Math.PI, a0 + Math.PI * 2, false);
    shapes.push(shape);
  }
  shapes.push(new THREE.Shape().absarc(0, 0, 3.5 * scale, 0, Math.PI * 2, false));
  const geometry = new THREE.ExtrudeGeometry(shapes, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 1, curveSegments: segments });
  // Bend the flat logo around the wall.
  const wall = MUG_RADIUS + 0.2;
  const centerY = (LAYERS * LAYER_HEIGHT) / 2;
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const angle = position.getX(i) / wall;
    const r = wall - 0.06 + position.getZ(i);
    position.setXYZ(i, Math.sin(angle) * r, position.getY(i) + centerY, Math.cos(angle) * r);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Real layer height in cm; the drawn layers are ten times thicker. */
const REAL_LAYER = 0.03;

/**
 * Adds the thermal view and the real layer ridges to a mug material. Heights
 * are measured on the mug (instances only move up), so the base is hot and
 * the ridges run round the wall. While the ridges show, each drawn layer
 * grows to close the small gap above it, so the wall reads as one surface.
 */
function addLooks(material: THREE.MeshStandardMaterial, uniforms: Record<"uThermal" | "uCool" | "uRidges" | "uSeal", THREE.IUniform<number>>) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uSeal;
        varying float vMugHeight;
        varying float vMugRadius;
        varying vec3 vMugUp;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        transformed.y += step(0.1, position.y) * ${(LAYER_HEIGHT * 0.1).toFixed(3)} * uSeal;
        vec4 onMug = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          onMug = instanceMatrix * onMug;
        #endif
        vMugHeight = onMug.y;
        vMugRadius = length(onMug.xz);
        vMugUp = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uThermal;
        uniform float uCool;
        uniform float uRidges;
        varying float vMugHeight;
        varying float vMugRadius;
        varying vec3 vMugUp;
        // A thermal camera's palette, from cold violet to white hot.
        vec3 ironbow(float t) {
          vec3 c = mix(vec3(0.02, 0.0, 0.1), vec3(0.32, 0.0, 0.55), smoothstep(0.0, 0.3, t));
          c = mix(c, vec3(0.86, 0.08, 0.32), smoothstep(0.25, 0.5, t));
          c = mix(c, vec3(1.0, 0.45, 0.0), smoothstep(0.45, 0.7, t));
          c = mix(c, vec3(1.0, 0.86, 0.12), smoothstep(0.65, 0.88, t));
          c = mix(c, vec3(1.0, 1.0, 0.85), smoothstep(0.85, 1.0, t));
          return pow(c, vec3(2.2));
        }
        // Ridge strength fades out where one ridge is smaller than a pixel or two.
        float ridgeAmount() {
          float phase = vMugHeight / ${REAL_LAYER.toFixed(2)};
          return uRidges * (1.0 - smoothstep(0.12, 0.3, fwidth(phase)));
        }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        if (uRidges > 0.0) {
          // The groove between two layers is a little darker.
          float groove = pow(0.5 + 0.5 * cos(vMugHeight / ${REAL_LAYER.toFixed(2)} * 6.2831853), 3.0);
          diffuseColor.rgb *= 1.0 - 0.3 * groove * ridgeAmount();
        }`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        if (uRidges > 0.0) {
          // Each layer is a rounded bead: its surface tilts up, then down, across its height.
          float slope = sin(vMugHeight / ${REAL_LAYER.toFixed(2)} * 6.2831853);
          normal = normalize(normal + vMugUp * slope * 0.7 * ridgeAmount());
        }`,
      )
      .replace(
        "#include <tonemapping_fragment>",
        `if (uThermal > 0.0) {
          // Hot at the base, which has just left the bed; the thin handles cool first.
          float heat = 1.0 - vMugHeight / ${(LAYERS * LAYER_HEIGHT).toFixed(1)} * (0.55 + 0.3 * uCool);
          heat -= smoothstep(${(MUG_RADIUS + 0.5).toFixed(1)}, ${(MUG_RADIUS + 1.5).toFixed(1)}, vMugRadius) * (0.25 + 0.2 * uCool);
          heat -= 0.15 * uCool;
          // Edges turned away from the camera read a little cooler, which keeps the shape.
          heat -= (1.0 - abs(dot(normal, normalize(vViewPosition)))) * 0.18;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, ironbow(clamp(heat, 0.0, 1.0)), uThermal);
        }
        #include <tonemapping_fragment>`,
      );
  };
}

export function createPrintJob(bedSurface: THREE.Object3D, quality: QualityLevel): PrintJob {
  const object = new THREE.Group();
  bedSurface.add(object);

  const filament = new THREE.MeshStandardMaterial({ color: 0x2aa898, roughness: 0.42, metalness: 0 });
  const looks = { uThermal: { value: 0 }, uCool: { value: 0 }, uRidges: { value: 0 }, uSeal: { value: 0 } };
  addLooks(filament, looks);
  const current = new THREE.MeshStandardMaterial({ color: 0xf5c400, emissive: 0x6b4e00, roughness: 0.4 });
  const segments = quality === 2 ? 64 : 32;
  const thickness = LAYER_HEIGHT * 0.9;

  const ringShape = new THREE.Shape().absarc(0, 0, MUG_RADIUS + 0.2, 0, Math.PI * 2, false);
  ringShape.holes.push(new THREE.Path().absarc(0, 0, MUG_RADIUS - 0.2, 0, Math.PI * 2, true));
  const ring = new THREE.ExtrudeGeometry(ringShape, { depth: thickness, bevelEnabled: false, curveSegments: segments });
  ring.rotateX(-Math.PI / 2);
  const disc = new THREE.CylinderGeometry(MUG_RADIUS + 0.2, MUG_RADIUS + 0.2, thickness, segments).translate(0, thickness / 2, 0);
  const block = new THREE.BoxGeometry(1, thickness, 1).translate(0, thickness / 2, 0);

  // One instanced mesh per shape; instance i is layer i, so `count` reveals layers bottom-up.
  const walls = new THREE.InstancedMesh(ring, filament, LAYERS);
  const bases = new THREE.InstancedMesh(disc, filament, BASE_LAYERS);
  const handleLayers = [...Array(LAYERS).keys()].filter((i) => ARM_LAYERS.has(i) || (i >= GRIP_FROM && i <= GRIP_TO));
  // Two instances per layer, one for each handle.
  const handle = new THREE.InstancedMesh(block, filament, handleLayers.length * 2);
  const m = new THREE.Matrix4();
  for (let i = 0; i < LAYERS; i++) walls.setMatrixAt(i, m.makeTranslation(0, i * LAYER_HEIGHT, 0));
  for (let i = 0; i < BASE_LAYERS; i++) bases.setMatrixAt(i, m.makeTranslation(0, i * LAYER_HEIGHT, 0));
  handleLayers.forEach((layer, i) => {
    const arm = ARM_LAYERS.has(layer);
    // Arms reach out from the wall; the grip is the upright bar of the loop.
    const [x, width, depth] = arm ? [MUG_RADIUS + 1.9, 3.8, 1.6] : [MUG_RADIUS + 3.3, 1, 2.2];
    for (const side of [1, -1]) {
      m.compose(new THREE.Vector3(side * x, layer * LAYER_HEIGHT, 0), new THREE.Quaternion(), new THREE.Vector3(width, 1, depth));
      handle.setMatrixAt(i * 2 + (side > 0 ? 0 : 1), m);
    }
  });
  for (const mesh of [walls, bases, handle]) {
    mesh.castShadow = mesh.receiveShadow = true;
    object.add(mesh);
  }

  const currentLayer = new THREE.Mesh(ring, current);
  object.add(currentLayer);

  // Slicer preview: one loop per layer along the middle of the wall, the
  // handles' outlines, and infill lines across the base, bottom layer first.
  const lines: number[] = [];
  const segment = (a: [number, number, number], b: [number, number, number]) => lines.push(...a, ...b);
  const loop = 48;
  for (let layer = 0; layer < LAYERS; layer++) {
    const y = (layer + 0.5) * LAYER_HEIGHT;
    if (layer < BASE_LAYERS) {
      // Infill: parallel lines, crossing direction every layer.
      for (let k = -MUG_RADIUS + 0.6; k < MUG_RADIUS; k += 0.8) {
        const half = Math.sqrt(MUG_RADIUS * MUG_RADIUS - k * k);
        if (layer % 2) segment([k, y, -half], [k, y, half]);
        else segment([-half, y, k], [half, y, k]);
      }
    }
    for (let i = 0; i < loop; i++) {
      const a = (i / loop) * Math.PI * 2;
      const b = ((i + 1) / loop) * Math.PI * 2;
      segment([Math.cos(a) * MUG_RADIUS, y, Math.sin(a) * MUG_RADIUS], [Math.cos(b) * MUG_RADIUS, y, Math.sin(b) * MUG_RADIUS]);
    }
    if (ARM_LAYERS.has(layer) || (layer >= GRIP_FROM && layer <= GRIP_TO)) {
      const [x, width, depth] = ARM_LAYERS.has(layer) ? [MUG_RADIUS + 1.9, 3.8, 1.6] : [MUG_RADIUS + 3.3, 1, 2.2];
      for (const side of [1, -1]) {
        const x0 = side * (x - width / 2);
        const x1 = side * (x + width / 2);
        const z = depth / 2;
        segment([x0, y, -z], [x1, y, -z]);
        segment([x1, y, -z], [x1, y, z]);
        segment([x1, y, z], [x0, y, z]);
        segment([x0, y, z], [x0, y, -z]);
      }
    }
  }
  const previewGeometry = new LineSegmentsGeometry().setPositions(lines);
  const previewSegments = lines.length / 6;
  const previewMaterial = new LineMaterial({ color: 0x2aa898, linewidth: 1.3, transparent: true, depthWrite: false });
  const preview = new LineSegments2(previewGeometry, previewMaterial);
  preview.visible = false;
  object.add(preview);

  // The raised logo appears layer by layer with the wall: everything above
  // the current layer is clipped away.
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const logoMaterial = filament.clone();
  logoMaterial.clippingPlanes = [clip];
  // The logo shares the thermal colours but is not a printed layer: no ridges, no growing.
  addLooks(logoMaterial, { ...looks, uRidges: { value: 0 }, uSeal: { value: 0 } });
  const logoShape = logoGeometry(quality === 2 ? 40 : 16);
  const logo = new THREE.Mesh(logoShape, logoMaterial);
  logo.castShadow = logo.receiveShadow = true;
  object.add(logo);
  let printedHeight = 0;
  const top = new THREE.Vector3();

  // Coffee fills the mug from the base up to just below the rim.
  const coffeeMaterial = new THREE.MeshStandardMaterial({ color: 0x2b170c, roughness: 0.12, metalness: 0 });
  const coffeeShape = new THREE.CylinderGeometry(MUG_RADIUS - 0.2, MUG_RADIUS - 0.2, 1, segments).translate(0, 0.5, 0);
  const coffee = new THREE.Mesh(coffeeShape, coffeeMaterial);
  const coffeeBottom = BASE_LAYERS * LAYER_HEIGHT;
  const coffeeTop = (LAYERS - 4) * LAYER_HEIGHT;
  coffee.position.y = coffeeBottom;
  coffee.visible = false;
  object.add(coffee);

  return {
    object,
    setProgress(t) {
      const { layer } = nozzlePath(t);
      const done = t <= 0 ? 0 : t >= 1 ? LAYERS : layer;
      walls.count = done;
      bases.count = Math.min(done, BASE_LAYERS);
      handle.count = handleLayers.filter((l) => l < done).length * 2;
      currentLayer.visible = t > 0 && t < 1;
      currentLayer.position.y = Math.min(layer, LAYERS - 1) * LAYER_HEIGHT;
      printedHeight = t >= 1 ? Infinity : done * LAYER_HEIGHT;
      logo.visible = done > 0;
    },
    setPreview(reveal, printed) {
      preview.visible = reveal > 0 && printed < 1;
      previewGeometry.instanceCount = Math.floor(previewSegments * reveal);
      previewMaterial.opacity = 1 - smoothstep(printed / 0.08) * 0.7;
    },
    setLooks(thermal, cool, ridges) {
      looks.uThermal.value = thermal;
      looks.uCool.value = cool;
      // Only up close: further away the ridges would shimmer.
      looks.uRidges.value = smoothstep((ridges - 0.5) / 0.5);
      looks.uSeal.value = smoothstep(ridges / 0.3);
    },
    setColor(color) {
      filament.color.setHex(color);
      logoMaterial.color.setHex(color);
      previewMaterial.color.setHex(color);
      // The layer being printed stands out in yellow, or in white on a yellow mug.
      current.color.setHex(color === 0xf5c400 ? 0xffffff : 0xf5c400);
    },
    setResolution(width, height) {
      previewMaterial.resolution.set(width, height);
    },
    syncClip() {
      clip.constant = printedHeight === Infinity ? 1e6 : object.localToWorld(top.set(0, printedHeight, 0)).y;
    },
    setCoffee(t) {
      coffee.visible = t > 0;
      coffee.scale.y = Math.max(t, 0.01) * (coffeeTop - coffeeBottom);
    },
    dispose() {
      [ring, disc, block, coffeeShape, logoShape, previewGeometry].forEach((g) => g.dispose());
      [filament, current, coffeeMaterial, logoMaterial, previewMaterial].forEach((mat) => mat.dispose());
      [walls, bases, handle].forEach((mesh) => mesh.dispose());
    },
  };
}
