import { useMemo } from 'react';

/**
 * A burst of small four-point sparkles from the middle of their box: for a
 * Yatzy and for the winner. Decoration only; reduced motion shortens it to
 * nothing.
 */
export function Sparkles({
  colors,
  count = 26,
  spread = 1,
}: {
  colors: string[];
  count?: number;
  /** How far they fly, 1 is about half the box. */
  spread?: number;
}) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + ((i * 7) % 5) * 0.11;
        const reach = (0.55 + ((i * 37) % 45) / 100) * spread;
        return {
          dx: `${Math.cos(angle) * reach * 46}%`,
          dy: `${Math.sin(angle) * reach * 34}%`,
          size: `${0.55 + ((i * 13) % 6) / 10}rem`,
          delay: `${(i % 6) * 55}ms`,
        };
      }),
    [count, spread],
  );
  return (
    <div className="sparkles" aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          style={{
            ['--dx' as string]: s.dx,
            ['--dy' as string]: s.dy,
            ['--size' as string]: s.size,
            ['--color' as string]: colors[i % colors.length],
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  );
}
