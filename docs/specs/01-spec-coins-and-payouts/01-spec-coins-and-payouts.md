# 01-spec-coins-and-payouts.md

## Introduction/Overview

Oogly Boogly has no player accounts beyond a Discord id, and nothing a player does carries over from one game to the next. This spec adds the first half of the shop economy: a coin balance for each player, earned by finishing games and extra for winning. It stores balances in the game database and tells players what they earned on the Results screen. There is nothing to spend coins on yet. The shop, inventory and cosmetics arrive in specs 02 to 04, and they all depend on the balance and payout built here.

## Goals

- Every Discord player has a persistent coin balance that survives a server restart.
- A finished game pays each seated player exactly once, using a formula that scales with the number of cards (3 cards is the baseline: a game with 1 win is about 40 coins over 3 games).
- Winning pays more than losing, but not so much that wins dominate: win bonus equals the finish payout.
- Solo games pay almost nothing (1 coin), so coins can't be farmed alone.
- The server alone computes and records payouts; a client can never claim or change one.
- The Results screen shows each player what they earned and how it was made up.

## User Stories

- **As a player**, I want to earn coins for finishing games so that playing with my family feels rewarded.
- **As a winner**, I want a bonus for winning so that winning feels like it matters without making everyone else's game pointless.
- **As a player in a longer game**, I want 5-card games to pay more than 1-card games so that my time is respected.
- **As a player**, I want to see what I earned and my new balance on the Results screen so that I know how close I am to something I want.
- **As the host**, I want coins to be safe from cheating and double-counting so that the game stays fair for everyone.

## Demoable Units of Work

### Unit 1: The payout rules

**Purpose:** Define exactly how many coins each player earns from a finished game, as a pure function that anyone can test without a server. It serves the server (which will call it) and the Results screen (which will show the breakdown).

**Functional Requirements:**

- The system shall provide a pure function `computePayouts(game, seats)` in `packages/rules` (or `packages/shared` if it needs seat identity) that takes a finished game and returns, for each seat, a total and a breakdown of `{ finish, win, yatzy }`.
- The system shall pay, for a game with 2 or more seated players and `cards` cards each, a finish amount of `round(10 × cards ÷ 3)` coins to every seat.
- The system shall pay every seat tied for the highest `playerTotal` a win bonus of `floor(round(10 × cards ÷ 3) ÷ winners)`, so a tie splits the bonus, rounded down.
- The system shall pay `cards` coins (that is, `3 × cards ÷ 3`) once per game to a seat that scored a Yatzy (a Yatzy box filled with the `YATZY` value, or any Yatzy bonus on any of its cards), no matter how many Yatzys they scored.
- The system shall pay a game with exactly one seat a flat 1 coin for finishing, and no win bonus and no Yatzy bonus, regardless of the number of cards.
- The system shall return the table below for the finish and win amounts, which is used as the test oracle: 1 card pays 3 and 3, 2 cards 7 and 7, 3 cards 10 and 10, 4 cards 13 and 13, 5 cards 17 and 17.
- The system shall refuse to compute payouts for a game that is not finished.

**Proof Artifacts:**

- Test: unit tests cover each card count 1 to 5, ties between 2 and 3 winners, a Yatzy and a Yatzy bonus on several cards, a solo game and an unfinished game; they demonstrate the formula matches the table above.
- Test: a property test shows no seat ever earns a negative amount and total coins from one game never exceed `seats × finish + finish + seats × cards`, which demonstrates there is no runaway payout.

### Unit 2: Balances that persist, and one payout per game

**Purpose:** Store each player's coins and pay a finished game exactly once, including after reconnects and server restarts. It serves every player and protects the economy from double payouts.

**Functional Requirements:**

