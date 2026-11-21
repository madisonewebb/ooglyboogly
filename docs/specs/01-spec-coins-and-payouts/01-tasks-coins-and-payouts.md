# 01-tasks-coins-and-payouts.md

Spec: `01-spec-coins-and-payouts.md`

## Relevant Files

| File                                              | Why It Is Relevant                                                                     |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `packages/rules/src/payout.ts`                    | New. The pure `computePayouts` function and the coin constants.                        |
| `packages/rules/src/payout.test.ts`               | New. Unit tests for the formula table, ties, Yatzy, solo and unfinished games.         |
| `packages/rules/src/properties.test.ts`           | Existing property tests; gains the payout bounds property.                             |
| `packages/rules/src/test-helpers.ts`              | Existing helpers for building finished games; reused by the payout tests.              |
| `packages/rules/src/index.ts`                     | Re-exports the new payout API.                                                         |
| `apps/server/src/db.ts`                           | Gains the `wallets` and `payouts` tables, `payOut` and `getBalance`.                   |
| `apps/server/src/db.test.ts`                      | Gains table, transaction, idempotency and persistence tests.                           |
| `apps/server/src/rooms/TableRoom.ts`              | Creates the game id at start, settles the payout when the game finishes, and sends it. |
| `apps/server/src/rooms/TableRoom.test.ts`         | Full-game payout tests for seats, spectators, guests, unfinished games and reconnects. |
| `apps/server/src/app.ts`                          | Passes the database and the guest-payout setting into the room config.                 |
| `apps/server/src/index.ts`                        | Passes the already-opened database into the server.                                    |
| `apps/server/src/test-server.ts`                  | Test server helper; may need a database option for the restart test.                   |
| `packages/shared/src/protocol.ts`                 | New payout message name and types, and an optional payout on `Snapshot`.               |
| `apps/web/src/useTable.ts`                        | Receives the payout message and the snapshot payout and exposes it.                    |
| `apps/web/src/payoutView.ts`                      | New. Pure helper that turns a payout into the text the Results screen shows.           |
| `apps/web/src/screens/Results.test.tsx`           | New. Render tests for Results with and without a payout, and for a spectator.          |
| `apps/web/src/payoutView.test.ts`                 | New. Unit tests for the coin line, breakdown, balance and spectator view.              |
| `apps/web/src/screens/Results.tsx`                | Shows the coin line per player and the viewer's balance.                               |
| `apps/web/src/App.tsx`                            | Passes the payout to the Results screen.                                               |
| `apps/web/src/icons.tsx`                          | New `CauldronCoinIcon`.                                                                |
| `apps/web/src/styles.css`                         | Styles for the coin line and breakdown.                                                |
| `apps/web/src/theme/palette.test.ts`              | Contrast checks; extended only if the coin text uses a new pairing.                    |
| `e2e/tests/game.spec.ts`                          | Existing game flow and helpers (`sitDown`, `playTurn`); reused by the coins test.      |
| `e2e/tests/coins.spec.ts`                         | New. Plays a short game to Results and checks the coin lines.                          |
| `README.md`                                       | Gains a short section on coins and where the code lives.                               |
| `docs/specs/01-spec-coins-and-payouts/01-proofs/` | New. Sanitized screenshot and command output proofs.                                   |

### Notes

- **Table name:** the balance table is `wallets`, not `players`. An earlier version of coins (commits `d9192dd`, reverted in `d40345c`) created a `players` table with different columns and a `ledger` table, and those may still exist in staging and production databases, where `CREATE TABLE IF NOT EXISTS players` would be skipped and every payout would then fail. `db.test.ts` has a test for a database that still has the old tables.
- Run one test file with `pnpm exec vitest run <path>`. Run everything with `task test`, which also enforces 100% coverage on `packages/rules`.
- The pre-commit hook runs `task lint`. Before the final commit, also run `task typecheck`, `task build` and `task e2e` (build first), which match CI.
- Commits use conventional messages, such as `feat(rules): …`, `feat(server): …` and `feat(web): …`. Open the pull request into `develop`.
- ESLint bans `Math.random` in `apps/server` and `packages/rules`. Use `crypto.randomUUID` for the game id.
- Money is integers only. Use the exact `round` and `floor` rules from the spec.
- The working tree already has uncommitted edits to `Brand.tsx`, `LobbyDie.tsx`, `styles.css` and `palette.ts`. Make sure those unrelated changes stay out of this feature's commits.
- The web package has no component-test setup, so Results logic goes in a pure helper with unit tests, and the rendering is proved with Playwright.
- Proof files use guest names and ids only, never real Discord ids or names.

