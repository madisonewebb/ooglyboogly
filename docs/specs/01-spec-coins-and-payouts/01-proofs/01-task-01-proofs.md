# Task 01 Proofs - Payout rules as a pure, fully tested function

## Task Summary

This task adds `computePayouts` and the coin constants in `packages/rules/src/payout.ts`. Given a finished game, it returns what every seat earns, with a breakdown of finishing, winning and Yatzy coins. It is pure code, with no server, database or UI, so the numbers can be checked on their own before anything depends on them.

## What This Task Proves

- Finish and win amounts follow the spec table: 3, 7, 10, 13 and 17 coins for 1 to 5 cards.
- Ties split the win bonus and round down, including a 3-way tie in a 1-card game paying 1 each.
- A Yatzy pays once per game (the Yatzy box at 50, or any Yatzy bonus) and scales with the number of cards.
- A solo game pays a flat 1 coin, and an unfinished game is refused.
- The repository's 100% coverage gate on `packages/rules` still holds.

## Evidence Summary

- `payout.test.ts` passes with 22 tests, covering each row of the table and every edge case in the spec.
- A property test shows no amount is negative and one game's total stays within `seats × finish + finish + seats × cards`. I checked it is not hollow by breaking the tie split on purpose: the property failed, then I restored the code.
- `task test` reports 100% statements, branches, functions and lines.

## Artifact: Payout unit tests

**What it proves:** The formula matches the spec for every card count, tie, Yatzy and solo case.

**Why it matters:** The payout is money in this game. This file is the oracle every later task relies on.

**Command:**

```bash
pnpm exec vitest run packages/rules/src/payout.test.ts
```

**Result summary:** 1 file and 22 tests passed.

```text
 Test Files  1 passed (1)
      Tests  22 passed (22)
```

## Artifact: Property test, including a deliberate break

**What it proves:** No payout is negative, and one game never pays more than the stated bound. The property catches a wrong tie split.

**Why it matters:** It guards against runaway payouts for combinations the example tests do not list.

**Command:**

```bash
pnpm exec vitest run packages/rules/src/properties.test.ts
```

**Result summary:** The property passes on the real code. With the tie split temporarily replaced by paying every winner the full bonus, it failed (`Property failed after 19 tests`); the real code was restored afterwards and passes.

## Artifact: Full test run with coverage

**What it proves:** All 318 tests pass and `packages/rules` keeps 100% coverage, including the new file.

**Why it matters:** The repository enforces this threshold in `vitest.config.ts`, and CI runs it.

**Command:**

```bash
task test
```

**Result summary:** 21 files and 318 tests passed, with 100% coverage on every measure.

```text
 Test Files  21 passed (21)
      Tests  318 passed (318)
Statements   : 100% ( 242/242 )
Branches     : 100% ( 155/155 )
Functions    : 100% ( 69/69 )
Lines        : 100% ( 190/190 )
```

## Artifact: Lint and typecheck

**What it proves:** The new code and tests follow the repository's lint, format and type rules.

**Why it matters:** The pre-commit hook runs `task lint`, so the commit cannot land without it.

**Command:**

```bash
task lint && task typecheck
```

**Result summary:** Both passed after the new markdown files were formatted with Prettier.

## Reviewer Conclusion

The payout rules are in one tested place and match the spec's numbers exactly. Tasks 2.0 and 3.0 can call `computePayouts` without re-deciding any amounts.