- The system shall create `players` (Discord id, coin balance, created and updated times) and `payouts` (game id, user id, coins, breakdown as JSON, time) tables in the existing SQLite database, with a unique key on `(game_id, user_id)`.
- The system shall give each game a unique id (a random UUID) when the host starts it, held by the room next to the move log.
- The system shall, when the server applies the final move and the game becomes finished, compute payouts with the Unit 1 function and write all payout rows and balance updates in a single database transaction.
- The system shall never pay the same `(game_id, user_id)` twice, even if the payout code runs again, and shall treat a repeated payout as a no-op rather than an error.
- The system shall pay only seated players, and shall pay nothing to spectators.
- The system shall pay guests (ids starting with `guest-`) only when guest login is enabled (local dev and e2e), and shall never create `players` rows for guests when it is disabled.
- The system shall pay nothing for a game that never finishes, including when the room is abandoned or the server restarts mid-game.
- The system shall keep paying a seat whose player is disconnected when the game finishes, because the seat is fixed once the game starts.
- The system shall keep a client from sending anything that changes a balance: no client message creates, edits or requests a payout.

**Proof Artifacts:**

- Test: `TableRoom.test.ts` plays a full game with two players and shows both balances and payout rows are written once, with a winner bonus, which demonstrates the end-to-end server flow.
- Test: finishing the same game a second time (the payout function called twice) leaves balances unchanged, which demonstrates idempotency.
- Test: a database is closed and reopened and the balance is unchanged, which demonstrates persistence.
- CLI: `sqlite3 data/rollhouse.db 'select * from payouts'` after a dev game shows one row per seat, which demonstrates the real file is written.

### Unit 3: Results screen shows what you earned

**Purpose:** Tell each player what they earned and their new balance when the game ends, so slow earning feels visible. It serves every player at the table.

**Functional Requirements:**

- The system shall send each connected client a payout message after the game finishes, containing every seat's coins and breakdown, and the receiving player's new balance.
- The system shall include the same payout in the snapshot a client receives when it joins or reconnects to a finished game, so a player who was away still sees it.
- The Results screen shall show, for each player, a line such as `+17 coins` with the breakdown (`finished 10, won 10, Yatzy 3`), and show the viewing player's new total balance.
- The Results screen shall show nothing about coins for a guest when payouts are off, and shall not show an error or an empty line.
- The Results screen shall keep its current layout, motion and reduced-motion behavior, and the coin line shall meet the contrast checks in `palette.test.ts`.
- The system shall show the coin amount to spectators who are watching but shall not show them a balance.

**Proof Artifacts:**

- Screenshot: Results screen after a 3-card, 2-player game shows `+20 coins` for the winner and `+10 coins` for the other player with the breakdown, which demonstrates the display.
- Test: a Playwright e2e plays a short game through to Results and checks the coin line, which demonstrates the whole slice in the real client.
- Test: a reconnect after the game ends shows the same payout, which demonstrates the snapshot path.

## Non-Goals (Out of Scope)

1. **A shop, prices, inventory or equipping**: these are spec 02. Coins can be earned here but not spent.
2. **Cosmetics of any kind**: dice skins, brews, pets, celebrations and sticker packs are specs 03 and 04.
3. **Milestone, daily or login bonuses**: coins come only from finished games.
4. **Real-money purchases, gifting or trading** between players.
5. **A balance display in the lobby or anywhere outside Results**: the lobby balance arrives with the shop in spec 02.
6. **Game history, stats or leaderboards**: the `payouts` table will hold the data, but no screen reads it.
7. **Admin tools for editing balances**: fixes are made directly in the database for now.

## Design Considerations

The coin line on the Results screen follows the existing look: the same name plates, the Fredoka display face and the lavender and pink palette. The look is witchy and cozy, with only a light feminine touch and no candy styling. Show the coin icon as a small themed glyph in `icons.tsx`: a cauldron coin (a coin stamped with a little cauldron or the Oogly Boogly hex). It is a simple vector icon that follows the palette tokens, so no generated art is needed for this spec; spec 02 may reuse it in the shop. The breakdown is quiet secondary text, and the total is the one thing that stands out. The count-up animation already used for scores (`CountUp`) can be reused for the coin total. All text must pass the WCAG AA pairings in `palette.test.ts` in both themes and in all three color schemes.

## Repository Standards

