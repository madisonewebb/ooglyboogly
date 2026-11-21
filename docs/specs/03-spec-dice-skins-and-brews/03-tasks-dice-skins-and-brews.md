# 03-tasks-dice-skins-and-brews.md

Spec: `03-spec-dice-skins-and-brews.md`

## Relevant Files

| File                                                              | Why It Is Relevant                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `packages/shared/src/catalog.ts`                                  | Only the nine `available` flags change.                                         |
| `apps/web/src/cosmetics/parseCosmeticsOverride.ts` and `.test.ts` | New. Pure parser of `?cosmetics=`.                                              |
| `apps/web/src/cosmetics/devCosmetics.ts`                          | New. Gate (dev or `VITE_LAB=1`) and cached override.                            |
| `apps/web/src/cosmetics/look.ts` and `look.test.ts`               | New. Seat to look, override resolution, catalog parity tests.                   |
| `apps/web/src/cosmetics/skins/skins.ts`                           | New. Skin ids, colors and features, `skinOf`.                                   |
| `apps/web/src/cosmetics/skins/skinRig.ts`                         | New. Builds the five dice's materials and animates them per frame.              |
| `apps/web/src/cosmetics/skins/skinTextures.ts`                    | New. Small canvas textures (grain, glow, glint star).                           |
| `apps/web/src/cosmetics/brews/brews.ts`                           | New. Brew ids, colors, particle layers, `brewOf`.                               |
| `apps/web/src/cosmetics/brews/particles.ts`                       | New. The GPU particle shader and the small CPU star points.                     |
| `apps/web/src/cosmetics/brews/Brew.tsx`                           | New. Liquid and particles inside the cauldron, and the comet.                   |
| `apps/web/src/cosmetics/cosmetics.css`                            | New. Lab picker styles.                                                         |
| `apps/web/src/dice/dieModel.ts`                                   | Gains `domeGeometry` (pipGeometry built on it, unchanged output).               |
| `apps/web/src/dice/DiceScene.tsx`                                 | `look` prop; `Dice` uses the rig; `Cup` hosts the brew; a comet at scene level. |
| `apps/web/src/dice/DiceTray.tsx`                                  | `equipped` prop turned into `look`.                                             |
| `apps/web/src/screens/Game.tsx`                                   | One line passing the tray player's `equipped`.                                  |
| `apps/web/src/Lab.tsx`                                            | Skin and brew pickers, Yatzy button, hold-cauldron toggle, override.            |
| `docs/specs/03-spec-dice-skins-and-brews/03-proofs/`              | Proof markdown and screenshots.                                                 |

### Notes

- Skins and brews are procedural: no image files.
- Run one test file with `pnpm exec vitest run <path>`.
- Screenshots: build with `VITE_LAB=1` or run the dev server on port 5191; Chromium with `--use-gl=swiftshader --enable-unsafe-swiftshader` when there is no GPU.
- The main checkout's uncommitted edits (`Brand.tsx`, `LobbyDie.tsx`, `styles.css`, `palette.ts`) are not in this worktree and stay out.

## Tasks

### [x] 1.0 Skin and brew definitions, selection logic and the override parser

#### 1.0 Proof Artifact(s)

- Test: `look.test.ts` and `parseCosmeticsOverride.test.ts` pass, demonstrating the fallback to default, independent slots and catalog parity.

#### 1.0 Tasks

- [x] 1.1 Write `skins.ts` and `brews.ts` with the definitions and `skinOf`, `brewOf`.
- [x] 1.2 Write `look.ts` (`lookOf`, `resolveEquipped`) and `devCosmetics.ts`.
- [x] 1.3 Write `parseCosmeticsOverride.ts` and its tests; write `look.test.ts`.

### [x] 2.0 Dice skins in the scene

#### 2.0 Proof Artifact(s)

- Screenshot: each skin, the default, googly mid-roll, a gilded Yatzy glint.
- Test: `dieModel` and rig helper tests.

#### 2.0 Tasks

- [x] 2.1 Add `domeGeometry` to `dieModel.ts`, keep `pipGeometry` output identical, test it.
- [x] 2.2 Write `skinTextures.ts` and `skinRig.ts` (materials, eyes shader, glow pulse, glints).
- [x] 2.3 Wire the rig into `Dice`, add the `look` prop, `equipped` on `DiceTray`, the line in `Game.tsx`.
- [x] 2.4 Idle redraw interval with reduced-motion and visibility guards.

### [x] 3.0 Brews and the Yatzy effects

#### 3.0 Proof Artifact(s)

- Screenshot: each brew with the cauldron out, the default cauldron, the comet.
- Test: catalog flags, particle layout helpers.

#### 3.0 Tasks

- [x] 3.1 Write `particles.ts` (rising shader and star points).
- [x] 3.2 Write `Brew.tsx` (liquid, layers, fade with tip, comet) and mount it in `Cup` and the scene.
- [x] 3.3 Flip the nine `available` flags and add the flags test.

### [x] 4.0 Lab pickers, dev override, screenshots and performance notes

#### 4.0 Proof Artifact(s)

- Screenshots of every item and of the lab; gate command output; performance notes.

#### 4.0 Tasks

- [x] 4.1 Add pickers, Yatzy button, hold-cauldron toggle and `cosmetics.css` to the lab.
- [x] 4.2 Capture screenshots of every item with Playwright.
- [x] 4.3 Run all gates, write the proofs and the validation report.
