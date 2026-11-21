import { AnimatePresence, motion } from 'motion/react';
import { useId } from 'react';
import { MAX_CARDS, MAX_PLAYERS, MIN_CARDS } from '@rollhouse/rules';
import {
  TINT_IDS,
  type TintId,
  type Lobby as LobbyState,
  type LobbySettings,
  MSG_TINT,
  MSG_SETTINGS,
  MSG_START,
  type SettingsIntent,
} from '@rollhouse/shared';
import { Avatar } from '../Avatar';
import { Brand } from '../Brand';
import { tintVars } from '../tint';
import { saveTint } from '../tintPrefs';
import { CheckIcon, CrownIcon } from '../icons';
import { TINTS } from '../theme/palette';
import { SPRING } from '../theme/motion';
import { usePrefs } from '../theme/prefs';
import type { Table } from '../useTable';

interface Props {
  lobby: LobbyState;
  table: Table;
  userId: string;
  cdnBase: string;
}

/** Segmented buttons; the chosen one wears a pill that slides between them. */
function Choice<T extends string | number | boolean>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  disabled: boolean;
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <fieldset className="choice" disabled={props.disabled}>
      <legend>{props.label}</legend>
      <div className="segmented">
        {props.options.map((o) => {
          const on = props.value === o.value;
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={on}
              onClick={() => props.onChange(o.value)}
            >
              {on && (
                <motion.span
                  layoutId={`seg-${id}`}
                  className="seg-pill"
                  transition={SPRING.snappy}
                  aria-hidden="true"
                />
              )}
              <span className="seg-label">{o.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Eight tint swatches. Tints someone else has are marked with their initial. */
function TintPicker(props: {
  label: string;
  value: TintId;
  takenBy: Map<TintId, string>;
  onChange: (f: TintId) => void;
}) {
  const { theme } = usePrefs();
  return (
    <fieldset className="choice">
      <legend className="sr-only">{props.label}</legend>
      <div className="tints">
        {TINT_IDS.map((id) => {
          const owner = props.takenBy.get(id);
          const on = props.value === id;
          return (
            <button
              key={id}
              type="button"
              className="tint"
              style={tintVars(id, theme)}
              aria-pressed={on}
              disabled={owner !== undefined}
              onClick={() => props.onChange(id)}
            >
              <motion.span
                className="swatch"
                aria-hidden="true"
                animate={{ scale: on ? 1.08 : 1 }}
                transition={SPRING.pop}
              >
                {on ? <CheckIcon /> : owner?.slice(0, 1).toUpperCase()}
              </motion.span>
              {TINTS[id].name}
              {owner && <span className="sr-only"> (taken by {owner})</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Lobby({ lobby, table, userId, cdnBase }: Props) {
  const me = lobby.seats.find((seat) => seat.user.id === userId);
  const takenBy = new Map(
    lobby.seats.filter((seat) => seat !== me).map((seat) => [seat.tint, seat.user.name] as const),
  );
  const pickTint = (tint: TintId) => {
    saveTint(tint);
    table.send(MSG_TINT, { tint });
  };
  const isHost = lobby.hostId === userId;
  const host = lobby.seats.find((s) => s.user.id === lobby.hostId);
  const s = lobby.settings;
  const set = (change: SettingsIntent) => table.send(MSG_SETTINGS, change);
  const cards = Array.from({ length: MAX_CARDS - MIN_CARDS + 1 }, (_, i) => MIN_CARDS + i);
  const open = MAX_PLAYERS - lobby.seats.length;

  return (
    <main className="screen lobby">
      <Brand />

      <div className="lobby-columns">
        <div className="lobby-stack">
          <section className="panel seats-panel">
            <h2>
              At the table{' '}
              <span className="count">
                ({lobby.seats.length}/{MAX_PLAYERS})
              </span>
            </h2>
            <ul className="seats">
              <AnimatePresence initial={false}>
                {lobby.seats.map((seat) => (
                  <motion.li
                    key={seat.user.id}
                    layout
                    className={`seat${seat.connected ? '' : ' away'}`}
                    initial={{ opacity: 0, scale: 0.6, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={SPRING.pop}
                  >
                    <span className="seat-face">
                      <Avatar user={seat.user} cdnBase={cdnBase} tint={seat.tint} />
                      {seat.user.id === lobby.hostId && (
                        <span className="crown" role="img" aria-label="host" title="Host">
                          <CrownIcon />
                        </span>
                      )}
                    </span>
                    <span className="seat-name">{seat.user.name}</span>
                    <span className="seat-tags">
                      {seat.user.id === userId && <span className="badge">you</span>}
                      {!seat.connected && <span className="badge">away</span>}
                    </span>
                  </motion.li>
                ))}
                {open > 0 && (
                  <motion.li key="open" layout className="seat open" aria-hidden="true">
                    <span className="seat-face empty" />
                    <span className="seat-name quiet">Open seat</span>
                  </motion.li>
                )}
              </AnimatePresence>
            </ul>
            {lobby.spectators.length > 0 && (
              <p className="quiet">Watching: {lobby.spectators.map((u) => u.name).join(', ')}</p>
            )}
          </section>

          {me && (
            <section className="panel">
              <h2>Your color</h2>
              <p className="quiet">It rings your picture and writes your scores.</p>
              <TintPicker label="Color" value={me.tint} takenBy={takenBy} onChange={pickTint} />
            </section>
          )}
        </div>
        <div className="lobby-stack">
          <section className="panel">
            <h2>Game</h2>
            <Choice<number>
              label="Cards each"
              value={s.cardsPerPlayer}
              options={cards.map((n) => ({ value: n, label: String(n) }))}
              disabled={!isHost}
              onChange={(cardsPerPlayer) => set({ cardsPerPlayer })}
            />
            <Choice<LobbySettings['playStyle']>
              label="Play style"
              value={s.playStyle}
              options={[
                { value: 'turns', label: 'Take turns' },
                { value: 'together', label: 'Everyone at once' },
              ]}
              disabled={!isHost}
              onChange={(playStyle) => set({ playStyle })}
            />
            {s.playStyle === 'turns' && (
              <Choice<LobbySettings['turnOrder']>
                label="Turn order"
                value={s.turnOrder}
                options={[
                  { value: 'fixed', label: 'As seated' },
                  { value: 'random', label: 'Random' },
                ]}
                disabled={!isHost}
                onChange={(turnOrder) => set({ turnOrder })}
              />
            )}
            {s.cardsPerPlayer > 1 && (
              <Choice<boolean>
                label="Multipliers (card 2 counts double, card 3 triple…)"
                value={s.multipliers}
                options={[
                  { value: true, label: 'On' },
                  { value: false, label: 'Off' },
                ]}
                disabled={!isHost}
                onChange={(multipliers) => set({ multipliers })}
              />
            )}
          </section>
          {isHost ? (
            <button
              type="button"
              className="primary big start"
              onClick={() => table.send(MSG_START)}
            >
              Start game
            </button>
          ) : (
            <p className="waiting">
              Waiting for {host?.user.name ?? 'the host'} to start
              <span className="dots" aria-hidden="true">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
