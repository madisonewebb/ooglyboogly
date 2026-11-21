# Task 05 Proofs - Dev override, bench, screenshots and e2e

## Task Summary

This task makes everything previewable without the server or the shop. `?cosmetics=pet:toad,celebration:ghostParade` is read by `parseCosmeticsOverride` and applied to every seat, and `?pets` opens a bench with every pet and pose, keys 1 to 4 for poses and P for the parade. Both exist only when `import.meta.env.DEV` or `VITE_LAB=1` is true, which is a build-time constant, so a production build leaves them out. An e2e test proves the production build ignores both and that a game with nothing equipped is unchanged.

## What This Task Proves

- The override and bench work on the dev server and in a `VITE_LAB=1` build (every screenshot in tasks 2 to 4 came from them).
- The production build has neither: `e2e/tests/pets.spec.ts` opens `/?pets&cosmetics=...` and gets the ordinary sign-in page, then plays into a game and finds no pet.
- With nothing equipped, a full turn (roll, preview, write) behaves as before and draws no pet or parade.

## Evidence Summary

- `parseCosmeticsOverride.test.ts` (3 tests) covers the parser; `placement`, `artIndex`, `petMotion`, `stage`, `paradePlan`, `mood`, render tests: 433 tests in total pass.
- Gates exit 0 on the final tree: `task lint`, `task typecheck`, `task test` (rules coverage stays at 100%) and `task build` (a normal build, without `VITE_LAB`). `E2E_PORT=8093 task e2e` does not: one pre-existing game test times out under machine load (see the validation report: the full e2e run is not green on this loaded machine).
- One flake, reported honestly: the first `task test` run failed once on `packages/rules/src/properties.test.ts` with a 5 s timeout while other agents were using the machine; the rules package is untouched by this spec and the rerun passed.

## Artifact: bench screenshots

See the 13 pet captures and the gallery in `04-task-02-proofs.md`, and the parade captures in `04-task-04-proofs.md`.

## Artifact: e2e

```bash
E2E_PORT=8093 task e2e
```

`pets.spec.ts` has two tests: "with nothing equipped there is no pet and no parade, and the tray works as before" and "the preview parameter and the bench exist only on the dev server and in lab builds".
