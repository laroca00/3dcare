# Home story, Phase 2: four looks at the freshly printed mug

Date: 2026-10-20 · Status: approved by the user

## Intent and the why

The home story (src/components/HomeStory.tsx, src/scene/) is being reshaped
after oryzo.ai: one hero object that changes with every scroll step. Phase 1
(committed, not pushed) gave it an opening desk, a hand-over from the printer
to the mug in front of a giant glowing line, an edge glow when the mug is
touched, chapters, a progress bar and a scroll hint.

Phase 2 adds four short scenes between the hand-over ("Az önce basıldı") and
the morning table. The user's one requirement: **the mug is the main
character.** Every new scene is a different way of looking at the same mug,
centred on screen. What the visitor should take away is the mug.

## The four scenes, in order

Story order after this change:
draw → meet → explode → print → reveal → **heat → plan → layers → material** → use.

1. **heat (thermal view).** The image switches to thermal-camera colours
   (dark violet → red → yellow → near white). The mug has just come off the
   bed: its base is still hot and the colour cools upwards, layer by layer,
   and fades as the visitor scrolls. No coffee in this scene (the coffee
   stays a surprise on the morning table). User's decision: the heat comes
   from the print, not from coffee.
2. **plan (drawing → wordmark).** The mug turns into a white-line technical
   drawing with dimension arrows and diameters (its real size: 8 cm
   diameter (MUG_RADIUS 4), 30 layers of 0.3 mm). The drawing's
   construction circles slide and gather into the letters "3D CARE". The
   point: every model is an open file whose measurements anyone can see.
3. **layers (macro).** The camera moves very close to the mug's wall until
   the 30 layer lines fill the view, with a small "0,3 mm" scale mark. The
   point: it was built up layer by layer.
4. **material.** The stage turns cream, soft leaf shadows drift across it,
   the mug stands in the middle. Text in the honest "we are trying it" tone
   the user approved (see the facts below).

Then the existing morning table (use) and the closing follow unchanged.

## Facts the text must stick to

Source: the project application KA220-ADU-3587EFB3 (PDF in the repo root).

- No single filament is fixed. The budget uses average consumption of
  PLA/PETG/TPU per prototype (Activity 3.1).
- Srednja škola Ludbreg (Croatia) and Gölcük Vocational and Technical
  Anatolian High School (Türkiye) **explore** biodegradable and recycled
  filaments and use energy-efficient print settings (green practices, p. 36).
- WP3 produces a materials and sustainability matrix that includes green
  options. KORYS (Lithuania) looks at reusing and repurposing old prototypes.
- The mug is printed in **PETG** (the slicer already says so) and stays PETG:
  PLA softens at about 60 °C and does not suit a coffee mug.

So the material scene must never claim the mug, or the project's models,
are made of plant-based PLA. Approved direction for its text: "PETG for
coffee; the schools are trying plant-based and recycled filaments; old
prototypes are reused." The heat scene must not state print temperatures
as measured facts unless they match the slicer settings shown earlier.

## Goals

- Four new scenes, each with a title and a short text in Turkish and
  English (src/i18n/tr.ts, en.ts), as real HTML like the existing beats.
- The mug stays centred and recognisable in all four.
- Still frames for each new scene (reduced motion, no WebGL), in both
  themes, rendered by scripts/render-stills.mjs, with alt texts.
- Light and dark theme both work.

## Non-goals

- No photos. Everything is drawn in the existing three.js scene. (The
  user's AI photos and the 3D hand belong to other work.)
- No coffee before the morning table.
- No change to the scenes before "reveal" or after "use", except where the
  timeline has to make room.
- Phase 3 (gallery, mug chooser, giant-wordmark footer) is not part of this.

## Anti-goals (would make it a failure even if it works)

- Any claim the application does not support, especially about materials.
- Copying oryzo's text, jokes, images or brand. Take the techniques only.
- The mug losing its place as the hero: a scene where the visitor watches
  an effect instead of the mug.
- Text and 3D overlapping on phones (Phase 1 had to fix this for the desk).

## Constraints

- three.js chunks stay within 200 KB gzip (`npm run check:budget`; now
  158.6 KB). New effects should be shaders and geometry, not new libraries
  or large assets.
- Keep the existing patterns: scenes in src/scene/timeline.ts, motion
  helpers in storyMotion.ts with node:test tests, scene modules like
  giantType.ts/desk.ts, one beat per scene in HomeStory.tsx.
- Update timeline.test.ts, render-stills MOMENTS and stillAlt, the step
  mapping in HomeStory (STEP_STARTS), and add a CHANGELOG entry.
- Commits: no AI attribution, no Co-Authored-By lines (repo rule).
- Work stays local; pushing waits for the user.

## Decided by the user

- The mug is the hero of all four scenes.
- The order and content above ("nothing wrong or missing").
- Heat from the fresh print (option A), not from coffee.
- The material scene in the honest "being tried" tone.
- **Real scale for layers.** The 3D mug is about 9 cm tall; printed at
  0.3 mm that is about 300 layers, not 30. Fix every text that says
  "30 layers"/"otuz katman" (reveal text, slicer details, souvenir card) to
  "0.3 mm layers, about 300". From a distance the mug keeps its 30 drawn
  bands (they read as texture); the layers close-up shows true 0.3 mm
  ridges at real scale (fine-ridge surface detail and its own camera path).
  The plan drawing labels the mug's real height and diameter.
- The extruder card's "around 200 °C" becomes "200–250 °C" (covers PLA and
  PETG). The heat scene itself shows no temperature numbers.

## My calls (the user can override)

- Scene ids: heat, plan, layers, material.
- The four new scenes belong to chapter 2, "Tasarla ve bas"; chapter 3
  still starts at the morning table.
- The timeline is redistributed so each scene's share roughly matches its
  beat's scroll height; new scenes may be shorter than the old ones.
- The giant line from "reveal" fades before the heat scene starts.
- Material scene: cream with leaf shadows in the light theme; in the dark
  theme a warm dark version of the same (no bright flash for dark-mode
  visitors). Dark stills stay dark.
- Heat scene shows no temperature numbers (the slicer shows none).
- Plan scene: the mug's outline drawing stays in the centre; only the extra
  construction circles move off to form "3D CARE", so the mug never turns
  into the wordmark.

## Left to the builder

Exact shaders, camera paths, colours within the brand palette, timings,
text wording (within the facts above), and how the drawing's circles form
the letters.
