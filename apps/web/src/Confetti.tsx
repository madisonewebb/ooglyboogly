import { useMemo } from 'react';

/** A burst of candy sprinkles from the middle of its box. Decoration only. */
export function Confetti({
  colors,
  count = 44,
  seed = 1,
}: {
  colors: string[];
  count?: number;
  seed?: number;
}) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * Math.PI * 2 + ((seed * 7 + i * 13) % 10) / 20,
        dist: 110 + ((i * 37 + seed) % 120),
        rot: (i * 47) % 360,
        delay: (i % 7) * 22,
      })),
    [count, seed],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            background: colors[i % colors.length],
            ['--dx' as string]: `${Math.cos(b.angle) * b.dist}px`,
            ['--dy' as string]: `${Math.sin(b.angle) * b.dist * 0.7}px`,
            ['--rot' as string]: `${b.rot}deg`,
            animationDelay: `${b.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}
