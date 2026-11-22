# 05-audit-yatzy-celebration.md

## Executive Summary

- Overall Status: PASS
- Required Gate Failures: 0
- Flagged Risks: 3, each addressed in the plan

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

| Source File                                             | Read | Standards Extracted                                                       | Conflicts |
| ------------------------------------------------------- | ---- | ------------------------------------------------------------------------- | --------- |
| `docs/specs/04-spec-pets-and-celebrations/`             | yes  | Moves-log pattern, document layout, one commit per task, bench gating     | none      |
| `docs/specs/01-spec-coins-and-payouts/`                 | yes  | Spec, tasks, audit, proofs, validation layout                             | none      |
| `Taskfile.yml`, `vitest.config.ts`                      | yes  | Gates; coverage only on `packages/rules`                                  | none      |
| `apps/web/src/theme/palette.ts` and `palette.test.ts`   | yes  | AA pairs: `onBand/band`, `onAccent/accent` reused, no new pairing         | none      |
| `apps/web/src/sound.ts`                                 | yes  | One master gain and limiter; volume 0 is mute; audio only after a gesture | none      |
| `apps/web/src/cosmetics/pets/mood.ts`, `usePetStage.ts` | yes  | `eventsBetween` drops two simultaneous rolls, so a new function is needed | none      |
| `/home/madi/CLAUDE.md`                                  | yes  | Valheim notes only; unrelated                                             | none      |

## Flagged Risks

1. **A Yatzy lost in Everyone at once.** `eventsBetween` returns nothing when two players roll in one update. Mitigation: `yatzyRollsBetween` handles each player on its own, with a test for two at once.
2. **A long task on a phone.** Mitigation: transform-only animation, 54 pieces, state isolated in `YatzyStage`, measured with a `longtask` observer under CPU throttling.
3. **The global reduced-motion rule** (`animation-duration: 1ms`) would blank a fading, filled animation. Mitigation: the still version has no animation at all.

## Non-Goal Check

No server, protocol, database, `styles.css` or lobby die file is touched.
