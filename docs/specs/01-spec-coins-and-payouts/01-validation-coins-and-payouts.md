# 01-validation-coins-and-payouts.md

## 1) Executive Summary

- **Overall:** **PASS.** No gate tripped. There are 2 MEDIUM and 5 LOW issues, all about traceability or wording, none about behavior.
- **Implementation Ready:** **Yes.** Every functional requirement has a passing proof, all CI-equivalent gates exit 0, and a fresh browser run of the full slice passes. The remaining items are documentation fixes.
- **Key metrics:**
  - Functional requirements verified: **22 / 22 (100%)**
  - Proof artifacts working: **18 / 18 (100%)**, 3 of them with a planned file path that does not exist (see issue M1)
  - Spec success metrics verified: **5 / 5**
  - Files changed: **33** committed across 5 commits, **0** unmapped core files (1 core file missing from the Relevant Files table, see M2)
  - Test run: 23 files, 353 tests; `packages/rules` at 100% statements, branches, functions and lines (`payout.ts` included)

### Gates

| Gate                                         | Result          | Basis                                                                                                                   |
| -------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| A: no CRITICAL or HIGH issue                 | PASS            | None found                                                                                                              |
| B: no `Unknown` in the coverage matrix       | PASS            | 22 of 22 requirements Verified                                                                                          |
| C: proof artifacts accessible and functional | PASS            | Every command and test re-run in this validation; 3 planned evidence file paths differ (M1), the evidence itself exists |
| D1: no unmapped out-of-scope core change     | PASS            | Every core change maps to a requirement (table below)                                                                   |
| D2/D3: supporting-file linkage               | PASS with notes | Tests, docs and proofs link to core changes; one core UI file missing from the file table (M2)                          |
| E: repository standards                      | PASS            | See the standards table                                                                                                 |
| F: no secrets in proof artifacts             | PASS            | Scan found only the word "token" in design-token prose; no keys, tokens, passwords or real Discord ids                  |

## 2) Coverage Matrix

### Functional Requirements

Commits: `1a899d5` (task 1.0), `3d27cac` (2.0), `7e5a988` (3.0 and the `wallets` rename), `5fc7fa0` (4.0), `137938c` (spec and audit).

