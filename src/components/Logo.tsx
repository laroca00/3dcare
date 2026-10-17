/** The 3D Care mark: three print walls seen from above, forming a C. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <g fill="none" strokeWidth="5.5" strokeLinecap="round">
        <path d="M50.38 13.62 A26 26 0 1 0 50.38 50.38" stroke="currentColor" />
        <path d="M44.73 19.27 A18 18 0 1 0 44.73 44.73" stroke="var(--teal)" />
        <path d="M39.07 24.93 A10 10 0 1 0 39.07 39.07" stroke="var(--violet)" />
      </g>
      <circle cx="32" cy="32" r="3.5" fill="var(--layer)" />
    </svg>
  );
}
