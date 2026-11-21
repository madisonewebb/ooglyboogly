# 01-audit-coins-and-payouts.md

## Executive Summary

- Overall Status: PASS (after re-audit, see below)
- Required Gate Failures: 0 (run 1 had 1; fixed in run 2)
- Flagged Risks: 0 open (run 1 had 2; both addressed in the plan)

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

| Source File                        | Read      | Standards Extracted                                                                                         | Conflicts |
| ---------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- | --------- |
| `AGENTS.md`                        | not found | none                                                                                                        | none      |
| `CONTRIBUTING.md`                  | not found | none                                                                                                        | none      |
| `.github/pull_request_template.md` | not found | none                                                                                                        | none      |
| `/home/madi/CLAUDE.md`             | yes       | Valheim server notes only; unrelated                                                                        | none      |
| `README.md`                        | yes       | PRs into `develop`; conventional commits; `Math.random` banned in server and rules; all commands via `task` | none      |
| `.pre-commit-config.yaml`          | yes       | Pre-commit runs `task lint`                                                                                 | none      |
| `Taskfile.yml`                     | yes       | `lint`, `typecheck`, `test` with coverage, `build`, `e2e`                                                   | none      |
| `vitest.config.ts`                 | yes       | 100% coverage threshold on `packages/rules`                                                                 | none      |
| `.github/workflows/ci.yaml`        | yes       | CI runs lint, typecheck, test, build, manifests, e2e                                                        | none      |

Standards confidence: medium. There is no `AGENTS.md`, `CONTRIBUTING.md` or pull request template, so the standards come from `README.md` and the configuration files. Seven sources were read, and none conflict.

## Findings (Run 1, all resolved in Run 2)

### REQUIRED Failures

1. Three spec requirements have no explicit planned test.
   - Missing item (a): Unit 2, "shall give each game a unique id (a random UUID) when the host starts it". Task 2.6 builds it, but no test asserts that payout rows carry a UUID `game_id`, or that two games get different ids.
   - Missing item (b): Unit 2, "shall never create `players` rows for guests when it is disabled". Task 2.8 says the guest is skipped, but not that no `players` row is created.
   - Missing item (c): Unit 3, "shall keep its current layout, motion and reduced-motion behavior". Tasks 3.7 and 3.9 implement and screenshot it, but nothing tests reduced motion or confirms the existing Results behavior.
   - File section to edit: `## Tasks > 2.0 > 2.8` (add the two assertions), `## Tasks > 3.0 > 3.7` and `### 3.0 Proof Artifact(s)` (add a reduced-motion check).
   - Acceptance condition: 2.8 names both assertions; a proof artifact names a Playwright check run with reduced motion emulated that shows the coin line is visible straight away, and states that the existing `game.spec.ts` Results assertions still pass.

### FLAG Findings

1. A failed payout write is not planned for.
   - Risk: if `payOut` throws (disk full, a locked database), the error would surface inside the move handler right after the game's final move, possibly stopping the room from sending Results to anyone.
   - Suggested remediation: in 2.7, wrap `settlePayout` in a try and catch that logs the error and leaves the game finished with no payout; add a room test that makes the database throw and checks that Results still show and no coins are claimed. A paid flag that is already true must not make a retry silently drop the payout without a log.

2. Message ordering on the client is untested.
   - Risk: the final move and the payout message are separate, so the client may show Results first and the coin line later, or after a reconnect, in the snapshot. Task 3.7 plans a fade-in but no test.
   - Suggested remediation: in 3.5, make the helper accept `null` and test that case; in 4.1, assert the coin line appears after Results is already visible.

## User-Approved Remediation Plan

- Approved and applied

Proposed edits, if you approve:

1. In 2.8, add: payout rows carry a UUID `game_id` and two games get different ids; a guest skipped with `guestPayouts: false` leaves no `players` row.
2. In the 3.0 proof artifacts and 3.7, add a Playwright check with reduced motion emulated, and a line stating that the existing `game.spec.ts` Results assertions must still pass.
3. In 2.7, add the try and catch with logging, and a room test for a throwing database.
4. In 3.5 and 4.1, add the `null` payout test and the "Results first, coins after" assertion.

## Re-Audit Delta (Run 2)

- Changed gate statuses since previous run:
  - Requirement-to-test traceability: FAIL to PASS. Task 2.8 now asserts a UUID `game_id` per game, different ids for two games, and no `players` row for a skipped guest. The 3.0 proof artifacts and task 4.1 now include a reduced-motion Playwright check and require the existing `game.spec.ts` Results assertions to pass.
  - Regression-risk blind spots: both flags resolved in the plan. Task 2.7 wraps settlement in a try and catch that logs, with a throwing-database test in 2.8. Tasks 3.5 and 4.1 add the null-payout test and the "Results first, coins after" assertion.
- Still-failing REQUIRED gates: none.
- Newly introduced findings: none.

### Chain-of-Verification

- Do all REQUIRED gates pass with explicit evidence? Yes. Traceability was re-checked requirement by requirement against the spec: Unit 1 (7 requirements) maps to task 1.7 and 1.8; Unit 2 (9) maps to 2.4, 2.8 and 4.2; Unit 3 (6) maps to 3.3, 3.5, 4.1 and the reduced-motion artifact.
- Standards: seven sources read, none conflict, `AGENTS.md` and `CONTRIBUTING.md` do not exist.