| Requirement                                                                           | Status   | Evidence                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1-1 Pure `computePayouts` in `packages/rules` returning total and breakdown per seat | Verified | `packages/rules/src/payout.ts`; `payout.test.ts` (14 tests); commit `1a899d5`. Signature is `computePayouts(state)` rather than `(game, seats)` (L1)                                          |
| U1-2 Finish amount `round(10 × cards ÷ 3)` for 2+ players                             | Verified | `payout.test.ts` finish and win by card count (5 rows); `scaled` tests                                                                                                                        |
| U1-3 Win bonus to every top seat, split with `floor`                                  | Verified | `payout.test.ts` ties (2-way, 3-way paying 1 each in a 1-card game, lone winner)                                                                                                              |
| U1-4 Yatzy coins once per game (box at 50, or any bonus)                              | Verified | `payout.test.ts` Yatzy cases: box, bonus-only on a later card, several Yatzys pay once, a 0 box pays nothing, scales 1 to 5                                                                   |
| U1-5 Solo game pays a flat 1, no win, no Yatzy                                        | Verified | `payout.test.ts` solo at 1, 3 and 5 cards                                                                                                                                                     |
| U1-6 Table oracle 3/3, 7/7, 10/10, 13/13, 17/17                                       | Verified | `payout.test.ts` `it.each` rows exactly as the spec table                                                                                                                                     |
| U1-7 Refuses an unfinished game                                                       | Verified | `payout.test.ts` `refuses a game that is not finished`                                                                                                                                        |
| U2-1 `wallets` and `payouts` tables, unique `(game_id, user_id)`                      | Verified | `apps/server/src/db.ts:29-39`; `db.test.ts` tables test. Named `wallets`, not `players`, with the reason recorded in the spec and tasks                                                       |
| U2-2 Random UUID per game, made at start                                              | Verified | `TableRoom.ts:270` (`randomUUID()`); room tests check UUID format and that two games differ                                                                                                   |
| U2-3 Pay all seats in one transaction when the final move lands                       | Verified | `TableRoom.ts:418` calls `settlePayout()` after the final move; `db.ts:80` `BEGIN IMMEDIATE`; `db.test.ts` rollback test; room full-game test                                                 |
| U2-4 Never pay a `(game, user)` twice; repeat is a no-op                              | Verified | `db.ts:72` `ON CONFLICT … DO NOTHING`; `db.test.ts` `pays the same game only once`; `paid` guard at `TableRoom.ts:428-429`                                                                    |
| U2-5 Seated players only                                                              | Verified | Room test `pays spectators nothing`                                                                                                                                                           |
| U2-6 Guests only when guest login is on; no wallet rows otherwise                     | Verified | `TableRoom.ts:433`; room guest test (also fails when the rule is removed: checked by a deliberate break)                                                                                      |
| U2-7 Unfinished game pays nothing                                                     | Verified | Room test `pays nothing for a game that is not finished`                                                                                                                                      |
| U2-8 Disconnected seat still paid                                                     | Verified | Room test `still pays a seat whose player is disconnected…`                                                                                                                                   |
| U2-9 No client message can create or change a payout                                  | Verified | Room test `lets no client message create or change a payout` (invented messages get the client disconnected, balance stays 0)                                                                 |
| U3-1 Payout message to each connected client with own balance                         | Verified | Room test `tells every client what was earned, and each their own balance`; `protocol.ts:179`                                                                                                 |
| U3-2 Payout in the snapshot on join and rejoin                                        | Verified | Room test `puts the payout in the snapshot of anyone who joins or comes back later`; `protocol.ts:154`                                                                                        |
| U3-3 Results shows `+N coins`, breakdown and viewer's balance                         | Verified | `payoutView.test.ts` (9), `Results.test.tsx` (4), `coins.spec.ts`, `results-coins.png`                                                                                                        |
| U3-4 Nothing about coins, and no error, when payouts are off                          | Verified | Room test `sends no payout when nobody was paid`; `Results.test.tsx` renders no coin text with a null payout                                                                                  |
| U3-5 Layout, motion, reduced motion and contrast kept                                 | Verified | `coins.spec.ts` reduced-motion context (opacity 1 at once); existing `game.spec.ts` Results assertions pass; coin text uses existing `text` and `quiet` pairings already in `palette.test.ts` |
| U3-6 Spectators see amounts but no balance                                            | Verified | Room test (spectator `balance` is `null`); `Results.test.tsx` spectator case                                                                                                                  |

Spec success metrics:

| Metric                                                                         | Status   | Evidence                                                                                                                                               |
| ------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Formula correct, 100% coverage on the payout function                       | Verified | Coverage summary: `packages/rules/src/payout.ts` 100% statements, branches, functions, lines                                                           |
| 2. No double pay                                                               | Verified | `db.test.ts` repeat payout; `paid` guard                                                                                                               |
| 3. Pacing: about 13 coins per player per game, about 3 games to a 40-coin item | Verified | Simulation of 20,000 three-card, three-player games with random scores (4% Yatzy per card): **13.68 coins per player per game, 2.9 games to 40 coins** |
| 4. Balance survives a restart                                                  | Verified | `TableRoom.test.ts` `keeps balances across a server restart`; `db.test.ts` reopen                                                                      |
| 5. No regressions                                                              | Verified | All six `task` gates exit 0; fresh e2e 6 passed                                                                                                        |

### Repository Standards