## Tasks

### [x] 1.0 Payout rules as a pure, fully tested function

Covers Spec Unit 1. No server, database or UI: this is the one place the coin numbers are defined.

#### 1.0 Proof Artifact(s)

- Test: `packages/rules/src/payout.test.ts` passes (`pnpm exec vitest run packages/rules/src/payout.test.ts`) and asserts the finish and win amounts 3/3, 7/7, 10/10, 13/13 and 17/17 for 1 to 5 cards, demonstrating the formula matches the spec table.
- Test: the same file covers 2-way and 3-way ties, a Yatzy box scored with the `YATZY` value, a Yatzy bonus on a later card, a solo game paying a flat 1 coin, and an unfinished game being rejected, demonstrating every functional requirement of Unit 1.
- Test: a property test in `packages/rules/src/properties.test.ts` shows no amount is negative and one game's total never exceeds `seats × finish + finish + seats × cards`, demonstrating no runaway payout.
- CLI: `task test` prints 100% statements, branches, functions and lines for `packages/rules/src/payout.ts`, demonstrating the repository's coverage gate still holds.

#### 1.0 Tasks

- [x] 1.1 Create `packages/rules/src/payout.ts` with the constants `FINISH_COINS = 10`, `YATZY_COINS = 3`, `SOLO_COINS = 1` and `BASELINE_CARDS = 3`, a helper `scaled(base, cards) = Math.round((base * cards) / BASELINE_CARDS)`, and the types `PayoutBreakdown { finish; win; yatzy }` and `SeatPayout { player; total; breakdown }`.
- [x] 1.2 Implement `computePayouts(state: GameState): SeatPayout[]`, returning one entry per player index. Throw a clear `Error` (a programming error, not a player error) when `state.finished` is false.
- [x] 1.3 Solo rule: when `state.setup.players === 1`, return one entry of `total = SOLO_COINS` with finish `1`, win `0` and Yatzy `0`, for any card count.
- [x] 1.4 Finish and win: every seat gets `scaled(FINISH_COINS, cards)` for finishing. Find the highest `playerTotal(state, p).total`; each seat tied for it gets `Math.floor(scaled(FINISH_COINS, cards) / winners)` as the win bonus.
- [x] 1.5 Yatzy: a seat gets `scaled(YATZY_COINS, cards)` once if any of its cards has its `yatzy` box equal to `YATZY` or has `yatzyBonuses > 0`; otherwise 0. Check the box key name in `packages/rules/src/types.ts` before writing it.
- [x] 1.6 Export `computePayouts`, the constants and the types from `packages/rules/src/index.ts`.
- [x] 1.7 Write `payout.test.ts` using the finished-game helpers in `test-helpers.ts` (add a small helper there if none fits): the five-row card table, a 2-way tie, a 3-way tie in a 1-card game paying 1 each, a Yatzy box, a Yatzy bonus on card 2 only, two Yatzys paying once, a solo game at 1 and at 5 cards, and the unfinished-game error.
- [x] 1.8 Add the bounds property to `properties.test.ts`: for random finished games, every amount is at least 0 and the total is at most `seats × finish + finish + seats × cards`.
- [x] 1.9 Run `task test` and confirm 100% coverage for `payout.ts`, then `task lint` and `task typecheck`. Save the coverage line to `docs/specs/01-spec-coins-and-payouts/01-proofs/rules-coverage.txt`.

### [x] 2.0 Persistent balances and one idempotent payout per finished game

Covers Spec Unit 2. The server writes the payout; nothing a client sends can.

#### 2.0 Proof Artifact(s)

- Test: `apps/server/src/db.test.ts` passes and shows the `wallets` and `payouts` tables are created, a payout inserts rows and raises the balance in one transaction, a second identical payout changes nothing, and a closed-and-reopened database keeps the balance, demonstrating persistence and idempotency.
- Test: `apps/server/src/rooms/TableRoom.test.ts` plays a full two-player game and shows both balances and both payout rows are written exactly once, with the winner paid the bonus, demonstrating the end-to-end server flow.
- Test: the same file shows spectators receive no payout, a guest is paid only when guest payouts are enabled, an unfinished game pays nothing, and a seat that is disconnected at the end is still paid, demonstrating the eligibility rules.
- CLI: after a local dev game, `sqlite3 data/rollhouse.db "select user_id, coins from payouts"` lists one row per seat (guest ids only), saved to `docs/specs/01-spec-coins-and-payouts/01-proofs/payouts-rows.txt`, demonstrating the real database file is written.

#### 2.0 Tasks

