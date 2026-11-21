# Task 01 Proofs - Pure mood and celebration logic with tests

## Task Summary

This task adds the pure code that decides what a pet feels and when the Ghost Parade fires, plus the dev-only `?cosmetics=` parser, and turns on the `available` flag for exactly the five items this spec draws. No screen code is involved yet.

## What This Task Proves

- A roll, a score and an undo are read off two consecutive replayed game states, and a reconnect (the same log replayed) produces no events.
- A Yatzy cheers, a good roll or any score is happy, a 0 or an empty last roll is sad, anything else is quiet.
- One Yatzy is one parade: the Yatzy score that follows a Yatzy roll does not fire again.
- Only the five catalog flags changed.

## Evidence Summary

- 34 tests pass in `apps/web/src/cosmetics`, built on games played with the real rules engine (`createGame` and `applyMove`), not hand-made states.
- While writing them, two real bugs surfaced and were fixed: an undo was read as a roll (it restores the turn's roll counter), and a four-move catch-up slipped through because rolls reset to zero after each score. The tests for both are in the file.

## Artifact: unit tests

**Command:**

```bash
pnpm exec vitest run apps/web/src/cosmetics
```

**Result summary:** all pass.

```text
 RUN  v5.1.0 /home/madi/projects/ooglyboogly-wt/spec-04-pets-celebrations
 Test Files  2 passed (2)
      Tests  34 passed (34)
```

## Artifact: catalog flags

**Command:** `git diff packages/shared/src/catalog.ts`

**Result summary:** five items gained `true` as their last argument: `toad`, `blackCat`, `bat`, `ghostCheerleader` and `ghostParade`. Nothing else in the file changed.