| Standard Area                                                              | Status   | Evidence & Compliance Notes                                                          |
| -------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| Code layout (rules in `packages/rules`, protocol in `shared`, server, web) | Verified | New code sits where the spec said; message names are in `protocol.ts`                |
| Lint and format (`task lint`)                                              | Verified | Exit 0; pre-commit hook runs the same                                                |
| Types (`task typecheck`)                                                   | Verified | Exit 0 for all five packages                                                         |
| Tests beside the code; rules coverage gate                                 | Verified | `*.test.ts` next to sources; 100% on `packages/rules`                                |
| Playwright e2e                                                             | Verified | New `coins.spec.ts`; 6 of 6 pass in a fresh run                                      |
| Fair dice: no `Math.random` in server or rules                             | Verified | Search finds only a comment in `dice.ts`; game id uses `randomUUID`                  |
| Database: WAL-friendly, `CREATE TABLE IF NOT EXISTS` at startup            | Verified | `db.ts`; a test covers a database that still has the old reverted tables             |
| Server is the source of truth; clients send intents only                   | Verified | No client message pays; unknown messages disconnect the client                       |
| Conventional commits with task and spec references                         | Verified | `feat(rules)`, `feat(server)`, `feat:`, `docs:`; each has `Related to T… in Spec 01` |
| Documentation                                                              | Verified | README `## Coins` section                                                            |
| Feature branches with pull requests into `develop` (README)                | Noted    | Committed directly to `develop` at the user's request (L5)                           |

### Proof Artifacts

| Unit/Task | Proof Artifact                                                                   | Status       | Verification Result                                                                                                                                                                                                       |
| --------- | -------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0       | `payout.test.ts` passes with the card-count table, ties, Yatzy, solo, unfinished | Verified     | Re-run: `payout.test.ts` and `properties.test.ts` 28 tests passed                                                                                                                                                         |
| 1.0       | Property test on payout bounds                                                   | Verified     | In the 28 above; a deliberate break of the tie split made it fail                                                                                                                                                         |
| 1.0       | `task test` shows 100% for `payout.ts`                                           | Verified     | Coverage summary: `payout.ts` 100/100/100/100                                                                                                                                                                             |
| 1.0       | Planned file `rules-coverage.txt`                                                | Path missing | Evidence is in `01-task-01-proofs.md` (M1)                                                                                                                                                                                |
| 2.0       | `db.test.ts` (tables, atomic, idempotent, persistent)                            | Verified     | Server suite re-run: 67 tests passed                                                                                                                                                                                      |
| 2.0       | Full two-player game pays once with a winner bonus                               | Verified     | `TableRoom.test.ts`                                                                                                                                                                                                       |
| 2.0       | Spectator, guest, unfinished, disconnected-seat rules                            | Verified     | `TableRoom.test.ts`                                                                                                                                                                                                       |
| 2.0       | Real database file after a real dev game                                         | Verified     | `01-task-02-proofs.md` shows one game id, two rows, balances 3 and 6. Used `node:sqlite` as there is no `sqlite3` CLI; planned `payouts-rows.txt` path is missing (M1). Run made before the `wallets` rename, and says so |
| 3.0       | Room payout message and snapshot tests                                           | Verified     | `TableRoom.test.ts`                                                                                                                                                                                                       |
| 3.0       | `payoutView.test.ts`                                                             | Verified     | Web suite re-run: 155 tests passed                                                                                                                                                                                        |
| 3.0       | `Results.test.tsx` render tests                                                  | Verified     | 4 tests passed                                                                                                                                                                                                            |
| 3.0       | Screenshot of the Results screen                                                 | Verified     | `results-coins.png` exists, embedded inline in `01-task-03-proofs.md` with its path above it; shows +6 and +3 and "You now have 3 coins"                                                                                  |
| 3.0       | Contrast via `palette.test.ts`                                                   | Verified     | Passes; no new pairing needed                                                                                                                                                                                             |
| 3.0       | Reduced-motion Playwright check                                                  | Verified     | `coins.spec.ts` passes in the fresh run                                                                                                                                                                                   |
| 4.0       | `coins.spec.ts` plays a game to Results                                          | Verified     | Fresh run: `✓ coins.spec.ts … (1.1m)`                                                                                                                                                                                     |
| 4.0       | Restart persistence test                                                         | Verified     | `TableRoom.test.ts`                                                                                                                                                                                                       |
| 4.0       | All gates exit 0                                                                 | Verified     | lint, typecheck, test, build, manifests, e2e all exit 0; planned `ci-parity.txt` path is missing (M1)                                                                                                                     |
| 4.0       | README coins section                                                             | Verified     | `README.md` `## Coins`                                                                                                                                                                                                    |