- Follow the existing layout: pure rules in `packages/rules`, shared message and type names in `packages/shared/src/protocol.ts`, server code in `apps/server/src` and the client in `apps/web/src`.
- Tests live beside the code as `*.test.ts` and run with Vitest (`task test`); rules coverage is enforced, so the payout function needs thorough tests. End-to-end tests are Playwright (`task e2e`).
- Run `task lint`, `task typecheck`, `task test` and `task build` before committing; the pre-commit hook runs `task lint`.
- Commits use conventional commit messages (`feat(server): …`, `feat(web): …`); release-please builds the changelog from them.
- The database is `node:sqlite` (`DatabaseSync`) in WAL mode for Litestream replication; new tables must work with Litestream and need `CREATE TABLE IF NOT EXISTS` at startup, like `boots` does today.
- Client code receives the game as a move log and replays it with the shared rules engine; the server stays the only source of truth for anything with consequences, and clients send intents only.

## Technical Considerations

- **Where the payout runs:** `TableRoom.ts` already applies each accepted move and keeps the game state. When the applied move makes `game.finished` true, call the payout step once. The room also holds the game in memory only, so a game id must be created at start; it need not survive a restart because an unfinished game pays nothing.
- **Idempotency:** the unique key on `(game_id, user_id)` is the real guard. Use `INSERT … ON CONFLICT DO NOTHING` and update the balance only for rows that were inserted, all in one transaction (`BEGIN IMMEDIATE`), so a crash cannot leave a payout without a balance update or the reverse.
- **Identity:** use `SessionUser.id` (the Discord id) as the player key. The session is signed by the server, so the id cannot be forged by a client.
- **Money is integers:** store coins as integer columns and compute with integer math. The `round` and `floor` rules above must be implemented exactly so the test table passes.
- **Ledger first:** the balance in `players` is a cache of the sum of `payouts` (and, from spec 02, of purchases). Keep the payout rows as the source of truth so a balance can be audited or rebuilt.
- **Migrations:** `db.ts` currently says Drizzle arrives in a later milestone. This spec keeps plain `CREATE TABLE IF NOT EXISTS` statements to match the file as it is; moving to Drizzle is a separate decision (see Open Questions).
- **Protocol:** add a payout message name and types to `protocol.ts` next to the existing ones, and an optional payout field to `Snapshot`. Bump nothing else; clients built for another server version already reload on a version mismatch.
- **Tests with time:** the room tests already run a real game; extend them rather than building a second harness.

## Security Considerations

- Balances and payouts are written only by server code that runs after the rules engine has accepted the final move; no message from a client can trigger or alter a payout.
- Session tokens, `sessionSecret` and Discord secrets must not appear in logs, test output or proof artifacts. Proof artifacts show Discord ids only as test values.
- Do not commit `data/rollhouse.db`, its `-wal` and `-shm` files, or any screenshot that contains a real player's name or Discord id. Use guest accounts for proofs.
- Guest payouts exist only when `GUEST_LOGIN` is on, which is never the case in staging or production, so guest ids cannot be used to mint coins in a real environment.
- Treat the payout as untrusted-input-free: the only inputs are the server's own game state and seat list, so no input validation is needed beyond what the rules engine already does.

## Success Metrics

1. **Formula correctness**: the Unit 1 test table passes for every card count from 1 to 5, with 100% coverage on the payout function.
2. **No double pay**: a test that finishes and re-runs the payout for the same game leaves every balance unchanged.
3. **Pacing**: a simulated 3-card game with 3 players averages about 13 coins per player per game, so a common item (40 coins, in spec 02) takes about 3 games.
4. **Persistence**: a balance survives a server restart in an end-to-end run.
5. **No regressions**: `task lint`, `task typecheck`, `task test`, `task build` and `task e2e` all pass.

## Open Questions

No open questions at this time. Decisions confirmed on review:

1. **Database layer:** plain SQL (`CREATE TABLE IF NOT EXISTS`), matching `db.ts`. Moving to Drizzle is a separate later decision.
2. **Guests in dev:** guests earn coins only when guest login is enabled, so the flow is testable.
3. **A stuck game** (a player who never returns): out of scope here; a forfeit or end-game option can be its own spec.
4. **Ties:** the win bonus is split with `floor`, so a 3-way tie in a 1-card game pays 1 coin each.
5. **Coin icon:** a themed cauldron coin.
