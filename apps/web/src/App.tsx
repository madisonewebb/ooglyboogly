import { AnimatePresence, motion } from 'motion/react';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { type AppConfig, BRAND_NAME } from '@rollhouse/shared';
import { type Auth, getConfig, guestSignIn } from './api';
import { BrandBar, Welcome } from './Brand';
import { Corner } from './Corner';
import { discordSignIn, inDiscord } from './discord';
import { Game } from './screens/Game';
import { Lobby } from './screens/Lobby';
import { Results } from './screens/Results';
import { errorText } from './errors';
import { WalletContext } from './shop/WalletContext';
import { unlockAudio } from './sound';
import { store } from './storage';
import { DURATION, EASE_OUT, SCREEN } from './theme/motion';
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
  // Browsers only start sound after a click or a key, so the first one anywhere
  // (the lobby's Start, a tint) turns it on, ready for the first turn's chime.
  useEffect(() => {
    const opts = { capture: true, passive: true };
    addEventListener('pointerdown', unlockAudio, opts);
    addEventListener('keydown', unlockAudio, opts);
    return () => {
      removeEventListener('pointerdown', unlockAudio, opts);
      removeEventListener('keydown', unlockAudio, opts);
    };
  }, []);
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
      return (
        <Centered>
          <p className="joining">Signing in…</p>
        </Centered>
      );
    case 'outside':
      return (
        <Centered>
          <Welcome />
          <p>Open {BRAND_NAME} from a Discord call: start an Activity and pick it.</p>
        </Centered>
      );
    case 'failed':
      return (
        <Centered>
          <Welcome tagline={false} />
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

function Centered({ children }: { children: ReactNode }) {
  return (
    <>
      <BrandBar />
      <main className="screen centered">{children}</main>
    </>
  );
}

/** A whole screen arriving: lobby, game or results. */
function Screen({ children }: { children: ReactNode }) {
  return (
    <motion.div className="screen-frame" {...SCREEN}>
      {children}
    </motion.div>
  );
}

const BANNER = {
  initial: { opacity: 0, y: -24 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_OUT } },
  exit: { opacity: 0, y: -24, transition: { duration: DURATION.fast, ease: EASE_OUT } },
};

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
      <Welcome />
      <form onSubmit={(e) => void submit(e)} className="guest panel">
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

  const screen = !lobby ? 'joining' : !game ? 'lobby' : game.finished ? 'results' : 'game';

  return (
    <WalletContext.Provider value={table.wallet}>
      <AnimatePresence>
        {connection === 'reconnecting' && (
          <motion.p key="re" className="banner" {...BANNER}>
            Reconnecting…
          </motion.p>
        )}
        {connection === 'lost' && (
          <motion.p key="lost" className="banner" {...BANNER}>
            Lost the connection.{' '}
            <button type="button" onClick={table.rejoin}>
              Rejoin
            </button>
          </motion.p>
        )}
        {error && (
          <motion.p key="err" className="banner error" role="alert" {...BANNER}>
            {error.message}{' '}
            <button type="button" onClick={table.clearError}>
              OK
            </button>
          </motion.p>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <Screen key={screen}>
          {!lobby ? (
            <Centered>
              {connection === 'lost' ? (
                <>
                  <p>Could not reach the table.</p>
                  {table.lostReason && <p className="quiet">{table.lostReason}</p>}
                </>
              ) : (
                <p className="joining">Joining the table…</p>
              )}
            </Centered>
          ) : !game ? (
            <Lobby lobby={lobby} table={table} userId={auth.user.id} cdnBase={auth.cdnBase} />
          ) : game.finished ? (
            <Results game={game} lobby={lobby} cdnBase={auth.cdnBase} payout={table.payout} />
          ) : (
            <Game game={game} lobby={lobby} table={table} seat={seat} cdnBase={auth.cdnBase} />
          )}
        </Screen>
      </AnimatePresence>
    </WalletContext.Provider>
  );
}
