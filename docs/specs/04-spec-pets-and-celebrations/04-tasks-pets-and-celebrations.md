# 04-tasks-pets-and-celebrations.md

Spec: `04-spec-pets-and-celebrations.md`

## Relevant Files

| File                                                              | Why It Is Relevant                                                                            |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `packages/shared/src/catalog.ts`                                  | Only the `available` flag of the 4 pets and the celebration changes to true.                  |
| `apps/web/src/cosmetics/parseCosmeticsOverride.ts` (+ test)       | New. Pure parser of `?cosmetics=slot:id,...` (same name as spec 03's helper).                 |
| `apps/web/src/cosmetics/pets/mood.ts` (+ test)                    | New. Pure: events between states, `petMood`, `celebrationStep`, pose fallback, pet owner.     |
| `apps/web/src/cosmetics/pets/artIndex.ts` (+ test)                | New. Turns the glob of `art/pets/<pet>/<pose>.webp` into a lookup.                            |
| `apps/web/src/cosmetics/pets/placeholders.tsx`                    | New. 13 vector placeholder sprites, one per pet per pose.                                     |
| `apps/web/src/cosmetics/pets/PetSprite.tsx` (+ test)              | New. Real image or placeholder for a pet and pose.                                            |
| `apps/web/src/cosmetics/pets/petMotion.ts` (+ test)               | New. Pure motion plan per pose, with reduced motion.                                          |
| `apps/web/src/cosmetics/pets/PetLayer.tsx`, `pets.css`            | New. The animated overlay on the tray, and its styles.                                        |
| `apps/web/src/cosmetics/pets/usePetStage.ts`                      | New. Hook: watches the game, returns the pet to show, its pose, and the parade to play.       |
| `apps/web/src/cosmetics/celebrations/GhostParade.tsx`, `.css`     | New. The marching ghosts, fixed over the whole screen.                                        |
| `apps/web/src/cosmetics/celebrations/paradePlan.ts` (+ test)      | New. Pure layout and timing of the ghosts.                                                    |
| `apps/web/src/cosmetics/PetBench.tsx`                             | New. Dev-only bench with every pose and the parade.                                           |
| `apps/web/src/art/pets/`                                          | New folder for future real art (`<pet>/<pose>.webp`); a `README`-free placeholder `.gitkeep`. |
| `apps/web/src/screens/Game.tsx`                                   | Small: the hook, wrapper div around `DiceTray` and the two mounts.                            |
| `apps/web/src/main.tsx`                                           | Small: the dev-only `?pets` route.                                                            |
| `e2e/tests/pets.spec.ts`                                          | New. Nothing equipped means nothing shown; override and bench absent in production.           |
| `docs/specs/04-spec-pets-and-celebrations/nano-banana-prompts.md` | New. 14 prompts with exact filenames.                                                         |
| `docs/specs/04-spec-pets-and-celebrations/04-proofs/`             | New. Proof markdown and real screenshots.                                                     |

### Notes

- Run one test file with `pnpm exec vitest run <path>`. The web package has no DOM; use `renderToString`.
- The working tree starts clean in this worktree; do not touch `styles.css`, `DiceScene.tsx`, `dieModel.ts`, `Lab.tsx`, the server or `protocol.ts`.
- Dev server for screenshots on port 5193 only. E2E on `E2E_PORT=8093`.
- Never `Math.random` in server or rules (not used here at all).

## Tasks

### [x] 1.0 Pure mood and celebration logic with tests

Covers Spec Unit 1 and the catalog flags.

#### 1.0 Proof Artifact(s)

- Test: `mood.test.ts` and `parseCosmeticsOverride.test.ts` pass, demonstrating every mood, non-event, reconnect, catch-up, undo and the one-parade-per-Yatzy rule.
- CLI: `catalog.ts` diff shows only five flags changed.

#### 1.0 Tasks

- [x] 1.1 Write `mood.ts`: pet ids, poses, `PET_POSES`, `poseFor`, `eventsBetween`, `isYatzyEvent`, `petMood`, `celebrationStep`, `petOwner`, `reactsTo`.
- [x] 1.2 Write `parseCosmeticsOverride.ts`.
- [x] 1.3 Tests for all of it, building games with the real rules engine.
- [x] 1.4 Flip `available` for `toad`, `blackCat`, `bat`, `ghostCheerleader`, `ghostParade`.

### [x] 2.0 Sprite system, placeholder art and the Nano Banana prompt sheet

Covers Spec Unit 2.

#### 2.0 Proof Artifact(s)

- Test: art index, `PetSprite` and motion plan tests; every pet and pose renders.
- Screenshot: 13 sprites on the bench.
- Doc: `nano-banana-prompts.md`.

#### 2.0 Tasks

- [x] 2.1 `artIndex.ts` with `import.meta.glob`, and tests for the path parser.
- [x] 2.2 13 SVG placeholders in `placeholders.tsx`.
- [x] 2.3 `PetSprite.tsx` choosing real art or placeholder.
- [x] 2.4 `petMotion.ts` and `PetLayer.tsx` with `motion`, shadow, reduced motion.
- [x] 2.5 `nano-banana-prompts.md`.

### [x] 3.0 Pets on screen, driven by the game and `seat.equipped`

Covers Spec Unit 3.

#### 3.0 Proof Artifact(s)

- Test: stage-state helpers tested; the e2e proves nothing is shown with nothing equipped.
- Screenshot: pet on the tray, light and dark.

#### 3.0 Tasks

- [x] 3.1 `usePetStage.ts`.
- [x] 3.2 Mount in `Game.tsx` (hook, wrapper, layer).
- [x] 3.3 `pets.css`.

### [x] 4.0 Ghost Parade

Covers Spec Unit 4.

#### 4.0 Proof Artifact(s)

- Screenshot: mid-march, and reduced motion.
- Test: `paradePlan.test.ts`.

#### 4.0 Tasks

- [x] 4.1 `paradePlan.ts`.
- [x] 4.2 `GhostParade.tsx` and CSS; reduced-motion variant; polite announcement.
- [x] 4.3 Wire into the hook and `Game.tsx`.

### [x] 5.0 Dev override, bench, screenshots and e2e

Covers Spec Unit 5.

#### 5.0 Proof Artifact(s)

- Screenshots of all 13 poses, parade, light and dark.
- e2e: `pets.spec.ts`.

#### 5.0 Tasks

- [x] 5.1 `PetBench.tsx` and the `?pets` route in `main.tsx`; gating.
- [x] 5.2 Dev override applied in the hook.
- [x] 5.3 Playwright capture script for the proofs.
- [x] 5.4 `e2e/tests/pets.spec.ts`.
- [x] 5.5 All gates exit 0.
