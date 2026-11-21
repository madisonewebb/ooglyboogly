import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { STAGE_ASPECT } from '../../dice/framing';
import { hasWebGL } from '../../dice/webgl';
import { SPRING } from '../../theme/motion';
import type { PetId, PetPose } from './mood';
import { petMotion } from './petMotion';
import { petPlacement } from './placement';
import { PetSprite } from './PetSprite';
import './pets.css';

interface Props {
  /** The pet to show, or none. */
  pet: PetId | undefined;
  /** Who owns it: a different owner swaps the pet in with a pop. */
  owner: number | null;
  pose: PetPose;
  /** Changes on every reaction, so the same pose can play again. */
  nonce: number;
  reduced: boolean;
}

/**
 * The pet on the dice tray: a flat sprite standing on a soft shadow, over the
 * tray frame near the cauldron's rim. Decoration only: hidden from screen
 * readers, and never takes a click, so it can't get in the way of a die.
 */
export function PetLayer({ pet, owner, pose, nonce, reduced }: Props) {
  const m = petMotion(pose, reduced);
  const layer = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(STAGE_ASPECT);
  // The tray fits itself to the stage, so the pet follows the stage's shape.
  useEffect(() => {
    const el = layer.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(() => {
      if (el.clientHeight > 0) setAspect(el.clientWidth / el.clientHeight);
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  // Without WebGL the dice are flat and unframed: the pet stays in the corner.
  const spot = typeof document !== 'undefined' && hasWebGL() ? petPlacement(aspect) : null;
  return (
    <div className="pet-layer" ref={layer} aria-hidden="true" data-testid="pet-layer">
      <AnimatePresence mode="wait">
        {pet && (
          <motion.div
            key={`${owner}:${pet}`}
            className={spot ? 'pet placed' : 'pet'}
            data-pet={pet}
            data-pose={pose}
            {...(spot && {
              style: {
                left: `${spot.x * 100}%`,
                top: `${spot.y * 100}%`,
                width: `${spot.width * 100}%`,
              },
            })}
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: SPRING.pop }}
            exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.14 } }}
          >
            <motion.span
              key={`shadow:${pose}:${nonce}`}
              className="pet-shadow"
              animate={m.shadow.animate}
              transition={m.shadow.transition}
            />
            <motion.div
              key={`body:${pose}:${nonce}`}
              className="pet-body"
              animate={m.body.animate}
              transition={m.body.transition}
            >
              <PetSprite pet={pet} pose={pose} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
