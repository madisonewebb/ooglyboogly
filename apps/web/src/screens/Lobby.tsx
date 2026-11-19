import { MAX_CARDS, MAX_PLAYERS, MIN_CARDS } from '@rollhouse/rules';
import {
  type Lobby as LobbyState,
  type LobbySettings,
  MSG_SETTINGS,
  MSG_START,
  type SettingsIntent,
} from '@rollhouse/shared';
import { Avatar } from '../Avatar';
import type { Table } from '../useTable';

interface Props {
  lobby: LobbyState;
  table: Table;
  userId: string;
  cdnBase: string;
}

function Choice<T extends string | number | boolean>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  disabled: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="choice" disabled={props.disabled}>
      <legend>{props.label}</legend>
      <div className="segmented">
        {props.options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={props.value === o.value}
            onClick={() => props.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Lobby({ lobby, table, userId, cdnBase }: Props) {
  const isHost = lobby.hostId === userId;
  const host = lobby.seats.find((s) => s.user.id === lobby.hostId);
  const s = lobby.settings;
  const set = (change: SettingsIntent) => table.send(MSG_SETTINGS, change);
  const cards = Array.from({ length: MAX_CARDS - MIN_CARDS + 1 }, (_, i) => MIN_CARDS + i);

  return (
    <main className="screen lobby">
      <h1>Rollhouse</h1>

      <section className="panel">
        <h2>
          At the table ({lobby.seats.length}/{MAX_PLAYERS})
        </h2>
        <ul className="seats">
          {lobby.seats.map((seat) => (
            <li key={seat.user.id} className={seat.connected ? '' : 'away'}>
              <Avatar user={seat.user} cdnBase={cdnBase} />
              <span>{seat.user.name}</span>
              {seat.user.id === lobby.hostId && <span className="badge">host</span>}
              {seat.user.id === userId && <span className="badge">you</span>}
              {!seat.connected && <span className="quiet">away</span>}
            </li>
          ))}
        </ul>
        {lobby.spectators.length > 0 && (
          <p className="quiet">Watching: {lobby.spectators.map((u) => u.name).join(', ')}</p>
        )}
      </section>

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
        <button type="button" className="primary big" onClick={() => table.send(MSG_START)}>
          Start game
        </button>
      ) : (
        <p className="waiting">Waiting for {host?.user.name ?? 'the host'} to start…</p>
      )}
    </main>
  );
}
