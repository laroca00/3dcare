import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { HorizontalBlurShader } from "three/addons/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/addons/shaders/VerticalBlurShader.js";
import type { Theme } from "../theme/theme";
import type { QualityLevel } from "./quality";
import { storyLook } from "./lightArc";
import { StudioTransition, type StudioValues } from "./studioMix";

/** How strongly the glossy floor reflects the printer, per theme. */
const REFLECTION: Record<Theme, number> = { dark: 0.3, light: 0.16 };

/** Layer for the floor reflection, which the shadow and depth passes leave out. */
export const FLOOR_LAYER = 2;

export interface Studio {
  setTheme(theme: Theme): void;
  /** Advances a theme transition; returns true while it still needs frames. */
  update(dtSeconds: number): boolean;
  /** Lights the studio for this point in the story (see lightArc). */
  setStory(progress: number): void;
  /** Renders the soft contact shadow under everything on the floor; call before each frame. */
  renderShadow(hidden: readonly THREE.Object3D[]): void;
  /** Turns the floor reflection off when the device turns out to be too slow for it. */
  setReflection(enabled: boolean): void;
  /**
   * The morning at the end (0..1): a wooden table fades in under everything
   * and sunlight through a window falls across it onto `target`.
   */
  setMorning(amount: number, target: THREE.Vector3, sunlight?: number): void;
  /**
   * 0..1: how wide the window's sunlight spreads. At 1 (the opening desk)
   * it comes from further away and wider, throwing the window frame's soft
   * light and shade across the whole desk, with long soft shadows.
   */
  setSunSpread(spread: number): void;
  /** Sways the plant's leaves in the window's light: time in seconds, wind -1..1 (left to right). */
  setLeaves(time: number, wind: number): void;
  dispose(): void;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/** Soft boxes and strips around the stage, for studio-like reflections on metal and plastic. */
function lightformerEnvironment(renderer: THREE.WebGLRenderer) {
  const env = new THREE.Scene();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const room = new THREE.BoxGeometry(100, 100, 100);
  const roomMaterial = new THREE.MeshBasicMaterial({ color: 0x1c2024, side: THREE.BackSide });
  env.add(new THREE.Mesh(room, roomMaterial));
  geometries.push(room);
  materials.push(roomMaterial);
  function panel(w: number, h: number, intensity: number, color: number, position: [number, number, number], lookAt: [number, number, number]) {
    const geometry = new THREE.PlaneGeometry(w, h);
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.lookAt(...lookAt);
    env.add(mesh);
    geometries.push(geometry);
    materials.push(material);
  }
  // Large soft box overhead, a tall strip on the key side, a teal rim strip behind, a low front fill.
  panel(60, 36, 3, 0xffffff, [0, 48, 6], [0, 0, 0]);
  panel(14, 70, 4, 0xffffff, [-46, 12, 18], [0, 0, 0]);
  panel(10, 60, 3, 0x7fe8d8, [44, 10, -34], [0, 0, 0]);
  panel(50, 14, 1.2, 0xffffff, [0, 4, 48], [0, 0, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  return texture;
}

/** A floor that mirrors the scene faintly, blurred and fading out towards its edges. */
const FloorReflectionShader = {
  name: "FloorReflectionShader",
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    opacity: { value: 0.2 },
    radius: { value: 60 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec2 vLocal;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vLocal = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float opacity;
    uniform float radius;
    varying vec4 vUv;
    varying vec2 vLocal;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      // Points the mirrored camera cannot see would divide by zero.
      if (vUv.w <= 0.0001) discard;
      // A few taps around the point soften the mirror into a satin floor.
      vec4 sum = vec4(0.0);
      for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
          vec4 uv = vUv + vec4(float(x), float(y), 0.0, 0.0) * 0.006 * vUv.w;
          sum += texture2DProj(tDiffuse, uv);
        }
      }
      vec3 reflected = max(sum.rgb / 9.0, vec3(0.0));
      float fade = 1.0 - smoothstep(radius * 0.35, radius, length(vLocal));
      gl_FragColor = vec4(reflected, opacity * fade);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

export function createStudio(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  theme: Theme,
  quality: QualityLevel,
  floorParent: THREE.Object3D,
  floorY: number,
): Studio {
  let storyProgress = 0;
  const transition = new StudioTransition(storyLook(theme, storyProgress));

  // Background: base colour with a soft glow from the lower left, painted on a small canvas.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const background = new THREE.CanvasTexture(canvas);
  background.colorSpace = THREE.SRGBColorSpace;
  scene.background = background;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x1f2a2e, 1);
  const key = new THREE.DirectionalLight(0xffffff, 1);
  key.position.set(-70, 95, 60);
  // The key light shades the printer's parts on each other; the floor gets the soft contact shadow.
  key.castShadow = quality > 0;
  key.shadow.mapSize.set(quality === 2 ? 2048 : 1024, quality === 2 ? 2048 : 1024);
  Object.assign(key.shadow.camera, { left: -55, right: 55, top: 70, bottom: -40, near: 10, far: 300 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 6;
  const rim = new THREE.DirectionalLight(0xffffff, 1);
  rim.position.set(80, 50, -90);
  scene.add(hemi, key, rim);

  let envTexture: THREE.Texture | null = null;
  if (quality > 0) {
    envTexture = lightformerEnvironment(renderer);
    scene.environment = envTexture;
  }

  // Contact shadow: the scene seen from below the floor as a depth silhouette,
  // blurred twice and laid on the floor (after the three.js contact shadow example).
  const SIZE = 160;
  const shadowResolution = quality === 0 ? 256 : 512;
  const shadowGroup = new THREE.Group();
  shadowGroup.position.y = floorY + 0.03;
  floorParent.add(shadowGroup);
  const shadowTarget = new THREE.WebGLRenderTarget(shadowResolution, shadowResolution);
  const blurTarget = new THREE.WebGLRenderTarget(shadowResolution, shadowResolution);
  shadowTarget.texture.generateMipmaps = blurTarget.texture.generateMipmaps = false;
  const planeGeometry = new THREE.PlaneGeometry(SIZE, SIZE).rotateX(Math.PI / 2);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTarget.texture, transparent: true, depthWrite: false });
  const shadowPlane = new THREE.Mesh(planeGeometry, shadowMaterial);
  shadowPlane.renderOrder = 1;
  shadowPlane.scale.y = -1;
  shadowGroup.add(shadowPlane);
  const blurPlane = new THREE.Mesh(planeGeometry);
  blurPlane.visible = false;
  shadowGroup.add(blurPlane);
  const shadowCamera = new THREE.OrthographicCamera(-SIZE / 2, SIZE / 2, SIZE / 2, -SIZE / 2, 0, 70);
  shadowCamera.rotation.x = Math.PI / 2;
  shadowGroup.add(shadowCamera);
  const depthMaterial = new THREE.MeshDepthMaterial();
  depthMaterial.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );",
      "gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * 1.6 );",
    );
  };
  depthMaterial.depthTest = depthMaterial.depthWrite = false;
  const horizontalBlur = new THREE.ShaderMaterial(HorizontalBlurShader);
  const verticalBlur = new THREE.ShaderMaterial(VerticalBlurShader);
  horizontalBlur.depthTest = verticalBlur.depthTest = false;

  function blurShadow(amount: number) {
    blurPlane.visible = true;
    blurPlane.material = horizontalBlur;
    horizontalBlur.uniforms.tDiffuse.value = shadowTarget.texture;
    horizontalBlur.uniforms.h.value = amount / 256;
    renderer.setRenderTarget(blurTarget);
    renderer.render(blurPlane, shadowCamera);
    blurPlane.material = verticalBlur;
    verticalBlur.uniforms.tDiffuse.value = blurTarget.texture;
    verticalBlur.uniforms.v.value = amount / 256;
    renderer.setRenderTarget(shadowTarget);
    renderer.render(blurPlane, shadowCamera);
    blurPlane.visible = false;
  }

  // Glossy floor that reflects the printer faintly, at full quality only.
  let reflector: Reflector | null = null;
  if (quality === 2) {
    reflector = new Reflector(new THREE.PlaneGeometry(SIZE * 1.4, SIZE * 1.4), {
      textureWidth: 1024,
      textureHeight: 1024,
      clipBias: 0.003,
      shader: FloorReflectionShader,
      multisample: 0,
    });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = floorY + 0.01;
    reflector.layers.set(FLOOR_LAYER);
    const material = reflector.material as THREE.ShaderMaterial;
    material.transparent = true;
    material.depthWrite = false;
    floorParent.add(reflector);
  }

  // Wooden table for the morning: grain painted on a canvas.
  const woodCanvas = document.createElement("canvas");
  woodCanvas.width = 512;
  woodCanvas.height = 256;
  const wood = woodCanvas.getContext("2d")!;
  wood.fillStyle = "#b68859";
  wood.fillRect(0, 0, 512, 256);
  let seed = 3;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 160; i++) {
    const y = random() * 256;
    wood.strokeStyle = `rgba(${random() < 0.5 ? "92,58,30" : "214,170,120"}, ${0.12 + random() * 0.18})`;
    wood.lineWidth = 0.6 + random() * 2.2;
    wood.beginPath();
    wood.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) wood.lineTo(x, y + Math.sin(x * 0.012 + i) * 4 + (random() - 0.5) * 2);
    wood.stroke();
  }
  const woodTexture = new THREE.CanvasTexture(woodCanvas);
  woodTexture.colorSpace = THREE.SRGBColorSpace;
  woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(2, 1);
  const tableGeometry = new THREE.BoxGeometry(260, 3, 150);
  const tableMaterial = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.55, metalness: 0, transparent: true, opacity: 0 });
  const table = new THREE.Mesh(tableGeometry, tableMaterial);
  table.position.set(24, floorY - 1.52, 8);
  table.receiveShadow = true;
  table.visible = false;
  floorParent.add(table);

  // Sunlight through a window: a warm spot light whose cookie is a window frame.
  const windowCanvas = document.createElement("canvas");
  windowCanvas.width = windowCanvas.height = 256;
  const pane = windowCanvas.getContext("2d")!;
  /** Leaves of a plant on the windowsill: x, y, length, angle and how freely each one moves. */
  // Strung along a branch that crosses the lower left half of the window.
  const LEAVES: [number, number, number, number, number][] = Array.from({ length: 30 }, (_, i) => {
    const t = i / 29;
    const side = i % 2 ? 1 : -1;
    return [
      8 + t * 170 + side * (10 + ((i * 7) % 9)),
      250 - t * 150 + side * (12 + ((i * 5) % 11)),
      26 + ((i * 11) % 13),
      -0.6 + side * 0.9 + ((i * 3) % 7) * 0.08,
      0.5 + ((i * 3) % 5) * 0.15,
    ];
  });
  /**
   * The window's light as the sun's cookie: four panes with soft edges, a
   * plant's leaves along one side that sway with time and lean with the
   * wind, and a gentle falloff, as sunlight falls through glass.
   */
  function paintWindow(time: number, wind: number) {
    pane.filter = "none";
    pane.fillStyle = "#000000";
    pane.fillRect(0, 0, 256, 256);
    pane.filter = "blur(6px)";
    pane.fillStyle = "#ffffff";
    for (const [x, y] of [[26, 26], [146, 26], [26, 146], [146, 146]]) pane.fillRect(x, y, 84, 84);
    pane.filter = "blur(8px)";
    pane.fillStyle = "#000000";
    // The stem they grow from, bending a little with the wind.
    pane.strokeStyle = "#000000";
    pane.lineWidth = 5;
    pane.beginPath();
    pane.moveTo(0, 256);
    pane.quadraticCurveTo(90 + wind * 18, 200, 180 + wind * 26 + Math.sin(time * 0.7) * 4, 96);
    pane.stroke();
    for (const [x, y, length, angle, give] of LEAVES) {
      const sway = Math.sin(time * 1.25 + x * 0.09 + y * 0.05) * 0.22 * give + wind * 0.45 * give;
      const lean = (252 - y) / 140;
      pane.save();
      pane.translate(x + wind * 22 * lean + Math.sin(time * 0.8 + y) * 2.5 * give, y);
      pane.rotate(angle + sway);
      pane.beginPath();
      pane.ellipse(length * 0.5, 0, length * 0.55, length * 0.24, 0, 0, Math.PI * 2);
      pane.fill();
      pane.restore();
    }
    pane.filter = "none";
    const falloff = pane.createRadialGradient(128, 128, 40, 128, 128, 180);
    falloff.addColorStop(0, "rgba(0,0,0,0)");
    falloff.addColorStop(1, "rgba(0,0,0,0.6)");
    pane.fillStyle = falloff;
    pane.fillRect(0, 0, 256, 256);
  }
  paintWindow(0, 0);
  const windowTexture = new THREE.CanvasTexture(windowCanvas);
  const sun = new THREE.SpotLight(0xffd29a, 0, 0, 0.42, 0.35, 2);
  sun.map = windowTexture;
  sun.castShadow = quality > 0;
  sun.shadow.mapSize.set(2048, 2048);
  // Soft-edged shadows, like sunlight through a window.
  sun.shadow.radius = 6;
  sun.shadow.bias = -0.0005;
  sun.visible = false;
  floorParent.add(sun, sun.target);
  let spread = 0;
  let leafTime = 0;
  let leafWind = 0;

  let currentTheme = theme;
  function apply(v: StudioValues) {
    const c = canvas.getContext("2d")!;
    c.fillStyle = hex(v.background);
    c.fillRect(0, 0, 256, 256);
    const g = c.createRadialGradient(20, 236, 0, 20, 236, 230);
    g.addColorStop(0, hex(v.glow));
    g.addColorStop(1, hex(v.background));
    c.globalAlpha = v.glowStrength;
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
    c.globalAlpha = 1;
    background.needsUpdate = true;

    key.color.setHex(v.key);
    key.intensity = v.keyIntensity;
    rim.color.setHex(v.rim);
    rim.intensity = v.rimIntensity;
    hemi.intensity = v.fill;
    scene.environmentIntensity = v.env;
    shadowMaterial.opacity = v.shadow;
  }
  apply(transition.current);
  function applyReflection() {
    if (reflector) (reflector.material as THREE.ShaderMaterial).uniforms.opacity.value = REFLECTION[currentTheme];
  }
  applyReflection();

  // Repaint only while a theme change is under way; scrolling frames skip it.
  let changing = false;

  return {
    setTheme(next) {
      currentTheme = next;
      applyReflection();
      transition.start(storyLook(next, storyProgress));
      changing = true;
    },
    setStory(progress) {
      if (Math.abs(progress - storyProgress) < 0.0005) return;
      storyProgress = progress;
      // During a theme change the transition paints; it picks up the new point when it ends.
      if (changing) return;
      transition.start(storyLook(currentTheme, progress));
      transition.step(Infinity);
      apply(transition.current);
    },
    update(dtSeconds) {
      if (!changing) return false;
      changing = transition.step(dtSeconds * 1000);
      apply(transition.current);
      return changing;
    },
    setMorning(amount, target, sunlight = amount) {
      table.visible = sun.visible = amount > 0;
      tableMaterial.opacity = amount;
      const opaque = amount >= 1;
      if (tableMaterial.transparent === opaque) {
        tableMaterial.transparent = !opaque;
        tableMaterial.depthWrite = opaque;
        tableMaterial.needsUpdate = true;
      }
      // From further away the light keeps its strength on the desk.
      sun.intensity = sunlight * 70000 * (1 + spread * 0.9) ** 2;
      sun.visible = sunlight > 0;
      floorParent.worldToLocal(sun.target.position.copy(target));
      const far = 1 + spread * 0.9;
      sun.position.set(sun.target.position.x - 55 * far, sun.target.position.y + 70 * far, sun.target.position.z - 45 * far);
      sun.angle = 0.42 + spread * 0.3;
      sun.penumbra = 0.35 + spread * 0.3;
    },
    setSunSpread(next) {
      spread = next;
    },
    setLeaves(time, wind) {
      if (Math.abs(time - leafTime) < 1e-3 && Math.abs(wind - leafWind) < 1e-3) return;
      leafTime = time;
      leafWind = wind;
      paintWindow(time, wind);
      windowTexture.needsUpdate = true;
    },
    setReflection(enabled) {
      if (reflector) reflector.visible = enabled;
    },
    renderShadow(hidden) {
      const previousBackground = scene.background;
      const previousTarget = renderer.getRenderTarget();
      const clearAlpha = renderer.getClearAlpha();
      scene.background = null;
      shadowPlane.visible = false;
      const wasVisible = hidden.map((o) => o.visible);
      hidden.forEach((o) => (o.visible = false));
      scene.overrideMaterial = depthMaterial;
      renderer.setClearAlpha(0);
      renderer.setRenderTarget(shadowTarget);
      renderer.clear();
      renderer.render(scene, shadowCamera);
      scene.overrideMaterial = null;
      blurShadow(1.2);
      blurShadow(0.5);
      hidden.forEach((o, i) => (o.visible = wasVisible[i]));
      shadowPlane.visible = true;
      scene.background = previousBackground;
      renderer.setClearAlpha(clearAlpha);
      renderer.setRenderTarget(previousTarget);
    },
    dispose() {
      background.dispose();
      envTexture?.dispose();
      key.shadow.map?.dispose();
      shadowTarget.dispose();
      blurTarget.dispose();
      planeGeometry.dispose();
      shadowMaterial.dispose();
      depthMaterial.dispose();
      horizontalBlur.dispose();
      verticalBlur.dispose();
      if (reflector) {
        reflector.geometry.dispose();
        reflector.dispose();
      }
      woodTexture.dispose();
      tableGeometry.dispose();
      tableMaterial.dispose();
      windowTexture.dispose();
      sun.shadow.map?.dispose();
    },
  };
}
