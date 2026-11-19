import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client, type Room } from '@colyseus/sdk';
import { type GameState, type Move, replay } from '@rollhouse/rules';
import {
  type ErrorMessage,
  type JoinOptions,
  type Lobby,
  type MoveMessage,
  MSG_ERROR,
  MSG_LOBBY,
  MSG_MOVE,
  MSG_SNAPSHOT,
  type Snapshot,
  TABLE_ROOM,
} from '@rollhouse/shared';
import type { Auth } from './api';
import { store } from './storage';

export type Connection = 'connecting' | 'open' | 'reconnecting' | 'lost';

export interface Table {
  connection: Connection;
  snapshot: Snapshot | null;
  lobby: Lobby | null;
  game: GameState | null;
  /** The viewer's seat, or null when watching. */
  seat: number | null;
  error: ErrorMessage | null;
  clearError(): void;
  send(type: string, body?: unknown): void;
  rejoin(): void;
}

/** The game server: same origin in production and inside Discord; :8080 beside Vite in dev. */
function endpoint(): string {
  return import.meta.env.DEV ? `${location.protocol}//${location.hostname}:8080` : location.origin;
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
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    let cancelled = false;
    setConnection('connecting');
    const options: JoinOptions = { instanceId: auth.instanceId, session: auth.session };
    new Client(endpoint())
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
        });
        room.onMessage(MSG_LOBBY, (l: Lobby) => setLobby(l));
        room.onMessage(MSG_MOVE, ({ index, move }: MoveMessage) =>
          // Ignore anything already in the log (a snapshot can overlap a move).
          setMoves((prev) => (index === prev.length ? [...prev, move] : prev)),
        );
        room.onMessage(MSG_ERROR, (e: ErrorMessage) => setError(e));
        room.onDrop(() => setConnection('reconnecting'));
        room.onReconnect(() => setConnection('open'));
        room.onLeave(() => {
          if (!cancelled) setConnection('lost');
        });
      })
      .catch((err: unknown) => {
        console.error('could not join the table', err);
        if (!cancelled) setConnection('lost');
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
    snapshot,
    lobby,
    game,
    seat,
    error,
    clearError: useCallback(() => setError(null), []),
    send,
    rejoin: useCallback(() => setAttempt((n) => n + 1), []),
  };
}
