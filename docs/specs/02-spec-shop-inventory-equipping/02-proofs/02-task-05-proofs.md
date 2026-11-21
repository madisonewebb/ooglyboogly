# Task 05 Proofs - End to end, README and gates

## Task Summary

A Playwright test runs the whole loop in the production build, the README has a Shop section, and every gate was run.

## What This Task Proves

- Two guests finish a 1-card game and earn coins; the next table's lobby and the shop show exactly that balance.
- A pack that costs more than the balance says how many coins short it is and cannot be bought; a coming-soon item cannot be bought.
- Pinning shows a goal bar with the right numbers; buying takes two taps, "Not now" spends nothing, buying takes exactly 40 and ends the goal, and a reload keeps all of it.
- In a game the tray holds the free stickers and the owned pack, not the other pack, and a pack sticker floats.

## Test-only step (disclosed)

A 1-card game pays 3 to 6 coins, but a pack costs 40. After checking the earned balance, the test adds 100 coins to its own temporary database file (`rollhouse-e2e-data-<port>/rollhouse.db`) and reloads. No production code path is bypassed: the purchase, the wallet and the picker are the real ones.

## Gate results (final tree)

| Gate             | Result                                                      |
| ---------------- | ----------------------------------------------------------- |
| `task lint`      | exit 0                                                      |
| `task typecheck` | exit 0                                                      |
| `task test`      | exit 0; 28 files, 423 tests; `packages/rules` still at 100% |
| `task build`     | exit 0                                                      |
| e2e, all 7 tests | all pass, see the note below                                |

## E2E note (honest)

- Port 8091 was occupied by a stale server from the main checkout (started earlier, not by this build; it was left alone), so e2e ran with `E2E_PORT=8095`.
- The machine was heavily loaded by parallel builds (load average 8 to 13). Under that load the existing tests (`coins.spec.ts`, `game.spec.ts`, both fixed 180 s limits and 5 s dice waits) failed in some runs and passed in others, with the same failure also seen once in the new test. Final evidence: one run of all 7 with longer limits passed 6 and failed `game.spec.ts` Take turns only by its own 180 s timeout; that test then passed alone in 2.2 minutes. The new `shop.spec.ts` passed in 3 separate runs. Its own limit was raised to 360 s.
- Not verified: a single uninterrupted `task e2e` run on a quiet machine. Re-run it on a quiet machine before merging.

## Command

```bash
task build && E2E_PORT=8095 task e2e
```
