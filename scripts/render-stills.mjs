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
// The poster (top of the page, frame 0), then one representative moment per
// scene: drawing, studio, exploded with labels, printing, the mug taking over, in use.
const MOMENTS = [0, 0.06, 0.225, 0.465, 0.607, 0.79, 0.975];
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

const profile = mkdtempSync(join(tmpdir(), "story-"));
const edge = spawn(
  EDGE,
  [
    "--headless=new",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1600,900",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Connects to the headless browser's page over the DevTools protocol. */
async function connect() {
  const portFile = join(profile, "DevToolsActivePort");
  for (let i = 0; !existsSync(portFile); i++) {
    if (i > 100) throw new Error("the browser did not start");
    await sleep(100);
  }
  const debugPort = readFileSync(portFile, "utf8").split("\n")[0];
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  const socket = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (!pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  return { send, close: () => socket.close() };
}

/** Opens the frozen frame and screenshots it once the page reports the scene drawn. */
async function capture(page, url) {
  await page.send("Page.navigate", { url });
  const deadline = Date.now() + 120_000;
  for (;;) {
    const { result } = await page.send("Runtime.evaluate", {
      expression: `location.href === ${JSON.stringify(url)} && document.documentElement.dataset.storyReady === "1"`,
    });
    if (result.value) break;
    if (Date.now() > deadline) throw new Error(`timed out: ${url}`);
    await sleep(250);
  }
  const { data } = await page.send("Page.captureScreenshot", { format: "png" });
  return Buffer.from(data, "base64");
}

try {
  const page = await connect();
  for (const theme of ["light", "dark"]) {
    for (const [i, moment] of MOMENTS.entries()) {
      const png = await capture(page, `http://localhost:${port}${BASE}/en/?story=${moment}&theme=${theme}`);
      const webp = join(TARGET, `${theme}-${i}.webp`);
      const { size } = await sharp(png).webp({ quality: 78 }).toFile(webp);
      console.log(`${webp}: ${(size / 1024).toFixed(0)} KB`);
    }
  }
  page.close();
} finally {
  edge.kill();
  server.close();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
}
