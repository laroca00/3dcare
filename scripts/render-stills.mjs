// Renders the home story's still frames (for visitors with reduced motion or
// without WebGL) from the built site, in both themes, as WebP.
// Usage: npm run build && node scripts/render-stills.mjs
// Needs Microsoft Edge (or set EDGE_PATH to Chrome/Edge). Run it locally:
// headless CI machines have no GPU for WebGL.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import sharp from "sharp";

const OUT = "out";
const BASE = process.env.BASE_PATH ?? "";
const TARGET = "src/assets/story";
const EDGE = process.env.EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
// One representative moment per scene: drawing, studio, exploded with labels, printing, in use.
const MOMENTS = [0.07, 0.26, 0.55, 0.72, 0.97];
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };

const server = createServer((req, res) => {
  let path = decodeURIComponent(req.url.split("?")[0]);
  if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length);
  let file = join(OUT, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;

function capture(url, png) {
  const profile = mkdtempSync(join(tmpdir(), "story-"));
  const args = [
    "--headless=new",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1600,900",
    "--virtual-time-budget=10000",
    `--user-data-dir=${profile}`,
    `--screenshot=${png}`,
    url,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(EDGE, args, { stdio: "ignore" });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`timed out: ${url}`));
    }, 120_000);
    child.on("exit", () => {
      clearTimeout(timer);
      rmSync(profile, { recursive: true, force: true });
      existsSync(png) ? resolve() : reject(new Error(`no screenshot: ${url}`));
    });
  });
}

try {
  for (const theme of ["light", "dark"]) {
    for (const [i, moment] of MOMENTS.entries()) {
      const png = join(tmpdir(), `story-${theme}-${i + 1}.png`);
      await capture(`http://localhost:${port}${BASE}/en/?story=${moment}&theme=${theme}`, png);
      const webp = join(TARGET, `${theme}-${i + 1}.webp`);
      const { size } = await sharp(png).webp({ quality: 78 }).toFile(webp);
      rmSync(png);
      console.log(`${webp}: ${(size / 1024).toFixed(0)} KB`);
    }
  }
} finally {
  server.close();
}
