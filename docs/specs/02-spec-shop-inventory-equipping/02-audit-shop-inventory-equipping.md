# 02-audit-shop-inventory-equipping.md

## Executive Summary

- Overall Status: PASS (after one round of fixes to the plan, below)
- Required Gate Failures: 0 (run 1 had 2; fixed in run 2)
- Flagged Risks: 0 open (run 1 had 3; all addressed in the plan)

## Gateboard

| Gate                             | Status | Why it failed (<=10 words) | Exact fix target |
| -------------------------------- | ------ | -------------------------- | ---------------- |
| Requirement-to-test traceability | PASS   |                            |                  |
| Proof artifact verifiability     | PASS   |                            |                  |
| Repository standards consistency | PASS   |                            |                  |
| Open question resolution         | PASS   |                            |                  |
| Regression-risk blind spots      | PASS   |                            |                  |
| Non-goal leakage                 | PASS   |                            |                  |

## Standards Evidence Table (Required)

| Source File                        | Read      | Standards Extracted                                                                      | Conflicts |
| ---------------------------------- | --------- | ---------------------------------------------------------------------------------------- | --------- |
| `docs/specs/shop-roadmap.md`       | yes       | Binding contract, file ownership, port 8091, no push, no `Math.random`, art placeholders | none      |
| `packages/shared/src/catalog.ts`   | yes       | Slots, prices, `available`, `fitsSlot`; availability flags belong to specs 03 and 04     | none      |
| `/home/madi/CLAUDE.md`             | yes       | Valheim server notes only; unrelated                                                     | none      |
| `README.md`                        | yes       | `task` commands, conventional commits, branches                                          | none      |
| `Taskfile.yml`, `vitest.config.ts` | yes       | lint, typecheck, test with 100% rules coverage, build, e2e                               | none      |
| `docs/specs/01-*`                  | yes       | Document layout, proof format, validation matrix                                         | none      |
| `AGENTS.md`, `CONTRIBUTING.md`     | not found | none                                                                                     | none      |

Standards confidence: medium-high. The roadmap is explicit; the rest comes from the repository's configuration and the spec 01 documents.

## Requirement-to-Test Traceability

| Requirement                                                       | Planned test                                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| U1 packs priced at the common tier, `shopEntry` covers both lists | `packs.test.ts` prices, unique ids, lookup                                  |
| U1 new tables, not `players` or `ledger`                          | `db.test.ts` tables test                                                    |
| U1 one transaction, guarded deduction, price paid recorded        | `db.test.ts` buy; rollback after a failing step; second connection          |
| U1 refuse unknown, unavailable, owned, unaffordable               | `db.test.ts` refusal tests                                                  |
| U1 never trust a client price                                     | `db.test.ts` object id; `TableRoom.test.ts` sends a fake price              |
| U1 equip validation with `fitsSlot` and ownership                 | `db.test.ts` equip and refusals                                             |
| U1 goal rules, cleared on buy                                     | `db.test.ts` goal tests                                                     |
| U2 messages answered privately to all devices                     | `TableRoom.test.ts` two devices of one player; a third client sees nothing  |
| U2 wallet in the snapshot only for its owner                      | `TableRoom.test.ts` rejoin; other seat's snapshot                           |
| U2 guests refused unless payouts enabled; no database             | `TableRoom.test.ts` guest on and off; no db                                 |
| U2 equip lobby only                                               | `TableRoom.test.ts` equip after start gets `STARTED`                        |
| U2 `Seat.equipped` loaded on join and rebroadcast on equip        | `TableRoom.test.ts` second client sees it; a rejoin keeps it                |
| U2 own items only                                                 | `TableRoom.test.ts` message carries a foreign user id, which is ignored     |
| U2 pack stickers only for owners                                  | `TableRoom.test.ts` react with and without the pack                         |
| U2 wallet after payout                                            | `TableRoom.test.ts` balance message after a game                            |
| U3 balance, Shop button, goal bar in the lobby                    | `Shop.test.tsx` panel; e2e                                                  |
| U3 card states and coming soon not buyable                        | `shopView.test.ts`, `Shop.test.tsx` (disabled button, no Buy)               |
| U3 two-tap buy                                                    | e2e (Buy then Confirm)                                                      |
| U3 palette and reduced motion                                     | Only existing tokens (`palette.test.ts` stays green); CSS media query       |
| U4 default stickers free, pack stickers on ownership              | `Reactions.test.tsx`                                                        |
| U4 prompts, one per sticker                                       | `nano-banana-prompts.md` has six prompts (checked by a count in validation) |
| U5 e2e loop and README                                            | `shop.spec.ts`; README section                                              |

## Findings (Run 1, all resolved in Run 2)

### REQUIRED Failures

1. A 1-card game pays 3 to 6 coins, but a pack costs 40, so the e2e as written cannot "earn then buy".
   - Fix target: spec Open Question 10 and task 5.1. The test plays the game for real, asserts the earned balance, then tops up in its own temporary database and buys.
   - Acceptance: the test names the top-up as a test-only step; no production code path changes.
2. The real catalog items are all `available: false`, so the equip and catalog-price paths have no real data to test.
   - Fix target: task 1.3 and 1.5: `buyItem` takes an injectable lookup, and room tests insert inventory rows directly to test equipping.

### FLAG Findings

1. Retries and double taps could charge twice. Addressed by the ownership check inside the transaction and the `(user_id, item_id)` key; tested with three repeats.
2. A purchase could deduct and then fail to record. Addressed by a rollback test that breaks a later step.
3. Pack stickers could be sent by non-owners by crafting a message. Addressed by the server check in task 2.5 and a test.

## Regression and Non-Goal Review

- `Game.tsx`, `DiceScene.tsx`, `dieModel.ts`, `cosmetics/` and the `available` flags are not touched.
- `styles.css` is not touched; styles go in `shop/shop.css`.
- The existing room tests compare lobby seats, so `equipped` is added only when something is worn.
- No non-goal is implemented: nothing draws a cosmetic, there are no refunds, and there is no in-game equipping.

## User-Approved Remediation Plan

- Approved and applied (batch mode: every approval checkpoint treated as approved).