- [x] 2.1 In `apps/server/src/db.ts`, add `CREATE TABLE IF NOT EXISTS` for `wallets (user_id TEXT PRIMARY KEY, coins INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)` and `payouts (game_id TEXT NOT NULL, user_id TEXT NOT NULL, coins INTEGER NOT NULL, breakdown TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (game_id, user_id))` to the existing startup `exec`.
- [x] 2.2 Add `payOut(db, gameId, rows: { userId; coins; breakdown }[]): boolean`. Inside `BEGIN IMMEDIATE … COMMIT` (with `ROLLBACK` on error), `INSERT … ON CONFLICT DO NOTHING` each payout row; for rows that were actually inserted, upsert the player and add the coins. Return whether anything was paid.
- [x] 2.3 Add `getBalance(db, userId): number` (0 when the player has no row).
- [x] 2.4 Extend `db.test.ts`: tables exist, a payout raises balances and writes rows, repeating the same `payOut` leaves both unchanged, a failing row rolls everything back, and a closed-and-reopened database keeps the balance.
- [x] 2.5 Extend `TableConfig` in `TableRoom.ts` with `db: DatabaseSync | null` and `guestPayouts: boolean`. In `app.ts` pass `db` through `ServerDeps` and set `guestPayouts` from `config.guestLogin`; in `index.ts` pass the database it already opens. With `db: null` (existing tests) payouts are skipped.
- [x] 2.6 In the `MSG_START` handler, create `this.gameId = randomUUID()` next to `this.setup`. Add `private paid = false`.
- [x] 2.7 In `apply`, after a move is accepted, if `this.game.finished && !this.paid`, set `paid = true` and call a new `settlePayout()`. Make `settlePayout` call `computePayouts`, map each player index to `this.seats[i].user.id`, drop guest ids (`guest-…`) unless `cfg.guestPayouts`, and call `payOut`. Keep the result on the room for task 3.0. Wrap the whole settlement in a `try` and `catch` that logs the error and leaves the game finished with no payout, so a database failure can never stop Results from reaching players; if it fails, leave `paid` set so the same game is not retried half-way.
- [x] 2.8 Extend `TableRoom.test.ts`: a full 2-player game pays both seats once with the winner bonus, every payout row carries a UUID `game_id`, and a second game at the same table gets a different one; a spectator gets nothing; a guest is skipped with `guestPayouts: false` (no payout row and no `wallets` row is created) and paid with `true`; an unfinished game writes no rows; a seat with no connected devices at the end is still paid; no client message can change a balance (send a bogus message and check nothing changed); and a database that throws during settlement still leaves the game finished, sends no coin message, and logs the error.
- [x] 2.9 Run a local dev game (`task dev`, two guest browsers on one `?table=`), then run the `sqlite3` query and save the output (guest ids only) to the proofs folder.

### [x] 3.0 Payout message, snapshot field and the Results screen coin line

Covers Spec Unit 3. Players see what they earned, including after a reconnect.

#### 3.0 Proof Artifact(s)

- Test: `apps/server/src/rooms/TableRoom.test.ts` shows each connected client receives the payout message after the final move and that a client joining after the game ended gets the same payout in its snapshot, demonstrating the live and reconnect paths.
- Test: `apps/web/src/payoutView.test.ts` passes and shows the `+N coins` text, the breakdown, singular `1 coin`, the viewer's balance, the spectator view without a balance, and nothing when there is no payout, demonstrating the display rules.
- Test: `apps/web/src/screens/Results.test.tsx` renders the Results screen to a string and shows the winner and standings with no coin lines before the payout arrives, then the coin lines and balance once it does, a spectator with no balance, and only paid players with a line, demonstrating that Results shows first and the coins follow without errors.
- Screenshot: Results screen after a 1-card, 2-guest game saved as `docs/specs/01-spec-coins-and-payouts/01-proofs/results-coins.png` shows each player's `+N coins` line with its breakdown and the cauldron coin icon, and the viewer's balance, demonstrating the visual result (a 1-card game is used because a 3-card game takes three times as long to play; the 3-card amounts are covered by the unit tests).
- CLI: `task test` passes including `palette.test.ts`, demonstrating the coin text meets WCAG AA in both themes and all three schemes.
- Test: `e2e/tests/coins.spec.ts` runs once with reduced motion emulated (`page.emulateMedia({ reducedMotion: 'reduce' })`) and shows the coin line is visible without waiting for an animation, and the existing Results assertions in `e2e/tests/game.spec.ts` still pass, demonstrating Results keeps its layout and reduced-motion behavior.

