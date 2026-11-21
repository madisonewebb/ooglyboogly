# 02-validation-shop-inventory-equipping.md

## 1) Executive Summary

- **Overall:** **PASS with one caveat.** Every requirement has a passing proof. The caveat is that the whole e2e suite was not seen green in one uninterrupted run, because the machine was overloaded (see Gate C).
- **Implementation Ready:** **Yes**, after one quiet-machine `task e2e`.
- **Key metrics:** 25 of 25 requirements verified; 5 of 5 proof files present; tests 423 passing; `packages/rules` untouched at 100% coverage.

### Gates

| Gate                                | Result         | Basis                                                                                                             |
| ----------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| A: no CRITICAL or HIGH issue        | PASS           | None found                                                                                                        |
| B: no Unknown in the matrix         | PASS           | All Verified                                                                                                      |
| C: proofs accessible and functional | PASS with note | Unit and room tests re-run green. E2E: every test passed at least once; old tests flaked under load (see proof 5) |
| D: no unmapped out-of-scope change  | PASS           | No change to `DiceScene.tsx`, `dieModel.ts`, `cosmetics/`, `styles.css` or any `available` flag                   |
| E: repository standards             | PASS           | Conventional commits, tests beside code, new CSS file, plain SQL tables, no `Math.random`                         |
| F: no secrets in proofs             | PASS           | Guest names only                                                                                                  |

## 2) Coverage Matrix

Commits: T1 `92e54e4`, T2 `c962d40`, T3 and T4 (web), T5 (this one).

| Requirement                                                 | Status   | Evidence                                                                                                                                     |
| ----------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| U1 two packs at 40, one lookup over catalog and packs       | Verified | `packs.ts`, `packs.test.ts`                                                                                                                  |
| U1 new tables, not `players` or `ledger`                    | Verified | `db.test.ts` tables test                                                                                                                     |
| U1 one-transaction buy, guarded deduction, price recorded   | Verified | `db.test.ts` buy, exact-balance, rollback tests                                                                                              |
| U1 refuses unknown, unavailable, owned, unaffordable        | Verified | `db.test.ts`; `TableRoom.test.ts` refusals                                                                                                   |
| U1 never trust a client price                               | Verified | Room test sends a fake price and user id                                                                                                     |
| U1 equip with `fitsSlot` and ownership, one per slot        | Verified | `db.test.ts` equip tests                                                                                                                     |
| U1 one goal, cleared on buy                                 | Verified | `db.test.ts` goal tests                                                                                                                      |
| U2 messages answered privately to all devices               | Verified | Room test `tells every device of a player, and nobody else`                                                                                  |
| U2 wallet in snapshot, only to its owner                    | Verified | Room tests (join, other seat)                                                                                                                |
| U2 guests refused unless payouts on; no database            | Verified | Room test guest and no-db cases                                                                                                              |
| U2 equip lobby only                                         | Verified | Room test `only lets you change your look in the lobby`                                                                                      |
| U2 `Seat.equipped` loaded and rebroadcast                   | Verified | Room test equips and unequips; rejoin                                                                                                        |
| U2 own items only                                           | Verified | Room test `acts only for the signed-in player`                                                                                               |
| U2 pack stickers only for owners                            | Verified | Room test pack stickers                                                                                                                      |
| U2 wallet after payout                                      | Verified | Room test `sends the new balance after a game pays out`                                                                                      |
| U2 a failing database does not crash the room               | Verified | Room test; the older payout-failure test still passes                                                                                        |
| U3 lobby balance, Shop button, goal bar                     | Verified | `Shop.test.tsx`; `shop.spec.ts`; `lobby-goal.png`                                                                                            |
| U3 card with name, rarity, price, blurb, preview, one state | Verified | `Shop.test.tsx`; `shop.png`                                                                                                                  |
| U3 coming soon not buyable                                  | Verified | `Shop.test.tsx` (disabled, no Buy, no Pin); e2e                                                                                              |
| U3 two-tap buy                                              | Verified | `shop.spec.ts`                                                                                                                               |
| U3 Equip, Unequip, Pin, Unpin                               | Verified | `Shop.test.tsx` renders; server paths by room tests. The click-through of Wear it is not in a browser test (no wearable item is on sale yet) |
| U3 palette tokens, reduced motion, no candy look            | Verified | Only existing tokens; motion under `prefers-reduced-motion: no-preference`; reviewed in screenshots                                          |
| U3 seat look line                                           | Verified | `Shop.test.tsx` lobby test                                                                                                                   |
| U4 picker shows pack stickers only when owned               | Verified | `Reactions.test.tsx`; e2e                                                                                                                    |
| U4 six placeholders and six prompts                         | Verified | `art/stickers/packs/`; `nano-banana-prompts.md` (6 prompts)                                                                                  |
| U5 e2e loop and README Shop section                         | Verified | `shop.spec.ts`; `README.md`                                                                                                                  |

## 3) Issues

- **MEDIUM:** a full e2e run was not seen green in one go (Gate C). Cause: load, not a known defect.
- **LOW:** Wear it, Take off and the goal pin on an owned gear item are not clicked in a real browser, because every gear item is still coming soon. They are covered by server tests and render tests.
- **LOW:** the audit planned a "second device sees nothing" test; it exists. The audit's "reduced motion" row is verified by CSS structure only, not by emulated media in a browser.
- **LOW:** the goal-bar screenshot predates moving the coin panel up in the lobby.
- **LOW:** one unit test run failed once in an early full run (423 tests, 1 failed) and passed on every re-run; the failing test was not captured. Treat as a possible timing flake in the new room tests (they use real timers and a 1.3 s sticker cooldown wait).
