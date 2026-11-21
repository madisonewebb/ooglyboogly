import type { Transition } from 'motion/react';
import type { PetPose } from './mood';

/** What a pet's body and its shadow do for a pose. Plain data, so it can be tested. */
export interface PetMotion {
  body: { animate: Record<string, number | number[]>; transition: Transition };
  shadow: { animate: Record<string, number | number[]>; transition: Transition };
}

const REST = { y: 0, scaleX: 1, scaleY: 1, rotate: 0 };
const SHADOW_REST = { scaleX: 1, opacity: 1 };

/**
 * Calm, cozy motion: a slow bob when idle, one hop and squash for happy, a
 * slump for sad, a run of hops and wiggles for a Yatzy cheer. The body is
 * anchored at its feet (transform-origin: bottom), so squash grows from the
 * ground. With reduced motion every pose is a still frame: only the sprite
 * changes.
 */
export function petMotion(pose: PetPose, reduced: boolean): PetMotion {
  if (reduced) {
    return {
      body: { animate: REST, transition: { duration: 0 } },
      shadow: { animate: SHADOW_REST, transition: { duration: 0 } },
    };
  }
  switch (pose) {
    case 'idle':
      return {
        body: {
          animate: { ...REST, y: [0, -3, 0] },
          transition: { duration: 3.6, ease: 'easeInOut', repeat: Infinity },
        },
        shadow: {
          animate: { scaleX: [1, 0.95, 1], opacity: 1 },
          transition: { duration: 3.6, ease: 'easeInOut', repeat: Infinity },
        },
      };
    case 'happy':
      return {
        body: {
          animate: {
            y: [0, 0, -14, 0, -5, 0],
            scaleX: [1, 1.08, 0.96, 1.05, 0.99, 1],
            scaleY: [1, 0.9, 1.06, 0.94, 1.02, 1],
            rotate: 0,
          },
          transition: { duration: 1.1, times: [0, 0.15, 0.4, 0.62, 0.8, 1], ease: 'easeOut' },
        },
        shadow: {
          animate: { scaleX: [1, 1.05, 0.78, 1, 0.92, 1], opacity: [1, 1, 0.7, 1, 0.9, 1] },
          transition: { duration: 1.1, times: [0, 0.15, 0.4, 0.62, 0.8, 1], ease: 'easeOut' },
        },
      };
    case 'sad':
      return {
        body: {
          animate: { y: 2, scaleX: 1.04, scaleY: 0.93, rotate: -3 },
          transition: { type: 'spring', stiffness: 120, damping: 18 },
        },
        shadow: { animate: { scaleX: 1.05, opacity: 1 }, transition: { duration: 0.4 } },
      };
    case 'cheer':
      return {
        body: {
          animate: {
            y: [0, -20, 0, -20, 0, -20, 0],
            scaleY: [1, 1.08, 0.92, 1.08, 0.92, 1.08, 1],
            scaleX: [1, 0.95, 1.06, 0.95, 1.06, 0.95, 1],
            rotate: [0, -7, 5, -7, 5, -4, 0],
          },
          transition: { duration: 2.2, ease: 'easeInOut' },
        },
        shadow: {
          animate: { scaleX: [1, 0.7, 1, 0.7, 1, 0.7, 1], opacity: [1, 0.6, 1, 0.6, 1, 0.6, 1] },
          transition: { duration: 2.2, ease: 'easeInOut' },
        },
      };
  }
}
