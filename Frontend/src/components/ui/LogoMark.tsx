// PLACEHOLDER logo: an empty octagon frame, the shape chosen for the Questack
// logo. Swap the contents for the real mark when it's designed; everything
// that shows the logo uses this component.
export default function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      {/* 45 degree corners on half-pixel coordinates, so the 1px outline stays crisp */}
      <polygon
        points="12,0.5 28,0.5 39.5,12 39.5,28 28,39.5 12,39.5 0.5,28 0.5,12"
        strokeWidth={1}
        className="fill-accent-deep stroke-accent"
      />
    </svg>
  );
}
