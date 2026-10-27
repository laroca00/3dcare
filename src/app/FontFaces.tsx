// Inter, self-hosted from public/fonts. Declared here rather than in CSS so the
// files can be preloaded with the same URLs: the browser fetches them while
// reading the HTML instead of after the stylesheet, which keeps the first
// paint of the headline fast. Instrument Serif, for the story's headings
// further down, is not preloaded: the browser fetches it when it is used.
import { preload } from "react-dom";

const basePath = process.env.BASE_PATH ?? "";

const FILES = {
  latin: {
    file: "inter-latin-wght-normal.woff2",
    serif: "instrument-serif-latin-400-normal.woff2",
    range: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  },
  latinExt: {
    file: "inter-latin-ext-wght-normal.woff2",
    serif: "instrument-serif-latin-ext-400-normal.woff2",
    range: "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
  },
};

const face = (family: string, weight: string, file: string, range: string) =>
  `@font-face{font-family:"${family}";font-style:normal;font-display:swap;font-weight:${weight};src:url("${basePath}/fonts/${file}") format("woff2");unicode-range:${range}}`;

const css = Object.values(FILES)
  .flatMap(({ file, serif, range }) => [face("Inter Variable", "100 900", file, range), face("Instrument Serif", "400", serif, range)])
  .join("");

/** Font declarations and preloads; Turkish pages also need the Latin Extended file. */
export function FontFaces({ extended }: { extended: boolean }) {
  for (const { file } of extended ? [FILES.latin, FILES.latinExt] : [FILES.latin]) {
    preload(`${basePath}/fonts/${file}`, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
