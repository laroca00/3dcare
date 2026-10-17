/**
 * Placeholder preview drawn as print layers. Each template model gets its own
 * silhouette; real models will replace this with a 3D viewer.
 */
const profiles: Record<string, number[]> = {
  // Straight mug body; the handle is drawn separately below.
  "easy-grip-mug": [60, 60, 60, 60, 60, 60, 60, 60],
  // Long handle, thick at the grip, narrowing to the cutlery slot.
  "cutlery-handle": [22, 30, 36, 38, 38, 36, 30, 22],
  // Layers run top to bottom: narrow striker on top, wide clamp at the base.
  "instrument-adapter": [26, 18, 18, 18, 26, 50, 64, 64],
};

export function ModelPreview({ slug, label, large }: { slug: string; label: string; large?: boolean }) {
  const widths = profiles[slug] ?? profiles["easy-grip-mug"];
  const top = 14;
  const gap = 10;

  return (
    <svg
      viewBox="0 0 120 100"
      role="img"
      aria-label={label}
      className={large ? "model-preview model-preview--large" : "model-preview"}
    >
      <rect width="120" height="100" rx="10" fill="var(--plate-soft)" />
      <g strokeLinecap="round" strokeWidth="5" fill="none">
        {widths.map((w, i) => {
          const y = top + i * gap;
          const x = 60 - w / 2;
          const stroke = i === 0 ? "var(--layer)" : "var(--ink)";
          return <path key={i} d={`M${x} ${y} H${x + w}`} stroke={stroke} />;
        })}
        {slug === "easy-grip-mug" &&
          [3, 4, 5].map((i) => (
            <path key={`h${i}`} d={`M96 ${top + i * gap} H104`} stroke="var(--teal)" />
          ))}
      </g>
    </svg>
  );
}
