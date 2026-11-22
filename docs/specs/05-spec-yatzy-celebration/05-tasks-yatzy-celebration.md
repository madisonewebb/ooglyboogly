# 05-tasks-yatzy-celebration.md

Spec: `05-spec-yatzy-celebration.md`

## Relevant Files

| File                                                            | Why It Is Relevant                                                    |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| `apps/web/src/celebrations/yatzy/yatzyRolls.ts` (+ test)        | New. Pure: which seats rolled a Yatzy between two replayed states.    |
| `apps/web/src/celebrations/yatzy/plan.ts` (+ test)              | New. Pure: confetti pattern, timings, ring, banner words.             |
| `apps/web/src/celebrations/yatzy/YatzyCelebration.tsx` (+ test) | New. The overlay: glow, confetti or still ring, banner, tray flag.    |
| `apps/web/src/celebrations/yatzy/yatzy.css`                     | New. All styles and keyframes (no edit to `styles.css`).              |
| `apps/web/src/sound.ts`                                         | Shared, additive: `playYatzyFanfare` and its note tables.             |
| `apps/web/src/celebrations/yatzy/useYatzyCelebration.ts`        | New. Hook: watches the game, makes a cue, plays the fanfare once.     |
| `apps/web/src/celebrations/yatzy/YatzyStage.tsx` (+ test)       | New. Owns the cue state; plays the burst, then the equipped parade.   |
| `apps/web/src/screens/Game.tsx`                                 | Shared, small: one import, the parade mount replaced by `YatzyStage`. |
| `apps/web/src/celebrations/yatzy/YatzyBench.tsx`                | New. Dev-only roller field and Yatzy button.                          |
| `apps/web/src/cosmetics/PetBench.tsx`                           | Shared, small: one import and `<YatzyBench />`.                       |
| `e2e/tests/yatzy.spec.ts`                                       | New. Production has no bench; an ordinary roll shows no celebration.  |
| `docs/specs/05-spec-yatzy-celebration/`                         | New. Spec, tasks, audit, proofs, validation.                          |

### Notes

- Run one test file with `pnpm exec vitest run <path>`. The web package has no DOM; use `renderToString`.
- Do not touch the server, `db.ts`, `protocol.ts`, `styles.css`, `LobbyDie.tsx` or `dieModel.ts`.
- Dev server for screenshots on port 5199. E2E on `E2E_PORT=8101`.
- Never `Math.random` in server or rules (not used here at all; the confetti is a fixed pattern).

## Tasks

### [x] 1.0 Pure Yatzy-roll detection with tests

Covers Spec Unit 1.

#### 1.0 Proof Artifact(s)

- Test: `yatzyRolls.test.ts` passes; two mutation checks show the undo and held-re-roll tests fail when their guards are removed.

#### 1.0 Tasks

- [x] 1.1 Write `yatzyRolls.ts`.
- [x] 1.2 Tests built on real games: fires once, reconnect, replay, non-Yatzy, catch-up, several Yatzys, multi-card, Everyone at once, undo, held re-roll.

### [x] 2.0 The celebration component, CSS and fanfare

Covers Spec Unit 2.

#### 2.0 Proof Artifact(s)

- Test: `plan.test.ts`, `YatzyCelebration.test.tsx`.
- Screenshot: burst (dark, light, schemes, phone) and reduced motion.
- Measurement: long tasks.

#### 2.0 Tasks

- [x] 2.1 `plan.ts` and its test.
- [x] 2.2 `YatzyCelebration.tsx`, `yatzy.css`, the tray flag.
- [x] 2.3 `playYatzyFanfare` in `sound.ts`.
- [x] 2.4 Render tests.

### [x] 3.0 Wiring into Game.tsx with the parade coordination

Covers Spec Unit 3.

#### 3.0 Proof Artifact(s)

- Test: `YatzyStage.test.tsx`.
- Run: a real game.

#### 3.0 Tasks

- [x] 3.1 `useYatzyCelebration.ts`.
- [x] 3.2 `YatzyStage.tsx`: burst first, parade after.
- [x] 3.3 `Game.tsx`: one import, one mount.

### [x] 4.0 Dev bench, screenshots, e2e

Covers Spec Unit 4.

#### 4.0 Proof Artifact(s)

- Screenshot set, long-task measurements, `yatzy.spec.ts`.

#### 4.0 Tasks

- [x] 4.1 `YatzyBench.tsx` and the bench row.
- [x] 4.2 Screenshots and long-task script.
- [x] 4.3 `yatzy.spec.ts`.
- [x] 4.4 All gates; validation report.
