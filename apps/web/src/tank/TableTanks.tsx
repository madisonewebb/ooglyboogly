/**
 * The aquariums at the table: whoever's turn it is has their tank above the
 * dice for everyone to watch, and your own sits small in its corner whenever
 * the big one isn't yours. Tanks aren't saved yet, so everyone has the
 * starter tank; each player's fish start from their own seed.
 */
import type { Ref } from 'react';
import { STARTER } from './catalog';
import { Tank, type TankHandle } from './Tank';

/** A stable seed from a user id, so a player's tank opens the same on every screen. */
export function seedOf(id: string): number {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 2147483646;
  return h + 1;
}

interface Owner {
  id: string;
  name: string;
}

export function TableTanks({
  watching,
  you,
  evening,
  ref,
}: {
  /** Whose tank is above the dice. */
  watching: Owner;
  /** You, when the big tank is someone else's. */
  you: Owner | null;
  evening: boolean;
  ref?: Ref<TankHandle>;
}) {
  return (
    <div className="table-tank">
      <figure className="aquarium">
        <div className="aquarium-lid" aria-hidden="true" />
        <div className="aquarium-glass">
          <Tank
            key={watching.id}
            ref={ref}
            layout={STARTER}
            seed={seedOf(watching.id)}
            evening={evening}
            label={you ? `${watching.name}'s tank` : 'Your tank'}
          />
        </div>
        <div className="aquarium-stand" aria-hidden="true" />
        {you && (
          <figure className="aquarium mini">
            <div className="aquarium-glass">
              <Tank
                key={you.id}
                layout={STARTER}
                seed={seedOf(you.id)}
                evening={evening}
                label="Your tank"
              />
            </div>
            <figcaption className="aquarium-label">Your tank</figcaption>
          </figure>
        )}
      </figure>
    </div>
  );
}
