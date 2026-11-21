/**
 * One motion vocabulary for the whole app. Springs for things that move
 * because you touched them, quick eases for things that come and go. The CSS
 * side mirrors these as --ease-* and --dur-* in styles.css. MotionConfig
 * (main.tsx) and the reduced-motion block in styles.css turn movement into
 * plain fades for people who ask for less motion.
 */
import type { Transition } from 'motion/react';

export const SPRING = {
  /** Scores, chips, anything that lands with a little bounce. */
  pop: { type: 'spring', stiffness: 520, damping: 18 },
  /** Panels, tabs and toggles: quick, barely any overshoot. */
  snappy: { type: 'spring', stiffness: 520, damping: 36 },
  /** Whole screens and layout shifts. */
  soft: { type: 'spring', stiffness: 260, damping: 30 },
} satisfies Record<string, Transition>;

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const DURATION = { fast: 0.14, base: 0.22, slow: 0.36 };

/** A panel or popover appearing from where it's anchored. */
export const POP_IN = {
  initial: { opacity: 0, scale: 0.94, y: -6 },
  animate: { opacity: 1, scale: 1, y: 0, transition: SPRING.snappy },
  exit: { opacity: 0, scale: 0.97, y: -4, transition: { duration: DURATION.fast, ease: EASE_OUT } },
};

/** A whole screen arriving (lobby, game, results). */
export const SCREEN = {
  initial: { opacity: 0, y: 14, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1, transition: SPRING.soft },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.fast, ease: EASE_OUT } },
};

/** Things in a list arriving one after another. */
export const stagger = (i: number, step = 0.04) => ({ delay: i * step });
