/** The little ghost the parade marches, with an optional hat. Flat, outlined in deep plum. */
const INK = '#2A2440';
const BLUSH = '#D98BA6';
const GOLD = '#E8C766';
const SHEET = '#F6F3FB';
const POM = '#9B86E0';
const POM_ROSE = '#D98BA6';
const STROKE = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;

const Cheeks = ({ y, dx, r = 5 }: { y: number; dx: number; r?: number }) => (
  <g fill={BLUSH} opacity={0.75}>
    <circle cx={60 - dx} cy={y} r={r} />
    <circle cx={60 + dx} cy={y} r={r} />
  </g>
);

/** A small ghost for the parade, with an optional hat. */
export function GhostBody({
  hat,
  color = SHEET,
}: {
  hat?: 'witch' | 'bow' | 'party' | undefined;
  color?: string;
}) {
  return (
    <g>
      <path
        d="M22 108 L22 54 Q22 14 60 14 Q98 14 98 54 L98 108 Q89 97 80 108 Q70 119 60 108 Q50 97 40 108 Q31 119 22 108 Z"
        fill={color}
        {...STROKE}
      />
      <ellipse cx="46" cy="54" rx="6" ry="9" fill={INK} />
      <ellipse cx="74" cy="54" rx="6" ry="9" fill={INK} />
      <path d="M51 68 Q60 84 69 68 Z" fill="#4A2A3C" {...STROKE} strokeWidth={2.5} />
      <Cheeks y={68} dx={28} r={5} />
      {hat === 'witch' && (
        <g>
          <path d="M34 22 L62 -6 L86 22 Z" fill="#4D3F69" {...STROKE} transform="translate(0 6)" />
          <path
            d="M24 26 Q60 38 96 26"
            fill="none"
            stroke={INK}
            strokeWidth={5}
            strokeLinecap="round"
            transform="translate(0 6)"
          />
        </g>
      )}
      {hat === 'party' && (
        <g>
          <path
            d="M44 20 L60 -8 L76 20 Z"
            fill={POM_ROSE}
            {...STROKE}
            strokeWidth={2.5}
            transform="translate(0 6)"
          />
          <circle
            cx="60"
            cy="-6"
            r="4"
            fill={GOLD}
            stroke={INK}
            strokeWidth={2}
            transform="translate(0 6)"
          />
        </g>
      )}
      {hat === 'bow' && (
        <g>
          <path
            d="M60 18 L44 8 L44 28 Z M60 18 L76 8 L76 28 Z"
            fill={POM}
            {...STROKE}
            strokeWidth={2.5}
          />
          <circle cx="60" cy="18" r="4" fill={POM} {...STROKE} strokeWidth={2.5} />
        </g>
      )}
    </g>
  );
}
