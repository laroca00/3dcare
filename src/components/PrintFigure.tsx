/**
 * A mug with a large handle drawn as print layers, the way a slicer preview
 * shows a part mid-print: printed layers, the current layer, and layers to come.
 */
const BODY_LAYERS = 11;
const LAYER_GAP = 12;
const BASE_Y = 212;

function handleSegment(y: number) {
  if (y === 188 || y === 104) return [206, 244];
  if (y === 176 || y === 116) return [232, 254];
  if (y < 188 && y > 104) return [242, 258];
  return null;
}

export function PrintFigure({ label }: { label: string }) {
  const printed = Array.from({ length: BODY_LAYERS }, (_, i) => BASE_Y - i * LAYER_GAP);
  const current = BASE_Y - BODY_LAYERS * LAYER_GAP;
  const upcoming = [current - LAYER_GAP, current - 2 * LAYER_GAP];

  return (
    <svg viewBox="0 0 320 240" role="img" aria-label={label} className="print-figure">
      <g fill="none" strokeLinecap="round" strokeWidth="7">
        <g stroke="var(--ink)">
          {printed.map((y) => (
            <path key={y} d={`M70 ${y} H200`} />
          ))}
        </g>
        <g stroke="var(--teal)">
          {printed.map((y) => {
            const seg = handleSegment(y);
            return seg ? <path key={y} d={`M${seg[0]} ${y} H${seg[1]}`} /> : null;
          })}
        </g>
        <path d={`M70 ${current} H200`} stroke="var(--layer)" />
        <g stroke="var(--plate)">
          {upcoming.map((y) => (
            <path key={y} d={`M70 ${y} H200`} />
          ))}
        </g>
      </g>
      <path d="M40 226 H280" stroke="var(--plate)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
