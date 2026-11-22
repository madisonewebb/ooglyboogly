# Task 01 Proofs - Pure Yatzy-roll detection with tests

## Task Summary

This task adds `yatzyRollsBetween(prev, next)`, the pure function that decides when a Yatzy roll has happened and who rolled it, from two consecutive replayed game states. No screen code is involved.

## What This Task Proves

- A roll that makes five of a kind returns the roller's seat, once.
- The same position again (a replay, a reconnect, a snapshot), a catch-up of several moves, a roll that is not five of a kind, an undo and re-rolling already-held Yatzy dice all return nothing.
- Each Yatzy in a game fires, in Take turns and Everyone at once, with several cards, and two at once return both seats.

## Evidence Summary

- 10 tests in `yatzyRolls.test.ts`, all built from games played with the real rules engine (`createGame`, `applyMove`), not hand-made states.
- Not vacuous: I removed the undo guard and the held-Yatzy guard in turn and ran the file. Removing the undo guard failed "is not fooled by an undo"; removing the held guard failed that test too (and the undo test, since that line was removed after the first mutation). Both guards were restored.
- Why not reuse spec 04's `eventsBetween`: it returns no events at all when two players rolled in one update, which can happen in Everyone at once, and a Yatzy would be lost silently.

## Artifact: unit tests

**Command:**

```bash
pnpm exec vitest run apps/web/src/celebrations/yatzy/yatzyRolls.test.ts
```

**Result summary:** `Test Files 1 passed`, `Tests 10 passed`.

## Reproduce

Run the command above; to repeat the mutation check, delete `|| undid(before, now)` from `yatzyRolls.ts` and rerun: one test fails.