## 3) Validation Issues

| Severity    | Issue                                                                                                                                                                                                                                                                                                                                                                                             | Impact                                                                                              | Recommendation                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| MEDIUM (M1) | Three evidence file paths named in the task list do not exist: `01-proofs/rules-coverage.txt` (task 1.9), `01-proofs/payouts-rows.txt` (task 2.0 artifact and 2.9) and `01-proofs/ci-parity.txt` (task 4.4). The evidence was put inside `01-task-01-proofs.md`, `01-task-02-proofs.md` and `01-task-04-proofs.md` instead. Evidence: `ls 01-proofs/`                                             | Traceability: a reviewer following the task list lands on missing files, though the evidence exists | Edit the task list so each of those three lines points at the proof markdown that holds the evidence |
| MEDIUM (M2) | `apps/web/src/payout.css` is a new core UI file that is not in the Relevant Files table, and the table and task 3.8 say the styles go in `styles.css`. The change was deliberate (`styles.css` had unrelated uncommitted edits that would have been swept into the commit) but is not written down anywhere. Evidence: changed-file list vs table; `git show 7e5a988` message does not mention it | Traceability: the deviation is visible only in the diff                                             | Add `payout.css` to the Relevant Files table and a Notes line saying why; no code change             |
| LOW (L1)    | The spec says `computePayouts(game, seats)`; the code has `computePayouts(state)`, taking the seat count from `state.setup.players`. Task 1.2 records the real signature, the spec was not updated                                                                                                                                                                                                | Wording drift between spec and code                                                                 | Change the spec sentence to `computePayouts(state)`                                                  |
| LOW (L2)    | The spec's Unit 3 screenshot artifact describes a 3-card game with `+20 coins` and `+10 coins`; the evidence is a 1-card game (+6 and +3). The tasks file and the proof say why: a 3-card game takes three times as long to play, and the 3-card amounts are covered by unit tests                                                                                                                | Evidence differs from the spec's wording; behavior is verified                                      | Reword the spec artifact to a 1-card game, or add a 3-card screenshot later                          |
| LOW (L3)    | The message of commit `3d27cac` says "players and payouts tables"; the table was renamed to `wallets` in `7e5a988`, whose message explains it                                                                                                                                                                                                                                                     | History reads inconsistently                                                                        | None; do not rewrite history                                                                         |
| LOW (L4)    | Everything ran on Node v24.22.1, while `package.json` requires `>=26.13.1 <27` (pnpm warns on every command). `node:sqlite` and `db.isTransaction` are used                                                                                                                                                                                                                                       | Not run on the required Node version                                                                | Let CI (which uses `.nvmrc`) confirm before merging                                                  |
| LOW (L5)    | README says feature work goes through pull requests into `develop`; this work was committed straight to `develop`, at the user's request. Four unrelated working-tree edits (`Brand.tsx`, `LobbyDie.tsx`, `styles.css`, `palette.ts`) remain uncommitted and are not part of any spec commit                                                                                                      | None for validation; a process note                                                                 | Review the five commits, then push or open a pull request as you prefer                              |

Outside this spec's scope but worth knowing: staging and production databases may still hold the old `players` and `ledger` tables from the reverted coins version (`d9192dd`, reverted in `d40345c`). This implementation works alongside them and does not migrate any old balances.

## 4) Evidence Appendix

