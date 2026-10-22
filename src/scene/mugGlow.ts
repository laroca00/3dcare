// A glow behind the freshly printed mug while the visitor touches it (or a
// hand holds it): a soft wash of colour whose hue slowly runs through the
// spectrum, with a brighter spot circling the mug, after the "glowing
// shadow" effect. It stands just behind the mug, facing the camera, so the
// mug and the hand stay in front of it.
import * as THREE from "three";
import type { Theme } from "../theme/theme";
import { TYPE_LAYER } from "./giantType";

export interface MugGlow {
  object: THREE.Mesh;
  /** Places it `behind` cm beyond `center` as seen from the camera; amount 0..1, time in seconds. */
  update(camera: THREE.Camera, center: THREE.Vector3, behind: number, amount: number, time: number): void;
  setTheme(theme: Theme): void;
  dispose(): void;
}

/** Width of the glow (cm); the mug with its handles is about 16 cm across. */
const SIZE = 46;

export function createMugGlow(theme: Theme): MugGlow {
  const material = new THREE.ShaderMaterial({
    uniforms: { amount: { value: 0 }, time: { value: 0 }, light: { value: theme === "light" ? 1 : 0 } },
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
      varying vec2 vUv;
      vec3 hue(float h) {
        vec3 k = vec3(0.0, 2.0 / 3.0, 1.0 / 3.0);
        return clamp(abs(fract(h + k) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
      }
      void main() {
        vec2 p = vUv - 0.5;
        float d = length(p) * 2.0;
        // The wash: brightest round the mug, fading out softly.
        float wash = pow(clamp(1.0 - d, 0.0, 1.0), 1.6);
        // The spot circles the mug once every four seconds.
        float a = time * 6.2831853 / 4.0;
        vec2 spot = vec2(cos(a), sin(a)) * 0.2;
        float s = exp(-dot(p - spot, p - spot) * 34.0);
        float h = time / 6.0;
        vec3 colour = hue(h) * wash * 0.9 + hue(h + 0.12) * s * 1.1;
        // On light paper the colour is softer and laid over, not added.
        float alpha = clamp(wash * 0.85 + s, 0.0, 1.0) * amount;
        gl_FragColor = light > 0.5 ? vec4(mix(vec3(1.0), hue(h + 0.06), 0.75), alpha * 0.7) : vec4(colour * amount, alpha);
      }`,
    // Kept in the opaque list, so that with its low render order it is drawn
    // before the mug and the hand; custom blending still lets it glow.
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

  const object = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), material);
  // Drawn after the giant line and before everything else.
  object.renderOrder = -50;
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
      object.quaternion.copy(camera.quaternion);
      object.scale.setScalar(0.7 + 0.3 * amount);
      material.uniforms.amount.value = amount;
      material.uniforms.time.value = time;
    },
    setTheme: applyTheme,
    dispose() {
      object.geometry.dispose();
      material.dispose();
    },
  };
}
