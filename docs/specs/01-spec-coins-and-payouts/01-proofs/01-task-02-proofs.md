# Task 02 Proofs - Persistent balances and one idempotent payout per finished game

## Task Summary

This task makes coins real. The database gains `players` and `payouts` tables. The table room gives each game a UUID when the host starts it, and when the final move lands it pays every seat in one transaction. Nothing a client sends can start or change a payout, and a failing database cannot stop a game from ending.

## What This Task Proves

- A payout writes one row per player and raises each balance in a single transaction, and paying the same game again changes nothing.
- Balances survive closing and reopening the database.
- A full two-player game through the real room pays both seats once, names the game with a UUID, and gives the winner a bonus.
- Spectators and guests (when guest payouts are off) are paid nothing and get no `players` row, an unfinished game pays nothing, and a seat that has disconnected by the end is still paid.
- A client that sends an invented message such as `payout` is disconnected and nothing is paid.
- If recording fails, both players still see the game finish and the error is logged.

## Evidence Summary

- 9 database tests and 8 new room tests pass; the full suite is 334 tests with 100% coverage on `packages/rules`.
- A real dev server on a real database file, played over the actual WebSocket API, produced one game id, two payout rows and two balances.
- I checked the guest test is not hollow by removing the guest rule: the test failed, and I restored the code.

## Artifact: Database tests

**What it proves:** Tables exist, a payout is atomic and idempotent, a failing row rolls everything back, and balances persist across reopen.

**Why it matters:** This is the money bookkeeping, so it must be exactly-once and crash-safe.

**Command:**

```bash
pnpm exec vitest run apps/server/src/db.test.ts
```

**Result summary:** 9 tests passed, including `pays the same game only once`, `rolls everything back when one row fails` and `keeps balances after the database is closed and reopened`.

## Artifact: Room payout tests

**What it proves:** The full server flow through the real room: payout amounts match `computePayouts`, game ids are UUIDs and differ between games, and eligibility rules hold for spectators, guests, unfinished games and disconnected seats.

**Why it matters:** These are the functional requirements of Unit 2 exercised end to end over WebSockets.

**Command:**

```bash
pnpm exec vitest run apps/server/src/rooms/TableRoom.test.ts
```

**Result summary:** 25 tests passed (17 existing, 8 new in `coin payouts`). The guest test fails if the guest rule is removed, which I confirmed by temporarily removing it.

## Artifact: Real database file after a real game

**What it proves:** The feature works outside the tests: a dev server with guest login on, a scratch data directory, and two guests playing a 1-card game through the WebSocket API.

**Why it matters:** The tests use temporary databases; this shows the actual `rollhouse.db` file is written by the running server.

**Command:** a temporary driver script played the game against `GUEST_LOGIN=true DATA_DIR=<scratch> tsx src/index.ts`, then a read-only query listed the tables (the `sqlite3` CLI is not installed here, so the query used `node:sqlite`). Ids are shortened and guest-only.

**Result summary:** One game id appears on both rows. The winner earned 6 coins (finish 3 plus win 3) and the other player 3, and the balances match.

```text
-- payouts (ids shortened)
{"game_id":"7f377372...","user_id":"guest-206de6...","coins":3,"breakdown":"{\"finish\":3,\"win\":0,\"yatzy\":0}"}
{"game_id":"7f377372...","user_id":"guest-675201...","coins":6,"breakdown":"{\"finish\":3,\"win\":3,\"yatzy\":0}"}
-- players (ids shortened)
{"user_id":"guest-206de6...","coins":3}
{"user_id":"guest-675201...","coins":6}
```

## Artifact: Lint, typecheck and full test run

**What it proves:** No regressions and the repository gates hold.

**Why it matters:** The pre-commit hook runs `task lint`, and CI runs all of these.

**Result summary:** `task lint` and `task typecheck` pass. `task test`: 21 files, 334 tests passed, with `packages/rules` at 100% statements, branches, functions and lines.

## Reviewer Conclusion

Coins are recorded exactly once per game by the server alone and survive a restart of the database. Task 3.0 can now send the payout to clients and show it on the Results screen.