### Git commits analyzed (`115e0a8..HEAD`)

| Commit    | Summary                                                           | Files                                                                                                                                                                                                                                                      |
| --------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `137938c` | docs: spec, planning audit                                        | spec and audit                                                                                                                                                                                                                                             |
| `1a899d5` | feat(rules): coin payout for a finished game                      | `payout.ts`, `payout.test.ts`, `index.ts`, `test-helpers.ts`, `properties.test.ts`, tasks, proof 01                                                                                                                                                        |
| `3d27cac` | feat(server): record coins and pay a finished game once           | `db.ts`, `db.test.ts`, `app.ts`, `index.ts`, `TableRoom.ts`, `TableRoom.test.ts`, `protocol.ts` (`isGuestId`), tasks, proof 02                                                                                                                             |
| `7e5a988` | feat: show what a finished game paid on the Results screen        | `protocol.ts`, `TableRoom.ts` and tests, `useTable.ts`, `payoutView.ts` and test, `payout.css`, `icons.tsx`, `Results.tsx` and test, `App.tsx`, e2e (`coins.spec.ts`, `helpers.ts`, `game.spec.ts`, `playwright.config.ts`), docs, proof 03 and screenshot |
| `5fc7fa0` | docs: coins section in the README, and a restart-persistence test | `README.md`, `TableRoom.test.ts`, tasks, proof 04                                                                                                                                                                                                          |

### Changed files by class

- **Core (all mapped to a requirement):** `payout.ts` (U1), `db.ts` (U2-1, 2-3, 2-4), `TableRoom.ts` (U2, U3-1, U3-2), `app.ts` and `index.ts` (U2 wiring), `protocol.ts` (U3-1, U3-2, `isGuestId` for U2-6), `useTable.ts`, `payoutView.ts`, `Results.tsx`, `App.tsx`, `icons.tsx` and `payout.css` (U3-3 to U3-6).
- **Supporting (linked):** all `*.test.ts(x)`, `e2e/tests/*`, `e2e/playwright.config.ts` (linked in `7e5a988`: gives e2e its own data directory), `README.md`, and the spec, audit, tasks, proofs and screenshot under `docs/specs/01-spec-coins-and-payouts/`.
- **Planned but unchanged:** `test-server.ts`, `styles.css`, `palette.test.ts`; none needed changes.

### Commands run in this validation

| Command                                                                                        | Result                                                                   |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm exec vitest run packages/rules/src/payout.test.ts packages/rules/src/properties.test.ts` | 2 files, 28 tests passed                                                 |
| `pnpm exec vitest run apps/server`                                                             | 7 files, 67 tests passed                                                 |
| `pnpm exec vitest run apps/web`                                                                | 8 files, 155 tests passed                                                |
| `pnpm exec vitest run --coverage` (whole repo)                                                 | 23 files, 353 tests passed                                               |
| Coverage summary (`json-summary`) for `packages/rules`                                         | total and `payout.ts`: 100% statements, branches, functions, lines       |
| Pacing simulation, 20,000 games, 3 players, 3 cards                                            | 13.68 coins per player per game; 2.9 games to 40 coins                   |
| `task e2e` (fresh, 2026-11-21 21:14 UTC)                                                       | 6 passed (3.7 min), including `coins.spec.ts`                            |
| Earlier in this session, same tree                                                             | `task lint`, `typecheck`, `test`, `build`, `manifests`, `e2e` all exit 0 |
| Security scan of spec docs, proofs and the new tests                                           | No keys, tokens, passwords or Discord ids                                |

### Checks I did not run

- The CI Docker image build (`docker` job in `ci.yaml`).
- Anything on Node 26, the version the project requires.
- A 3-card browser game; the 3-card amounts are checked by unit tests only.

---

**Validation Completed:** 2026-11-21 21:15 UTC
**Validation Performed By:** Claude Sonnet 5.5 (`claude-sonnet-5-5`)
