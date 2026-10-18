// Checks that the 3D scene stays within its budget in the static export:
// the chunks that contain three.js are at most 200 KB gzipped, and none of
// them is loaded up front by the home page.
// Usage: node scripts/check-budget.mjs out
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_KB = 200;
const outDir = process.argv[2] ?? "out";
const chunksDir = join(outDir, "_next", "static", "chunks");

const sceneChunks = readdirSync(chunksDir, { recursive: true })
  .filter((name) => String(name).endsWith(".js"))
  .map((name) => String(name).replaceAll("\\", "/"))
  .filter((name) => readFileSync(join(chunksDir, name), "utf8").includes("WebGLRenderer"));

if (sceneChunks.length === 0) {
  console.error("No chunk contains three.js (WebGLRenderer). Was the site built?");
  process.exit(1);
}

const totalKb = sceneChunks.reduce((sum, name) => sum + gzipSync(readFileSync(join(chunksDir, name))).length, 0) / 1024;
console.log(`3D chunks: ${totalKb.toFixed(1)} KB gzip (budget ${BUDGET_KB} KB) in ${sceneChunks.join(", ")}`);

let failed = totalKb > BUDGET_KB;
for (const lang of ["en", "tr"]) {
  const html = readFileSync(join(outDir, lang, "index.html"), "utf8");
  const eager = sceneChunks.filter((name) => html.includes(name));
  if (eager.length) {
    console.error(`${lang}/index.html loads 3D chunks up front: ${eager.join(", ")}`);
    failed = true;
  }
}

if (failed) process.exit(1);
