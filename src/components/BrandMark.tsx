/* eslint-disable @next/next/no-img-element */
// Cober Freight logo: a light-blue "C" and navy "F" monogram with a navy
// semi-truck on an orange road — an SVG interpretation of the brand artwork.
//
// The real brand mark, dark-surface-optimized: public/logo-light.png is the
// artwork with its white background made transparent and its navy recolored to
// off-white (see scripts/make-brand-assets.py), so it drops straight onto the
// dark chrome (sidebar, login hero) with no white plate behind it. Set to null
// to fall back to the inline SVG mark.
const LOGO_IMAGE_SRC: string | null = "/logo-light.png";

export function BrandMark({ size = 32, fColor = "#16264A" }: { size?: number; fColor?: string }) {
  if (LOGO_IMAGE_SRC) {
    return <img src={LOGO_IMAGE_SRC} width={size} height={size} alt="Cober Freight" style={{ objectFit: "contain", display: "block" }} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 110 100" fill="none" aria-hidden="true">
      {/* C — light blue, open to the right */}
      <path d="M59.5 20 A33 33 0 1 0 59.5 76" fill="none" stroke="#4B9FE8" strokeWidth="15" strokeLinecap="round" />
      {/* F — navy (or light on dark surfaces) */}
      <path d="M66 20 H94 M66 20 V80 M66 49 H88" fill="none" stroke={fColor} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
      {/* road swoosh — orange */}
      <path d="M14 86 Q46 73 98 84" fill="none" stroke="#E8781E" strokeWidth="8" strokeLinecap="round" />
      {/* motion lines */}
      <g stroke="#EAF3FC" strokeWidth="4.5" strokeLinecap="round">
        <line x1="8" y1="56" x2="24" y2="56" />
        <line x1="4" y1="65" x2="22" y2="65" />
      </g>
      {/* truck: trailer + cab + wheels */}
      <rect x="20" y="46" width="30" height="24" rx="2.5" fill={fColor} />
      <path d="M50 54 H60 L64 61 V70 H50 Z" fill={fColor} />
      <g fill={fColor}>
        <circle cx="29" cy="72" r="6" />
        <circle cx="43" cy="72" r="6" />
        <circle cx="58" cy="72" r="6" />
      </g>
    </svg>
  );
}
