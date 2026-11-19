import { MAX_CARDS, MAX_PLAYERS, MIN_CARDS } from '@rollhouse/rules';
import {
  FLAVOR_IDS,
  type FlavorId,
  type Lobby as LobbyState,
  type LobbySettings,
  MSG_FLAVOR,
  MSG_SETTINGS,
  MSG_START,
  type SettingsIntent,
} from '@rollhouse/shared';
import { Avatar } from '../Avatar';
import { flavorVars } from '../flavor';
import { loadFlavor, saveFlavor } from '../flavorPrefs';
import { FLAVORS } from '../theme/palette';
import { usePrefs } from '../theme/prefs';
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

/** Eight candy swatches. Flavors someone else has are marked with their initial. */
function FlavorPicker(props: {
  label: string;
  value: FlavorId;
  takenBy: Map<FlavorId, string>;
  onChange: (f: FlavorId) => void;
}) {
  const { theme } = usePrefs();
  return (
    <fieldset className="choice">
      <legend>{props.label}</legend>
      <div className="flavors">
        {FLAVOR_IDS.map((id) => {
          const owner = props.takenBy.get(id);
          return (
            <button
              key={id}
              type="button"
              className="flavor"
              style={flavorVars(id, theme)}
              aria-pressed={props.value === id}
              disabled={owner !== undefined}
              onClick={() => props.onChange(id)}
            >
              <span className="swatch" aria-hidden="true">
                {owner?.slice(0, 1).toUpperCase()}
              </span>
              {FLAVORS[id].name}
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
    lobby.seats.filter((seat) => seat !== me).map((seat) => [seat.flavor, seat.user.name] as const),
  );
  const backup = loadFlavor().backup ?? FLAVOR_IDS.find((f) => f !== me?.flavor)!;
  const pickFlavor = (flavor: FlavorId, nextBackup: FlavorId) => {
    saveFlavor(flavor, nextBackup);
    table.send(MSG_FLAVOR, { flavor, backup: nextBackup });
  };
  const isHost = lobby.hostId === userId;
  const host = lobby.seats.find((s) => s.user.id === lobby.hostId);
  const s = lobby.settings;
  const set = (change: SettingsIntent) => table.send(MSG_SETTINGS, change);
  const cards = Array.from({ length: MAX_CARDS - MIN_CARDS + 1 }, (_, i) => MIN_CARDS + i);

  return (
    <main className="screen lobby">
      <h1 className="wordmark">Rollhouse</h1>

      <section className="panel">
        <h2>
          At the table ({lobby.seats.length}/{MAX_PLAYERS})
        </h2>
        <ul className="seats">
          {lobby.seats.map((seat) => (
            <li key={seat.user.id} className={seat.connected ? '' : 'away'}>
              <Avatar user={seat.user} cdnBase={cdnBase} flavor={seat.flavor} />
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

      {me && (
        <section className="panel">
          <h2>Your flavor</h2>
          <p className="quiet">Your color for chips and the numbers on your pad.</p>
          <FlavorPicker
            label="Flavor"
            value={me.flavor}
            takenBy={takenBy}
            onChange={(f) => pickFlavor(f, backup === f ? me.flavor : backup)}
          />
          <FlavorPicker
            label="Backup, if someone else has your flavor"
            value={backup}
            takenBy={new Map([[me.flavor, 'you']])}
            onChange={(b) => pickFlavor(me.flavor, b)}
          />
        </section>
      )}

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
