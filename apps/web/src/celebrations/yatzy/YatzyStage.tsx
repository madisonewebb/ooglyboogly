import type { GameState } from '@rollhouse/rules';
import { GhostParade } from '../../cosmetics/celebrations/GhostParade';
import type { ParadeCue } from '../../cosmetics/pets/stage';
import { useYatzyCelebration } from './useYatzyCelebration';
import { YatzyCelebration } from './YatzyCelebration';

interface Props {
  game: GameState;
  /** A seat's display name. */
  name(seat: number): string;
  reduced: boolean;
  /** The equipped Ghost Parade to play, if the roller has one (from the pet stage). */
  parade: ParadeCue | null;
  endParade(): void;
}

/**
 * Everything a Yatzy puts over the table: the big default celebration for
 * everyone, then the roller's equipped Ghost Parade, if they have one. They
 * take turns, never overlap: the parade marches in right after the burst has
 * played out, so the two do not fight over the screen or announce at once.
 * The celebration's own state lives here, so starting and clearing it re-renders
 * this component and nothing else on the game screen.
 */
export function YatzyStage({ game, name, reduced, parade, endParade }: Props) {
  const yatzy = useYatzyCelebration(game, reduced);
  return (
    <>
      {yatzy.cue && (
        <YatzyCelebration
          key={yatzy.cue.id}
          id={yatzy.cue.id}
          names={yatzy.cue.players.map(name)}
          reduced={reduced}
          onDone={yatzy.end}
        />
      )}
      {parade && !yatzy.cue && (
        <GhostParade
          key={parade.id}
          id={parade.id}
          name={name(parade.player)}
          reduced={reduced}
          onDone={endParade}
        />
      )}
    </>
  );
}
