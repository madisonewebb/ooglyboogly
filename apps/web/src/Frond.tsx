import { frond } from './frond';

/**
 * A seaweed frond as a sunprint: filled blades in the current text color, each
 * a little translucent so overlaps print denser, the way pressed algae do.
 * Decoration only.
 */
export function Frond({
  seed,
  depth,
  lean,
  className,
}: {
  seed: number;
  depth?: number;
  lean?: number;
  className?: string;
}) {
  const f = frond(seed, depth, lean);
  return (
    <svg
      className={className}
      viewBox={f.viewBox}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {f.blades.map((b, i) => (
        <path key={i} d={b.d} fillOpacity={b.level === 0 ? 0.95 : 0.82} />
      ))}
    </svg>
  );
}
