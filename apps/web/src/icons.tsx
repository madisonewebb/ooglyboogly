/** A few line icons, drawn here so they look the same on every system. */
import type { SVGProps } from 'react';

function Icon({ children, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.35em"
      height="1.35em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const MoonIcon = () => (
  <Icon>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </Icon>
);

export const SunIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <path key={a} d="M12 2.5v2.2" transform={`rotate(${a} 12 12)`} />
    ))}
  </Icon>
);

/** Settings: three sliders. */
export const SlidersIcon = () => (
  <Icon>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2.2" />
    <circle cx="9" cy="17" r="2.2" />
  </Icon>
);

export const SoundIcon = ({ muted }: { muted: boolean }) => (
  <Icon>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" strokeWidth={1.6} />
    {muted ? (
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    ) : (
      <>
        <path d="M15.5 9a4.2 4.2 0 0 1 0 6" />
        <path d="M18.3 6.5a8 8 0 0 1 0 11" />
      </>
    )}
  </Icon>
);

export const CheckIcon = () => (
  <Icon width="1em" height="1em" strokeWidth={3}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const CrownIcon = () => (
  <Icon width="1em" height="1em" strokeWidth={2}>
    <path d="M3.5 8.5 7.5 12 12 5.5l4.5 6.5 4-3.5-2 10h-13z" fill="currentColor" />
  </Icon>
);

/** A coin, for the aquarium shop's money. */
export const CoinIcon = () => (
  <svg className="coin-icon" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="var(--coin)" />
    <circle
      cx="12"
      cy="12"
      r="6.5"
      fill="none"
      stroke="var(--on-coin)"
      strokeOpacity="0.35"
      strokeWidth="1.6"
    />
    <path
      d="M9.5 9.5h5M9.5 14.5h5"
      stroke="var(--on-coin)"
      strokeOpacity="0.45"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

/** A die face with `n` pips, for the pad's Ones to Sixes. */
export function DieGlyph({ n }: { n: number }) {
  const spots: Record<number, [number, number][]> = {
    1: [[12, 12]],
    2: [
      [8, 8],
      [16, 16],
    ],
    3: [
      [7.5, 7.5],
      [12, 12],
      [16.5, 16.5],
    ],
    4: [
      [8, 8],
      [16, 8],
      [8, 16],
      [16, 16],
    ],
    5: [
      [7.5, 7.5],
      [16.5, 7.5],
      [12, 12],
      [7.5, 16.5],
      [16.5, 16.5],
    ],
    6: [
      [8, 7],
      [16, 7],
      [8, 12],
      [16, 12],
      [8, 17],
      [16, 17],
    ],
  };
  return (
    <svg className="die-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      {spots[n]!.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={1.9} />
      ))}
    </svg>
  );
}
