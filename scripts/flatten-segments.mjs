// The static export writes segment prefetch payloads as nested folders
// (`__next.$d$lang/models/__PAGE__.txt`), while the client router requests them
// as flat dotted names (`__next.$d$lang.models.__PAGE__.txt`). Static hosts
// cannot rewrite one to the other, so add the flat copies next to the folders.
import { copyFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const outDir = process.argv[2] ?? "out";
let copied = 0;

function filesIn(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesIn(path) : [path];
  });
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!statSync(path).isDirectory()) continue;
    if (name.startsWith("__next.")) {
      for (const file of filesIn(path)) {
        const flat = [name, ...relative(path, file).split(sep)].join(".");
        copyFileSync(file, join(dir, flat));
        copied++;
      }
    } else {
      walk(path);
    }
  }
}

walk(outDir);
console.log(`flatten-segments: ${copied} files`);
