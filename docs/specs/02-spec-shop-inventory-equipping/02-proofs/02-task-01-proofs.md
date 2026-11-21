# Task 01 Proofs - Catalog, database and the safe purchase

## Task Summary

Coins can now be spent on the server. This task adds two sticker packs, three tables (`inventory`, `equipped`, `goals`) and the purchase, equip and goal rules, with no messages or screens yet.

## What This Task Proves

- A purchase takes exactly the catalog price, in one transaction, and never twice for one item.
- Nothing is charged for an unknown item, a coming-soon item, an owned item or an unaffordable one.
- A purchase that fails after the coins were taken rolls the coins back.
- Equipping needs ownership and the right slot; one item per slot.

## Evidence Summary

- `packages/shared/src/packs.test.ts`: 5 tests passing.
- `apps/server/src/db.test.ts`: 17 new tests passing (all of `db.test.ts`: 26).

## Artifact: Purchase and refusal tests

**What it proves:** `buys at the catalog price...`, `never charges twice...` (three retries leave the balance at 160 of 200), `refuses a purchase the player cannot afford...`, `only sells what the catalog lists...` (an object posing as an id and a price both fail).

**Why it matters:** The server is the only authority on price and ownership.

**Command:**

```bash
pnpm exec vitest run apps/server/src/db.test.ts packages/shared/src/packs.test.ts
```

**Result summary:** All pass.

## Artifact: Rollback test

**What it proves:** `rolls back the deduction when recording the item fails` drops the `goals` table, which the purchase touches last, and shows the balance is still 100 and no inventory row exists afterwards. This test is not hollow: the deduction happens first, so it can only pass if the rollback works.

## Honest limits

- Every real catalog item is still `available: false` (specs 03 and 04), so catalog-priced purchases of skins, brews and pets are tested through an injected lookup. The two real packs are bought through the real lookup.
- The two-connection test is sequential, not parallel: it shows each connection re-reads the balance, which is what `BEGIN IMMEDIATE` plus the guarded `UPDATE` rely on.
