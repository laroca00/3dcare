// European flag drawn to the official geometry: 3:2 ratio, twelve stars on a
// circle whose radius is one third of the flag height.
const stars = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * Math.PI) / 6;
  const r = 40 / 3;
  return { x: 30 + r * Math.sin(angle), y: 20 - r * Math.cos(angle) };
});

const starPath = (cx: number, cy: number, r: number) =>
  Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    return `${i === 0 ? "M" : "L"}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ") + "Z";

export function EuFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden="true" focusable="false">
      <rect width="60" height="40" fill="#003399" />
      {stars.map((s, i) => (
        <path key={i} d={starPath(s.x, s.y, 2.22)} fill="#FFCC00" />
      ))}
    </svg>
  );
}
