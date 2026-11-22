# 05-validation-yatzy-celebration.md

## Validation Report

Spec: `05-spec-yatzy-celebration.md`. Branch `feat/yatzy-celebration`, cut from `develop` at `a5a1864`.

## Gate Results

| Gate                     | Result                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `task lint`              | exit 0 (ESLint and Prettier)                                                                                                        |
| `task typecheck`         | exit 0                                                                                                                              |
| `task test`              | exit 0, 46 files and 563 tests, rules coverage 100% (the `packages/rules` coverage is unchanged: nothing there was touched)         |
| `task build`             | exit 0 (a normal build, no `VITE_LAB`); the bench's label is absent from the built JavaScript, the celebration component is present |
| `E2E_PORT=8101 task e2e` | exit 0 on the last run: 13 of 13 passed (6.6 min). See the flakiness note.                                                          |

### E2E flakiness note (not caused by this change)

Four full runs were needed. The first failed 1 test (`coins`), the second 2 (`game` Take turns and `shop`), the third 7 while the machine was visibly busy (even trivial tests took 9 to 19 s), and the fourth passed 13 of 13. Every failure was the same line: `sitDown` in `e2e/tests/helpers.ts` waiting 5 s for the `At the table` heading, which happens in the lobby, where this change renders nothing. Each failed test passed when run alone. I could not run the base commit to compare, so this is an inference, not a measurement: the lobby is the screen with the 3D die the owner says has a main-thread stall, which fits a join that sometimes takes longer than 5 s on a loaded machine. I did not edit `helpers.ts`.

## Coverage Matrix

| Requirement                                                  | Evidence                                                                                                                                                                       | Status                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| U1 Yatzy roll decided from consecutive states                | `yatzyRolls.test.ts` (10 tests, real rules engine), two mutation checks                                                                                                        | Verified                  |
| U1 fires once; each of several Yatzys fires                  | `yatzyRolls.test.ts`                                                                                                                                                           | Verified                  |
| U1 not on reconnect, replay, catch-up, non-Yatzy, undo, held | `yatzyRolls.test.ts`; real game reload showed nothing (task 3 proofs)                                                                                                          | Verified                  |
| U2 palette confetti, banner, name, 3.6 s                     | `plan.test.ts`, `YatzyCelebration.test.tsx`, screenshots in the task 2 proofs                                                                                                  | Verified                  |
| U2 click-through, aria, hidden confetti                      | render tests; `pointer-events: none` measured in the page                                                                                                                      | Verified                  |
| U2 fanfare respects mute and volume                          | Goes through the master gain; `audio()` returns null at volume 0 (existing code); test that it is silent without throwing before unlock. Not listened to: no audio device here | Partial                   |
| U2 tray glow and shake                                       | CSS flag on the root; visible as a glow around the tray column in the screenshots; the 520 ms shake was never captured                                                         | Partial                   |
| U2 reduced motion: ring, no flying, no shake                 | Render test, screenshots, measured 0 pieces and 12 stars                                                                                                                       | Verified                  |
| U2 AA text pairings, both themes, three schemes              | Reuses `onBand/band` and `onAccent/accent` from `TEXT_PAIRS`; `palette.test.ts` passes                                                                                         | Verified                  |
| U2 phone performance                                         | Long tasks none at 1x, 56 ms worst at 4x CPU throttling on the bench                                                                                                           | Verified (bench)          |
| U3 plays on every screen, once, from the move log            | Real game: roller and watcher, 46 ms after the roll; reload plays nothing                                                                                                      | Verified (one real Yatzy) |
| U3 parade after the burst, not together                      | Real game: burst off and parade on in the same frame on both screens                                                                                                           | Verified                  |
| U3 no long task in the live game                             | Real game is noisy (200 to 640 ms tasks all game long, with or without a celebration); not separable                                                                           | Not shown                 |
| U4 bench with roller field, absent in production             | `yatzy.spec.ts` test 1 and a search of the built bundle                                                                                                                        | Verified                  |
| U4 e2e of a real Yatzy                                       | Impossible without a server roll override (out of scope)                                                                                                                       | Not covered, documented   |

## Issues and Honest Limits

- **Worst long task measured:** 56 ms on the dev bench at 4x CPU throttling (none unthrottled). In the earlier measured version, before moving the state out of the page component and adding `contain: strict`, 186 ms unthrottled and 457 ms at 4x. In the live two-browser game, long tasks of up to 641 ms overlapped the celebration window, but the same game had tasks of 200 to 640 ms outside it, so I do not attribute them to the celebration; I did not run a matched comparison.
- The fanfare was not heard. Its note timings and levels are tested as data only.
- The shake is 520 ms long and none of the screenshots caught it moving; the glow was visible in all of them.
- One real Yatzy was observed, in a lab build, by a script; it is a proof, not a gate.
- Shared files touched: `apps/web/src/screens/Game.tsx` (one import, the parade mount replaced by `YatzyStage`), `apps/web/src/sound.ts` (additive: `playYatzyFanfare` and its note tables), `apps/web/src/cosmetics/PetBench.tsx` (one import and one element). Nothing in `apps/server`, `packages/*`, `styles.css`, `LobbyDie.tsx` or `dieModel.ts`.
