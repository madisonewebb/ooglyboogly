# 04-validation-pets-and-celebrations.md

## Validation Report

Spec: `04-spec-pets-and-celebrations.md`. Branch `feat/spec-04-pets-celebrations`.

## Gate Results

| Gate                     | Result                                                                                                                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `task lint`              | exit 0                                                                                                                                                                                   |
| `task typecheck`         | exit 0                                                                                                                                                                                   |
| `task test`              | exit 0, 33 files and 433 tests, rules coverage 100%. (One earlier run hit a 5 s timeout in the untouched `packages/rules` property test while the machine was loaded; the rerun passed.) |
| `task build`             | exit 0 (a normal build, no `VITE_LAB`)                                                                                                                                                   |
| `E2E_PORT=8093 task e2e` | NOT fully green: 7 of 8 passed on the first run, the one failure being `game.spec.ts` "two players finish a 1-card game (Take turns)". See below.                                        |

### The e2e failure

The failing test times out on the 5 s `expect(... 'Die 1, rolling' ...).toHaveCount(0)` in `playTurn`: under software WebGL on a machine with load average 10 to 16 (other agents building at the same time) a roll's animation takes longer than 5 s. It failed three times in a row with my change. I then restored the original `Game.tsx` from the base commit, rebuilt and ran the same test at the same load: it failed the same way. So the failure is environmental, not caused by this spec. The other game tests (`coins`, `Everyone at once`) pass in most runs, one run failed `coins` too, and the new `pets.spec.ts` (2 tests) passes every time. This gate should be re-run on a quiet machine before merging; I could not get a green full run here and do not claim one.

## Coverage Matrix

| Requirement                                             | Evidence                                                                                           | Status   |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------- |
| U1 events from consecutive states, none on replay       | `mood.test.ts` (reconnect, catch-up, undo, batched roll plus score)                                | Verified |
| U1 `petMood` rules                                      | `mood.test.ts`                                                                                     | Verified |
| U1 one parade per Yatzy                                 | `mood.test.ts` `celebrationStep`, `stage.test.ts`                                                  | Verified |
| U1 pose fallback, override parser                       | `mood.test.ts`, `parseCosmeticsOverride.test.ts`                                                   | Verified |
| U2 real art per pose, else placeholder                  | `artIndex.test.ts`, `PetSprite.test.tsx`, drop-in screenshot (task 2 proofs)                       | Verified |
| U2 motion and reduced motion                            | `petMotion.test.ts`; mid-flight transform values in the task 2 proofs                              | Verified |
| U2 prompt sheet, 13 plus 1                              | `nano-banana-prompts.md`                                                                           | Verified |
| U3 pet on the tray from `seat.equipped`, in a real game | task 3 proofs: real server run, pose idle, sad after a 0, happy after a score, back to idle        | Verified |
| U3 nothing equipped is today's screen                   | `pets.spec.ts` (and the pre-existing game flow, except for the environmental failure above)        | Verified |
| U3 whose pet in each play style                         | `stage.test.ts`, `mood.test.ts`; decision in Open Questions                                        | Verified |
| U4 parade marches, clears, reduced motion               | task 4 proofs: screenshots, removal timings; `GhostParade.test.tsx`                                | Verified |
| U4 parade for everyone at the table                     | A real Yatzy made it appear on the roller and a watcher in the real-game run (no screenshot of it) | Partial  |
| U5 override and bench dev-only                          | `pets.spec.ts` second test against the production build                                            | Verified |

## Issues and Honest Limits

- Art is placeholder vector art; real Nano Banana images are not made. Prompts and exact filenames are in `nano-banana-prompts.md`.
- No screenshot of the parade in a real game (timing and a slow software renderer); bench screenshots only.
- The dev override applies to every seat at once, so a preview shows the same pet for everyone.
- A pet cannot be equipped from the UI until spec 02 merges; nothing was equipped through the server.
- The full e2e run is not green on this loaded machine (above).
