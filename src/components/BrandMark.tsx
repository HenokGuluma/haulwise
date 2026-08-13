// Cober Freight "CF" monogram — a light-blue "C" ring interlocked with a
// navy "F", sitting on an orange road swoosh. On dark surfaces (the sidebar)
// pass a light `fColor` so the F stays visible.
export function BrandMark({ size = 32, fColor = "#16264A" }: { size?: number; fColor?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      {/* C — light blue, open to the right */}
      <path d="M65 24 A30 30 0 1 0 65 76" fill="none" stroke="#4B9FE8" strokeWidth="15" strokeLinecap="round" />
      {/* road swoosh — orange */}
      <path d="M20 84 Q49 69 86 82" fill="none" stroke="#E8781E" strokeWidth="7" strokeLinecap="round" />
      {/* F — navy (or light on dark surfaces) */}
      <path d="M59 26 H88 M59 26 V80 M59 50 H82" fill="none" stroke={fColor} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
