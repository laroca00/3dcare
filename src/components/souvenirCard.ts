// The souvenir card at the end of the home story: the mug the visitor printed,
// in their colour, with the 3D Care mark and the EU funding emblem. Portrait
// 1080 × 1350, the size social networks show best.

const W = 1080;
const H = 1350;
const INK = "#15232B";
const PAPER = "#F5F7F6";
const TEAL = "#3cc2b0";

export interface SouvenirText {
  title: string;
  details: string;
  tagline: string;
  url: string;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/** The 3D Care mark (light version, for the dark card), drawn from the logo's own geometry. */
function drawMark(c: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const unit = size / 64;
  c.save();
  c.translate(x, y);
  c.scale(unit, unit);
  c.lineWidth = 5.5;
  c.lineCap = "round";
  const arcs: [number, string][] = [
    [26, PAPER],
    [18, "#00756A"],
    [10, "#5B3FA8"],
  ];
  for (const [r, color] of arcs) {
    c.strokeStyle = color;
    c.beginPath();
    // Opening to the right, like the letter C.
    c.arc(32, 32, r, -Math.PI / 4, Math.PI / 4, true);
    c.stroke();
  }
  c.fillStyle = "#F5C400";
  c.beginPath();
  c.arc(32, 32, 3.5, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function roundedRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

export async function makeSouvenirCard(picture: HTMLCanvasElement, text: SouvenirText, emblemSrc: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily;

  // Dark ink background with a soft teal glow from the lower left, like the site's dark stage.
  c.fillStyle = INK;
  c.fillRect(0, 0, W, H);
  const glow = c.createRadialGradient(0, H, 0, 0, H, 1100);
  glow.addColorStop(0, "rgba(0, 117, 106, 0.55)");
  glow.addColorStop(1, "rgba(0, 117, 106, 0)");
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);

  // Header: the mark and the name.
  drawMark(c, 72, 64, 72);
  c.fillStyle = PAPER;
  c.font = `700 40px ${font}`;
  c.textBaseline = "middle";
  c.fillText("3D Care", 160, 101);

  // The mug, as the visitor left it on the table.
  const size = 936;
  const top = 168;
  c.save();
  roundedRect(c, 72, top, size, size, 36);
  c.clip();
  c.drawImage(picture, 72, top, size, size);
  c.restore();
  c.strokeStyle = "rgba(245, 247, 246, 0.14)";
  c.lineWidth = 2;
  roundedRect(c, 72, top, size, size, 36);
  c.stroke();

  // Words.
  c.textBaseline = "alphabetic";
  c.fillStyle = PAPER;
  c.font = `700 60px ${font}`;
  c.fillText(text.title, 72, 1172);
  c.fillStyle = TEAL;
  c.font = `600 32px ${font}`;
  c.fillText(text.details, 72, 1222);
  c.fillStyle = "rgba(245, 247, 246, 0.72)";
  c.font = `400 28px ${font}`;
  c.fillText(text.tagline, 72, 1268);
  c.fillText(text.url, 72, 1306);

  // EU funding emblem, bottom right.
  const emblem = await loadImage(emblemSrc);
  const emblemH = 74;
  const emblemW = (emblem.width / emblem.height) * emblemH;
  c.drawImage(emblem, W - 72 - emblemW, H - 56 - emblemH, emblemW, emblemH);

  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("no card"))), "image/png"));
}
