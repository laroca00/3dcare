// While the visitor touches the freshly printed mug (or a hand holds it), the
// whole background lights up: colour washes in from the edges of the frame,
// its hue slowly running through the spectrum, with a large soft light
// drifting round the picture (after the "glowing shadow" effect). It is a
// backdrop: it stands behind the giant line, filling the view, so the mug,
// the hand and the line all stay in front of it, and the middle is left
// darker so they read clearly.
import * as THREE from "three";
import type { Theme } from "../theme/theme";
import { TYPE_LAYER } from "./giantType";

export interface MugGlow {
  object: THREE.Mesh;
  /** Places it `behind` cm beyond `center` as seen from the camera, filling the view; amount 0..1, time in seconds. */
  update(camera: THREE.PerspectiveCamera, center: THREE.Vector3, behind: number, amount: number, time: number): void;
  setTheme(theme: Theme): void;
  dispose(): void;
}

export function createMugGlow(theme: Theme): MugGlow {
  const material = new THREE.ShaderMaterial({
    uniforms: { amount: { value: 0 }, time: { value: 0 }, light: { value: 0 }, aspect: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float amount;
      uniform float time;
      uniform float light;
      uniform float aspect;
      varying vec2 vUv;
      vec3 hue(float h) {
        vec3 k = vec3(0.0, 2.0 / 3.0, 1.0 / 3.0);
        return clamp(abs(fract(h + k) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
      }
      void main() {
        vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
        float h = time / 8.0;
        // Colour rises towards the edges of the frame; the middle stays clear.
        float edge = smoothstep(0.18, 0.75, length(p * vec2(0.8, 1.15)));
        // A large soft light drifts round the picture once every nine seconds.
        float a = time * 6.2831853 / 9.0;
        vec2 c = vec2(cos(a) * 0.55 * aspect, sin(a) * 0.32);
        float spot = exp(-dot(p - c, p - c) * 3.2);
        // Two hues a third of the wheel apart, mixed across the frame.
        vec3 tint = mix(hue(h), hue(h + 0.33), 0.5 + 0.5 * sin(atan(p.y, p.x) + time * 0.4));
        float strength = clamp(edge * 0.75 + spot * 0.65, 0.0, 1.0) * amount;
        gl_FragColor = light > 0.5
          ? vec4(mix(vec3(1.0), tint, 0.55), strength * 0.55)
          : vec4(tint * strength * 0.9, strength);
      }`,
    // Kept in the opaque list, so that with its low render order it is drawn
    // right after the background, before the giant line and everything else.
    transparent: false,
    blending: THREE.CustomBlending,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  function applyTheme(next: Theme) {
    material.uniforms.light.value = next === "light" ? 1 : 0;
    // Added to the dark, laid over the light.
    material.blendSrc = THREE.SrcAlphaFactor;
    material.blendDst = next === "light" ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor;
    material.needsUpdate = true;
  }
  applyTheme(theme);

  const object = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  object.renderOrder = -150;
  object.layers.set(TYPE_LAYER);
  object.frustumCulled = false;
  object.visible = false;

  const toCenter = new THREE.Vector3();
  return {
    object,
    update(camera, center, behind, amount, time) {
      object.visible = amount > 0.001;
      if (!object.visible) return;
      toCenter.copy(center).sub(camera.position).normalize();
      object.position.copy(center).addScaledVector(toCenter, behind);
      const distance = object.position.distanceTo(camera.position);
      const height = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.15;
      object.scale.set(height * camera.aspect, height, 1);
      object.quaternion.copy(camera.quaternion);
      material.uniforms.amount.value = amount;
      material.uniforms.time.value = time;
      material.uniforms.aspect.value = camera.aspect;
    },
    setTheme: applyTheme,
    dispose() {
      object.geometry.dispose();
      material.dispose();
    },
  };
}
