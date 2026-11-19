import { type FormEvent, useEffect, useState } from 'react';
import { type AppConfig, BRAND_NAME } from '@rollhouse/shared';
import { type Auth, getConfig, guestSignIn } from './api';
import { Corner } from './Corner';
import { discordSignIn, inDiscord } from './discord';
import { Game } from './screens/Game';
import { Lobby } from './screens/Lobby';
import { Results } from './screens/Results';
import { errorText } from './errors';
import { store } from './storage';
import { useTable } from './useTable';

type Boot =
  | { stage: 'loading' }
  | { stage: 'guest'; config: AppConfig }
  | { stage: 'outside' }
  | { stage: 'failed'; message: string }
  | { stage: 'ready'; auth: Auth };

const GUEST_KEY = 'rollhouse:guest';

/** Outside Discord the table comes from ?table=, so two browser tabs can share one. */
const browserTable = () => new URLSearchParams(location.search).get('table') ?? 'local';

function guestAuth(session: string, user: Auth['user']): Auth {
  return {
    session,
    user,
    instanceId: browserTable(),
    cdnBase: 'https://cdn.discordapp.com',
    discord: false,
  };
}

export function App() {
  return (
    <>
      <Corner />
      <Boot />
    </>
  );
}

function Boot() {
  const [boot, setBoot] = useState<Boot>({ stage: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const go = (b: Boot) => !cancelled && setBoot(b);
    (async () => {
      const config = await getConfig();
      if (inDiscord()) {
        if (!config.discordClientId)
          return go({ stage: 'failed', message: 'Discord is not set up' });
        return go({ stage: 'ready', auth: await discordSignIn(config.discordClientId) });
      }
      if (!config.guestLogin) return go({ stage: 'outside' });
      const saved = store.get(GUEST_KEY);
      if (saved) {
        const { session, user } = JSON.parse(saved) as Pick<Auth, 'session' | 'user'>;
        return go({ stage: 'ready', auth: guestAuth(session, user) });
      }
      go({ stage: 'guest', config });
    })().catch((err: unknown) => {
      console.error('sign-in failed', err);
      go({ stage: 'failed', message: errorText(err) });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  switch (boot.stage) {
    case 'loading':
      return <Centered>Signing in…</Centered>;
    case 'outside':
      return (
        <Centered>
          <h1 className="wordmark">{BRAND_NAME}</h1>
          <p>Open {BRAND_NAME} from a Discord call: start an Activity and pick it.</p>
        </Centered>
      );
    case 'failed':
      return (
        <Centered>
          <h1 className="wordmark">{BRAND_NAME}</h1>
          <p>Sign-in didn&apos;t work: {boot.message}</p>
          <button type="button" onClick={() => location.reload()}>
            Try again
          </button>
        </Centered>
      );
    case 'guest':
      return <GuestForm onAuth={(auth) => setBoot({ stage: 'ready', auth })} />;
    case 'ready':
      return <TableScreen auth={boot.auth} />;
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="screen centered">{children}</main>;
}

function GuestForm({ onAuth }: { onAuth: (auth: Auth) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { session, user } = await guestSignIn(name);
      store.set(GUEST_KEY, JSON.stringify({ session, user }));
      onAuth(guestAuth(session, user));
    } catch (err) {
      setError(errorText(err));
    }
  };
  return (
    <Centered>
      <h1 className="wordmark">{BRAND_NAME}</h1>
      <form onSubmit={(e) => void submit(e)} className="guest">
        <label htmlFor="guest-name">Your name</label>
        <input
          id="guest-name"
          value={name}
          maxLength={32}
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="primary big">
          Sit down
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </Centered>
  );
}

function TableScreen({ auth }: { auth: Auth }) {
  const table = useTable(auth);
  const { lobby, game, seat, connection, error } = table;

  return (
    <>
      {connection === 'reconnecting' && <p className="banner">Reconnecting…</p>}
      {connection === 'lost' && (
        <p className="banner">
          Lost the connection.{' '}
          <button type="button" onClick={table.rejoin}>
            Rejoin
          </button>
        </p>
      )}
      {error && (
        <p className="banner error" role="alert">
          {error.message}{' '}
          <button type="button" onClick={table.clearError}>
            OK
          </button>
        </p>
      )}
      {!lobby ? (
        <Centered>
          {connection === 'lost' ? (
            <>
              <p>Could not reach the table.</p>
              {table.lostReason && <p className="quiet">{table.lostReason}</p>}
            </>
          ) : (
            'Joining the table…'
          )}
        </Centered>
      ) : !game ? (
        <Lobby lobby={lobby} table={table} userId={auth.user.id} cdnBase={auth.cdnBase} />
      ) : game.finished ? (
        <Results game={game} lobby={lobby} cdnBase={auth.cdnBase} />
      ) : (
        <Game game={game} lobby={lobby} table={table} seat={seat} cdnBase={auth.cdnBase} />
      )}
    </>
  );
}
