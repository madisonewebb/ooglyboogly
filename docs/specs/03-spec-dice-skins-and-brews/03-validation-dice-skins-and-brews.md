# 03-validation-dice-skins-and-brews.md

## 1) Executive Summary

- **Overall:** **PASS.** No gate tripped. Two MEDIUM and three LOW issues, all about limits of the evidence (no real GPU) or documented design choices.
- **Implementation Ready:** **Yes**, with the caveat that frame rates on a phone are unmeasured (M1).
- **Key metrics:**
  - Functional requirements verified: **27 / 27** (screenshots for rendering, tests for logic)
  - Spec success metrics: **4 / 4**
  - Proof artifacts working: all screenshots re-checked by eye; every command re-run
  - Test run: 30 files, 402 tests, all passing; `packages/rules` at 100% statements, branches, functions and lines

### Gates

| Gate                                         | Result | Basis                                                                                                   |
| -------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| A: no CRITICAL or HIGH issue                 | PASS   | None found                                                                                              |
| B: no `Unknown` in the coverage matrix       | PASS   | Every requirement Verified                                                                              |
| C: proof artifacts accessible and functional | PASS   | Screenshots are real captures (headless Chromium, SwiftShader); none faked or edited                    |
| D: no unmapped out-of-scope core change      | PASS   | No server, `db.ts`, `protocol.ts`, shop UI or pets files touched; catalog diff is the nine flags only   |
| E: repository standards                      | PASS   | Conventional commits with `Related to T<n> in Spec 03`; new styles in a new CSS file; tests beside code |
| F: no secrets in proof artifacts             | PASS   | Screenshots show only the dice lab and the tray                                                         |

## 2) Coverage Matrix

Commits: `8b70d20` (spec, tasks, audit), `7a6f095` (T1), `c793e20` (T2), `a3085a7` (T3), `6265469` (T4).

| Requirement                                                                           | Status   | Evidence                                                                                                         |
| ------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| U1 `skinOf`, `brewOf`: id or null for default                                         | Verified | `look.test.ts` (empty, unknown, `toString`, independent slots)                                                   |
| U1 `lookOf`, `resolveEquipped`, override wins                                         | Verified | `look.test.ts`                                                                                                   |
| U1 one definition per catalog id; test fails on drift                                 | Verified | `look.test.ts` parity tests                                                                                      |
| U1 `parseCosmeticsOverride` ignores bad input                                         | Verified | `parseCosmeticsOverride.test.ts` (6 tests)                                                                       |
| U1 override only where the lab is enabled                                             | Verified | `devCosmetics.ts` (`labEnabled`); the production build was made without `VITE_LAB`, so the gate is false there   |
| U2 dice drawn with the shown tray owner's skin                                        | Verified | `Game.tsx` passes `lobby.seats[trayPlayer].equipped`; screenshots with override                                  |
| U2 bone, obsidian, moonstone, googly, gilded look as specified                        | Verified | `img/skin-*.png`                                                                                                 |
| U2 pips readable on every body                                                        | Verified | Same screenshots                                                                                                 |
| U2 shadows, hover, fade, shelf, hops untouched; porcelain path unchanged with no skin | Verified | `dieModel.test.ts` golden checksum; `skinRig.test.ts` no-skin test; `img/skin-default.png`; 6 e2e tests pass     |
| U2 reduced motion: eyes centered, glow steady, no glints                              | Verified | `skinRig.test.ts`; `img/reduced-motion-googly.png`                                                               |
| U2 at most three meshes per die                                                       | Verified | `DiceScene.tsx` (body plus pips, or body plus sclera plus pupils)                                                |
| U3 liquid plus GPU particles, at most 16 per layer, two layers                        | Verified | `brews.ts` layers; `img/brew-*.png`                                                                              |
| U3 four brews as described                                                            | Verified | `img/brew-swamp.png`, `-violetMurk`, `-witchfire`, `-starwater`                                                  |
| U3 starwater comet on a Yatzy                                                         | Verified | `img/comet-starwater-*.png`; `Brew.test.ts`                                                                      |
| U3 brew fades as the cauldron tips                                                    | Verified | `Brew.test.ts` `tipFade`                                                                                         |
| U3 reduced motion: frozen particles, no comet                                         | Verified | Code (`STILL_TIME`, `on = comet && !reduced`); see M2: the existing scene shows no cauldron under reduced motion |
| U3 empty cauldron when no brew                                                        | Verified | `img/brew-default.png`                                                                                           |
| U3 nine `available` flags, nothing else in the catalog                                | Verified | `git diff` of `catalog.ts` is the nine flags (and prettier line wraps); `look.test.ts`                           |
| U4 lab pickers, Yatzy button, hold toggle                                             | Verified | `img/lab-pickers.png`                                                                                            |
| U4 override applied to lab and real game tray                                         | Verified | Pickers read `["googly","swamp"]` from the URL; `Game.tsx` uses `devCosmetics()`                                 |
| U4 performance notes                                                                  | Verified | `03-task-04-proofs.md`                                                                                           |
| U4 all five gates                                                                     | Verified | Below                                                                                                            |

### Gate commands (run from this worktree)

| Command                  | Result                                 |
| ------------------------ | -------------------------------------- |
| `task lint`              | exit 0                                 |
| `task typecheck`         | exit 0                                 |
| `task test`              | exit 0; 402 tests; rules coverage 100% |
| `task build`             | exit 0                                 |
| `E2E_PORT=8092 task e2e` | exit 0; 6 passed in 3.8 minutes        |

## 3) Issues

- **M1 (MEDIUM): no real-GPU measurement.** The machine has no GPU, so frame times were not measured; the performance claims are by construction (draw calls, particle counts, texture sizes). A phone check inside Discord is still worth doing before release.
- **M2 (MEDIUM): brews only show while the cauldron is out.** The existing scene draws the cauldron only during the shake and pour, and not at all under reduced motion. So brews are seen for about a second a roll, and reduced-motion players see none (the skins still show). This follows the scene as it is; a resting cauldron is a possible later spec.
- **L1 (LOW): e2e runtime depends on machine load.** On a loaded machine (other builds running at once) the 26-roll tests took close to their 180 s limit and timed out once; alone and on a quieter machine all six pass. The default code path is unchanged, so this is not caused by skins.
- **L2 (LOW): `Math.random` is not used anywhere**; particles and textures use a seeded generator so screens match.
- **L3 (LOW): whose look in Everyone at once** is the tray owner's, as decided in the spec's Open Questions; the owner may want other players' dice visible.
