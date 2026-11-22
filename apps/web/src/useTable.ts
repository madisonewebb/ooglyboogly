import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client, type Room } from '@colyseus/sdk';
import { type GameState, type Move, replay } from '@rollhouse/rules';
import {
  type ErrorMessage,
  type JoinOptions,
  type Lobby,
  type MoveMessage,
  type PayoutMessage,
  type WalletMessage,
  MSG_WALLET,
  MSG_ERROR,
  MSG_LOBBY,
  MSG_MOVE,
  MSG_PAYOUT,
  MSG_REACTION,
  type ReactionMessage,
  MSG_SNAPSHOT,
  type Snapshot,
  TABLE_ROOM,
} from '@rollhouse/shared';
import { type Auth, reportError } from './api';
import { errorText } from './errors';
import { loadTint } from './tintPrefs';
import { withPayoutBalance } from './shop/shopView';
import { store } from './storage';

export type Connection = 'connecting' | 'open' | 'reconnecting' | 'lost';

/** The latest roll seen live (not from a snapshot), for the dice animation. */
export interface LiveRoll {
  index: number;
  player: number;
  tumble: number;
}

export interface Table {
  connection: Connection;
  /** Why the connection was lost, for the error screen. */
  lostReason: string | null;
  snapshot: Snapshot | null;
  lobby: Lobby | null;
  game: GameState | null;
  /** The viewer's seat, or null when watching. */
  seat: number | null;
  error: ErrorMessage | null;
  lastRoll: LiveRoll | null;
  /** Stickers sent in this session, newest last (only the last few are kept). */
  reactions: ReactionMessage[];
  /** What the finished game paid, once it has: null until then, and when nobody was paid. */
  payout: PayoutMessage | null;
  /** The viewer's own coins, items and goal; null until the table has answered. */
  wallet: WalletMessage | null;
  clearError(): void;
  send(type: string, body?: unknown): void;
  rejoin(): void;
}

/** The game server: same origin in production and inside Discord; :8080 beside Vite in dev. */
function endpoint(): string {
  return import.meta.env.DEV ? `${location.protocol}//${location.hostname}:8080` : location.origin;
}

/**
 * A Colyseus client that uses URLs exactly as built. On discordsays.com the
 * SDK otherwise rewrites every URL to /.proxy/colyseus/..., which assumes a
 * /colyseus URL mapping. Ours maps / to the server, so everything is same-origin.
 */
export function tableClient(base: string): Client {
  return new Client(base, { urlBuilder: (url) => url.href });
}

/** A client built for another version reloads once to pick up the new build. */
function reloadIfStale(serverVersion: string) {
  if (serverVersion === __APP_VERSION__) return;
  const key = `rollhouse:reloaded-for`;
  if (store.get(key) === serverVersion) return;
  store.set(key, serverVersion);
  location.reload();
}

export function useTable(auth: Auth): Table {
  const [connection, setConnection] = useState<Connection>('connecting');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [error, setError] = useState<ErrorMessage | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [lostReason, setLostReason] = useState<string | null>(null);
  const [lastRoll, setLastRoll] = useState<LiveRoll | null>(null);
  const [reactions, setReactions] = useState<ReactionMessage[]>([]);
  const [payout, setPayout] = useState<PayoutMessage | null>(null);
  const [wallet, setWallet] = useState<WalletMessage | null>(null);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    let cancelled = false;
    setConnection('connecting');
    setLostReason(null);
    const lose = (where: string, message: string) => {
      if (cancelled) return;
      setConnection('lost');
      setLostReason(message);
      reportError(where, message);
    };
    const options: JoinOptions = {
      instanceId: auth.instanceId,
      session: auth.session,
      ...loadTint(),
    };
    tableClient(endpoint())
      .joinOrCreate(TABLE_ROOM, options)
      .then((room) => {
        if (cancelled) return void room.leave();
        roomRef.current = room;
        setConnection('open');
        room.onMessage(MSG_SNAPSHOT, (s: Snapshot) => {
          reloadIfStale(s.version);
          setSnapshot(s);
          setLobby(s.lobby);
          setMoves(s.moves);
          setPayout(s.payout ?? null);
          setWallet(s.wallet ?? null);
        });
        room.onMessage(MSG_LOBBY, (l: Lobby) => setLobby(l));
        room.onMessage(MSG_MOVE, ({ index, move, tumble }: MoveMessage) => {
          // Ignore anything already in the log (a snapshot can overlap a move).
          setMoves((prev) => (index === prev.length ? [...prev, move] : prev));
          if (move.type === 'roll') {
            setLastRoll((r) =>
              r && r.index >= index ? r : { index, player: move.player, tumble: tumble ?? index },
            );
          }
        });
        room.onMessage(MSG_REACTION, (r: ReactionMessage) =>
          setReactions((prev) => [...prev.slice(-11), r]),
        );
        room.onMessage(MSG_PAYOUT, (p: PayoutMessage) => {
          setPayout(p);
          // The band shows the balance on every screen, so it must move the moment the game pays.
          setWallet((w) => withPayoutBalance(w, p));
        });
        room.onMessage(MSG_WALLET, (w: WalletMessage) => setWallet(w));
        room.onMessage(MSG_ERROR, (e: ErrorMessage) => setError(e));
        room.onDrop(() => setConnection('reconnecting'));
        room.onReconnect(() => setConnection('open'));
        room.onLeave((code, reason) => {
          lose('table left', `closed with code ${code}${reason ? `: ${reason}` : ''}`);
        });
      })
      .catch((err: unknown) => {
        console.error('could not join the table', err);
        lose('table join', errorText(err));
      });
    return () => {
      cancelled = true;
      void roomRef.current?.leave();
      roomRef.current = null;
    };
  }, [auth, attempt]);

  const game = useMemo(
    () => (snapshot?.setup ? replay(snapshot.setup, moves) : null),
    [snapshot, moves],
  );
  const seat = useMemo(() => {
    const i = lobby?.seats.findIndex((s) => s.user.id === auth.user.id) ?? -1;
    return i < 0 ? null : i;
  }, [lobby, auth.user.id]);

  const send = useCallback((type: string, body?: unknown) => {
    setError(null);
    roomRef.current?.send(type, body);
  }, []);

  return {
    connection,
    lostReason,
    snapshot,
    lobby,
    game,
    seat,
    error,
    lastRoll,
    reactions,
    payout,
    wallet,
    clearError: useCallback(() => setError(null), []),
    send,
    rejoin: useCallback(() => setAttempt((n) => n + 1), []),
  };
}
