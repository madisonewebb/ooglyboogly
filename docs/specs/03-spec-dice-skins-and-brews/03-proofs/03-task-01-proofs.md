# Task 01 Proofs - Skin and brew definitions, selection logic and the override parser

## Task Summary

This task adds the pure part of the feature: which skin and brew a seat shows, the settings of every item, and the parser for the dev-only `?cosmetics=` URL parameter. Nothing is drawn yet.

## What This Task Proves

- A seat with nothing equipped, or an id the client does not know, gets the default look.
- The skin and the brew are chosen independently, and other slots (pets) are ignored.
- The definitions in the client match the catalog exactly: a new catalog item without a definition, or the reverse, fails a test.
- `parseCosmeticsOverride` ignores unknown slots, ids in the wrong slot, repeats and noise, and a dev override beats the seat.

## Evidence Summary

- `apps/web/src/cosmetics/look.test.ts` and `parseCosmeticsOverride.test.ts`: 13 tests pass.
- `task typecheck` and ESLint are clean for the new files.

## Artifact: Selection and parser tests

**What it proves:** The fallback, independence and parity rules above.

**Why it matters:** Every later task trusts these functions to choose the look, so the default cannot be broken by a bad id.

**Command:**

```bash
pnpm exec vitest run apps/web/src/cosmetics
```

**Result summary:** 2 files, 13 tests passed.
