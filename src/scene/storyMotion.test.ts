import assert from "node:assert/strict";
import { test } from "node:test";
import { LAYERS, LAYER_HEIGHT, MUG_RADIUS, heroLooks, labelOpacity, nozzlePath, printProgress, endingMotion, revealMotion, slicerProgress, slicerPanel, screenZoom } from "./storyMotion.ts";
import { at } from "./timeline.ts";

test("labels appear once the printer is more than half apart", () => {
  assert.equal(labelOpacity(0), 0);
  assert.equal(labelOpacity(0.5), 0);
  assert.equal(labelOpacity(0.8), 1);
  assert.ok(labelOpacity(0.65) > 0 && labelOpacity(0.65) < 1);
});

test("printing starts after the printer is back together and finishes before the scene ends", () => {
  assert.equal(printProgress(at("print", 0.1)), 0);
  assert.equal(printProgress(at("print", 0.97)), 1);
  assert.ok(printProgress(at("print", 0.65)) > 0 && printProgress(at("print", 0.65)) < 1);
});

test("the camera moves in to the screen for slicing, then pulls back as the toolpaths and the print begin", () => {
  const inPrint = (t: number) => at("print", t);
  assert.equal(screenZoom(inPrint(0.1)), 0);
  assert.equal(screenZoom(inPrint(0.3)), 1);
  assert.equal(slicerPanel(inPrint(0.3)), 1);
  assert.equal(slicerPanel(inPrint(0.45)), 0);
  assert.equal(slicerProgress(inPrint(0.39)), 0);
  assert.equal(slicerProgress(inPrint(0.49)), 1);
  assert.equal(screenZoom(inPrint(0.5)), 0);
  assert.equal(printProgress(inPrint(0.47)), 0);
  assert.ok(printProgress(inPrint(0.6)) > 0);
});

test("the nozzle starts on the first layer and ends on the last", () => {
  const start = nozzlePath(0);
  const end = nozzlePath(1);
  assert.equal(start.layer, 0);
  assert.equal(end.layer, LAYERS);
  assert.ok(Math.abs(start.y - LAYER_HEIGHT) < 1e-9);
  assert.ok(Math.abs(end.y - LAYERS * LAYER_HEIGHT) < 1e-9);
});

test("the nozzle traces the mug wall and only rises", () => {
  let lastY = -Infinity;
  for (let i = 0; i <= 200; i++) {
    const p = nozzlePath(i / 200);
    assert.ok(Math.abs(Math.hypot(p.x, p.z) - MUG_RADIUS) < 1e-9);
    assert.ok(p.y >= lastY);
    lastY = p.y;
  }
});

test("when the mug takes over, the head lifts first, then the mug rises and turns once while the line glows", () => {
  const start = revealMotion(0);
  const early = revealMotion(0.15);
  const middle = revealMotion(0.6);
  const end = revealMotion(1);
  assert.deepEqual(start, { lift: 0, rise: 0, turn: 0, type: 0, reach: 0, grip: 0 });
  assert.ok(early.lift > early.rise && early.type === 0);
  assert.ok(middle.rise === 1 && middle.type === 1);
  assert.ok(Math.abs(end.turn - Math.PI * 2) < 1e-9 && end.type === 0);
});

test("a hand reaches for the mug once it has stopped turning, holds it, and lets go before the scene ends", () => {
  assert.equal(revealMotion(0.5).reach, 0);
  assert.ok(Math.abs(revealMotion(0.6).turn - Math.PI * 2) < 1e-9, "the mug has stopped turning");
  const holding = revealMotion(0.8);
  assert.equal(holding.reach, 1);
  assert.equal(holding.grip, 1);
  assert.ok(revealMotion(0.7).grip < 1, "the fingers close after the hand arrives");
  const end = revealMotion(1);
  assert.equal(end.reach, 0);
  assert.equal(end.grip, 0);
});

test("in the last scene the mug reaches the table before coffee is poured and steam rises", () => {
  const early = endingMotion(0.1);
  const landed = endingMotion(0.56);
  const end = endingMotion(1);
  assert.ok(early.travel > 0 && early.travel < 1 && early.pour === 0);
  assert.ok(landed.travel === 1 && landed.pour > 0 && landed.steam === 0);
  assert.deepEqual(end, { travel: 1, bounce: 0, pour: 1, steam: 1 });
  assert.ok(endingMotion(0.6).bounce > 0);
});

test("the four looks at the mug each show inside their own scene", () => {
  const before = heroLooks(at("reveal", 0.9));
  const after = heroLooks(at("use", 0.2));
  for (const looks of [before, after]) {
    assert.equal(looks.thermal + looks.plan + looks.macro + looks.material + looks.hero, 0);
  }
  assert.equal(heroLooks(at("heat", 0.5)).thermal, 1);
  assert.equal(heroLooks(at("plan", 0)).gather, 0);
  assert.equal(heroLooks(at("plan", 0.8)).gather, 1);
  assert.equal(heroLooks(at("layers", 0)).macro, 0);
  assert.equal(heroLooks(at("layers", 0.5)).macro, 1);
  assert.equal(heroLooks(at("layers", 1)).macro, 0);
  assert.equal(heroLooks(at("material", 0.5)).material, 1);
  assert.equal(heroLooks(at("plan", 0.5)).hero, 1);
});