#### 3.0 Tasks

- [x] 3.1 In `packages/shared/src/protocol.ts`, add `MSG_PAYOUT = 'payout'`, `SeatPayoutInfo { userId; coins; finish; win; yatzy }` and `PayoutMessage { seats: SeatPayoutInfo[]; balance: number | null }`. Add `payout?: PayoutMessage` to `Snapshot`. `balance` is the receiving player's own new balance, or `null` for spectators and unpaid guests.
- [x] 3.2 In `TableRoom.ts`, after `settlePayout`, send each connected client its own `PayoutMessage` (seat list plus that client's balance). Keep the settled payout on the room, and include it, with the client's own balance, in `sendSnapshot` once the game is finished.
- [x] 3.3 Extend the room tests: both clients receive `MSG_PAYOUT` after the final move; a client that joins afterwards receives it in its snapshot; the spectator's `balance` is `null`.
- [x] 3.4 In `apps/web/src/useTable.ts`, keep `payout` in state, set it from `MSG_PAYOUT` and from `snapshot.payout`, and return it.
- [x] 3.5 Create `apps/web/src/payoutView.ts` with `coinLine(payout, userId)` returning the `+N coins` label (`+1 coin` when N is 1), the breakdown text such as `finished 10, won 10, Yatzy 3` (leaving out zero parts), and the viewer's balance or `null`. Add `payoutView.test.ts`, including a test that a `null` payout returns nothing to show.
- [x] 3.6 Add `CauldronCoinIcon` to `apps/web/src/icons.tsx`: a coin with a tiny cauldron mark, drawn with the existing `Icon` wrapper so it follows `currentColor`.
- [x] 3.7 Update `Results.tsx` and `App.tsx`: pass `payout` in; under each player's name show the coin line and quiet breakdown, and show the viewer's balance once. Render nothing (no empty line, no error) while `payout` is null, and fade in when it arrives, because the payout message can land just after the final move. Respect reduced motion (no animation, the line is simply there) and reuse `CountUp` for the total. Do not change the existing winner banner, standings or card-totals markup beyond adding the coin line.
- [x] 3.8 Add the matching styles in `styles.css`, using existing palette tokens. If a new text and background pairing is introduced, add it to `palette.test.ts`.
- [x] 3.9 Capture the Results screenshot (3 cards, two guests, light and dark if easy) into the proofs folder.

### [ ] 4.0 End-to-end proof, restart persistence and release readiness

Closes the spec. It proves the whole path in the real client and leaves the branch ready for a pull request into `develop`.

#### 4.0 Proof Artifact(s)

- Test: `e2e/tests/coins.spec.ts` plays a short 1-card, 2-guest game to Results and checks both coin lines, demonstrating the full slice in the production build (`task build` then `task e2e`).
- Test: a server test in `TableRoom.test.ts` finishes a game, shuts the server down, starts a new one on the same data directory, and shows the balance is unchanged, demonstrating a balance survives a restart.
- CLI: `task lint`, `task typecheck`, `task test`, `task build` and `task e2e` all exit 0, demonstrating no regressions and parity with the CI workflow.
- Diff: `README.md` has a short coins section (earnings table and where the code lives), demonstrating the feature is documented.

#### 4.0 Tasks

- [x] 4.1 Create `e2e/tests/coins.spec.ts`. Reuse the `sitDown` and `playTurn` helpers from `game.spec.ts` (move them to a shared helper file if that is the simplest way), set 1 card, play to the end with two guests, and assert each player sees a `+N coins` line, with the winner's amount higher, and that the winner banner is visible before the coin line (so Results showing first and coins arriving after is covered). Run the same test again with reduced motion emulated and assert the coin line is visible straight away. Confirm e2e runs with guest login on, and that the existing Results assertions in `game.spec.ts` still pass.
- [ ] 4.2 Add the restart-persistence server test using `startTestServer` twice with the same temporary database path (add a database option to `test-server.ts` if needed), then check the balance with `getBalance`.
- [ ] 4.3 Add a short "Coins" section to `README.md`: the earnings table, the solo rule, that only finished games pay, and where the code lives (`packages/rules/src/payout.ts`, `apps/server/src/db.ts`).
- [ ] 4.4 Run `task lint`, `task typecheck`, `task test`, `task build` and `task e2e`, and save a one-screen summary of the results to `docs/specs/01-spec-coins-and-payouts/01-proofs/ci-parity.txt`.
- [ ] 4.5 Commit in conventional-commit steps (rules, server, web, e2e and docs), leaving out the unrelated working-tree edits, and open a pull request into `develop`.
