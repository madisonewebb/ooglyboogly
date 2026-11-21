# Task 04 Proofs - End-to-end proof, restart persistence and release readiness

## Task Summary

This task closes the spec. It adds a server test showing coins survive a server restart, documents the feature in the README, and runs every gate that CI runs. The browser test for the Results screen (sub-task 4.1) was written in task 03, because the screenshot there needed it.

## What This Task Proves

- A balance written by one server is still there when a new server starts on the same data directory, and a second game adds to it.
- The whole slice works in the production build in a real browser, and the existing game, Results and reload tests still pass.
- Every gate CI runs passes locally: lint, typecheck, tests with the coverage threshold, build, manifests and e2e.
- The coin rules and where they live are documented in the README.

## Evidence Summary

- `TableRoom.test.ts` has 30 passing tests, including `keeps balances across a server restart`.
- `task e2e`: 6 passed, including `tests/coins.spec.ts` and both 1-card game tests.
- The full suite is 353 tests, with `packages/rules` at 100% statements, branches, functions and lines.

## Artifact: Restart persistence test

**What it proves:** After a game pays 1 coin (a solo game), the server and database are shut down, a new server opens the same data directory, and the balance is still 1. A second game then brings it to 2 and the `payouts` table has 2 rows.

**Why it matters:** Deploys and crashes restart the server, and the database file is what Litestream replicates. Coins must come back.

**Command:**

```bash
pnpm exec vitest run apps/server/src/rooms/TableRoom.test.ts -t "restart"
```

**Result summary:** The test passes as part of the 30-test file.

## Artifact: Browser test of the full slice

**What it proves:** Two guests play a full game in the production build and each sees the right coin lines and balance, with reduced motion on for one of them.

**Why it matters:** It is the only test that runs the real client, the real server and a real database together.

**Command:**

```bash
task build && task e2e
```

**Result summary:** 6 passed (3.7 minutes).

```text
  ✓  1 tests/coins.spec.ts       a finished game shows each player what they earned, and their new balance (1.1m)
  ✓  2 tests/game.spec.ts        two players finish a 1-card game (Take turns) (1.4m)
  ✓  3 tests/game.spec.ts        two players finish a 1-card game (Everyone at once) (1.2m)
  ✓  4 tests/game.spec.ts        a player who reloads keeps their seat (3.9s)
  ✓  5 tests/home.spec.ts        loads the home page (259ms)
  ✓  6 tests/home.spec.ts        health reports ok (21ms)
```

## Artifact: CI parity

**What it proves:** The same commands the CI workflow runs all exit 0 on this branch.

**Why it matters:** The pre-commit hook only runs `task lint`; this shows the rest of CI should pass too. The CI Docker image build was not run locally.

**Result summary:**

```text
task lint        exit 0
task typecheck   exit 0
task test        exit 0   23 files, 353 tests; Statements/Branches/Functions/Lines 100% on packages/rules
task build       exit 0
task manifests   exit 0
task e2e         exit 0   6 passed
```

## Artifact: README

**What it proves:** The earnings table, the solo rule, the finished-games-only rule and the code locations are written down, along with why the table is named `wallets`.

**Artifact path:** `README.md`, section `## Coins`.

## Reviewer Conclusion

Spec 01 is complete. A finished game pays every seated player once, the coins are saved and survive restarts, and players see what they earned. Nothing can be spent yet; the shop is spec 02.

## Notes

- Sub-task 4.5 asked for a pull request into `develop`. The work was committed straight to `develop` as requested, so there is no pull request and nothing has been pushed.
