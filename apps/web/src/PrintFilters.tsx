/**
 * The page's one SVG filter: `#coat`, the ragged edge of a cyanotype coating
 * brushed on by hand. Any `.print` surface uses it. Rendered once, invisibly.
 */
export function PrintFilters() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <filter id="coat" x="-4%" y="-12%" width="108%" height="124%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.035 0.08"
          numOctaves="3"
          seed="4"
          result="brush"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="brush"
          scale="10"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
