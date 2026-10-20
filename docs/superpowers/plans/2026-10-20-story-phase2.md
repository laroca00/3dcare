# Home story Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Four new scenes (heat, plan, layers, material) between the mug's reveal and the morning table, with the mug as the hero of each.

**Architecture:** The timeline gains four scene ids; everything else keys off `localProgress`, so absolute progress numbers (light moods, chapter starts, still moments) are rewritten in scene-relative form with a new `at(id, t)` helper. The thermal look and the true-scale layer ridges are shader injections into the mug's existing filament material (`onBeforeCompile`), so the mug never swaps models. The plan drawing, the wordmark circles, the 0.3 mm scale mark and the leaf shadows are HTML/SVG overlays positioned from a per-frame callback, like the opening selection box.

**Tech Stack:** three.js (existing), React/Next (existing), node:test.

**Spec:** docs/superpowers/specs/2026-10-20-story-phase2-design.md

## Global Constraints

- No claim the application does not support; mug stays PETG; no temperature numbers in the heat scene.
- 3D chunks ≤ 200 KB gzip (`npm run check:budget`).
- Real text in HTML for every new scene (tr + en); still frames + alt texts for each.
- Mug measurements (from printJob.ts): wall Ø 8.4 cm, height 9 cm, 15.6 cm across the handles; 0.3 mm layers ≈ 300.
- No AI attribution or Co-Authored-By in commits; no push.

## Review Focus

- Phones (≈390×844): text and mug/overlays must not collide badly — check screenshots at heat, plan, layers, material.
- Ridges must not moiré at normal distance — fade by screen-space derivative, only on in the layers scene.
- Theme switch mid-scene: overlays follow CSS tokens; thermal/material moods exist for both themes.
- Reduced motion / no WebGL: four new stills render and the leaf drift does not animate.
- The giant line, edge glow and souvenir CTA keep working at their old scenes.

---

### Task 1: Timeline, moods, chapter and still moments

**Files:** Modify `src/scene/timeline.ts`, `src/scene/timeline.test.ts`, `src/scene/lightArc.ts`, `src/scene/lightArc.test.ts`, `src/components/HomeStory.tsx` (STEP_STARTS), `scripts/render-stills.mjs` (MOMENTS).

**Interfaces:** Produces `SceneId` with `"heat" | "plan" | "layers" | "material"`; `at(id: SceneId, t: number): number` (absolute progress of local t). Moods `"thermal" | "material"` added to `Mood`.

- [ ] Test: ids in order draw, meet, explode, print, reveal, heat, plan, layers, material, use; `at("meet", 0) === SCENES[1].start`; `localProgress(at("plan", 0.5), "plan") ≈ 0.5`.
- [ ] Boundaries: 0, .095, .21, .33, .465, .56, .64, .72, .80, .885, 1.
- [ ] Rewrite KEYS, STEP_STARTS (step 3 at `at("use", 0.09)`), MOMENTS via `at()`; MOMENTS gain one moment per new scene; render-stills imports `../src/scene/timeline.ts`.
- [ ] `npm test` passes.

### Task 2: Copy

**Files:** `src/i18n/tr.ts`, `src/i18n/en.ts`.

- [ ] Four scenes inserted after "Az önce basıldı"; four stillAlt entries.
- [ ] "otuz katman"/"30 katman" → 0.3 mm, about 300 layers (reveal text, slicer details, souvenir details); extruder "200 °C" → "200–250 °C".

### Task 3: Mug in the hero scenes (motion + shaders)

**Files:** Create `src/scene/heroLooks.ts` (+ test); modify `src/scene/printJob.ts`, `src/scene/runScene.ts`.

**Interfaces:** `heroLooks(p: number): { thermal: number; cool: number; plan: number; gather: number; macro: number; material: number; side: number }` (all 0..1). PrintJob gains `setLooks(thermal: number, cool: number, ridges: number)`. SceneOptions gains `onMug?(frame: MugFrame | null)` where `MugFrame = { origin: [x, y], ex: [x, y], ey: [x, y], opacity: number, scale?: { x: number; y0: number; y1: number } }` — mug-plane cm → canvas px (origin = mug base centre, ex/ey = px per cm along the camera-facing right/up axes).

- [ ] Test heroLooks: zero before heat and after material; thermal peaks inside heat; gather reaches 1 before plan ends; macro 0 at layers start and end.
- [ ] Thermal: ironbow palette mixed after lighting; base hot, cooling upward, handles cooler.
- [ ] Ridges: 0.3 mm period on height, faded by `fwidth`; layer gaps closed while ridges show.
- [ ] Camera: wide screens shift the mug right of the text; macro moves to ~4 cm from the wall facing the camera.

### Task 4: Overlays (plan drawing, wordmark circles, scale mark, leaves)

**Files:** Create `src/scene/wordmark.ts` (+ test); modify `src/components/HomeStory.tsx`, `src/app/globals.css`.

**Interfaces:** `wordmarkCircles(): { x: number; y: number; r: number }[]` in cm (letters "3D CARE", width ≈ 20 cm, sitting above the mug from y = 11 cm); `constructionCircles(n: number)` start positions around the mug drawing.

- [ ] Test: same count for both sets; wordmark spans ≈ 20 cm and stays above y = 10.
- [ ] SVG drawing (outline, centre line, dimension lines with Ø 8,4 cm / 9 cm / 15,6 cm) drawn in mug cm and placed with `matrix()` from MugFrame.
- [ ] Scale mark "0,3 mm" spanning one ridge from MugFrame.scale.
- [ ] Leaf shadows: CSS/SVG layer over the stage, `--leaves` from material; multiply in light, soft warm in dark; drift off under reduced motion and stills.

### Task 5: Stills, changelog, verification, commit

- [ ] Build with BASE_PATH=/3dcare (PowerShell), `node scripts/render-stills.mjs`, add new stills to the STILLS import, screenshots wide + narrow per scene in both themes.
- [ ] `npm test`, lint, tsc, `npm run check:budget`.
- [ ] CHANGELOG entry; commit.
