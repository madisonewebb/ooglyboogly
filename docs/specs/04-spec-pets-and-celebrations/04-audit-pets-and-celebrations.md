# 04-audit-pets-and-celebrations.md

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

| Source File                             | Read | Standards Extracted                                                                            | Conflicts |
| --------------------------------------- | ---- | ---------------------------------------------------------------------------------------------- | --------- |
| `docs/specs/shop-roadmap.md`            | yes  | File ownership for specs 02 to 04; port 8093; only own `available` flags; override helper name | none      |
| `packages/shared/src/catalog.ts`        | yes  | Pet and celebration ids; `available` semantics                                                 | none      |
| `docs/specs/01-spec-coins-and-payouts/` | yes  | Document layout: spec, tasks, audit, proofs, validation                                        | none      |
| `Taskfile.yml`, `vitest.config.ts`      | yes  | Gates; coverage only on `packages/rules`                                                       | none      |
| `apps/web/src/theme/palette.test.ts`    | yes  | Text pairings must pass AA; this spec adds none                                                | none      |
| `/home/madi/CLAUDE.md`                  | yes  | Valheim notes only; unrelated                                                                  | none      |

Standards confidence: medium (no `AGENTS.md` or `CONTRIBUTING.md`; standards from the roadmap and config files).

## Findings

### REQUIRED Failures

None.

### FLAG Findings

1. **The client has no raw move list.** `useTable` exposes the replayed `game` but not the moves. Plan: derive events from consecutive states (`eventsBetween`), which equals the log's effect and avoids editing `useTable.ts`, a file other specs may touch. Residual risk: two moves batched into one render are read as one change set; the function accepts one roll plus one score and ignores bigger jumps.
2. **Undo raises the roll counter.** An undo restores the earlier turn, which would read as a roll. Plan: an emptied box marks the player as undoing and suppresses that roll; tested.
3. **In Take turns the tray switches player the moment a score lands.** A pet tied strictly to the tray would never show the score reaction. Plan: the pet follows the player who just acted until its reaction ends (`petOwner`).

### Traceability

Every functional requirement in the spec maps to a named test (Unit 1, 2), a screenshot (Units 2 to 4) or an e2e (Units 3 and 5). Non-goals are untouched: no server, `protocol.ts`, `db.ts`, shop, `DiceScene.tsx` or `Lab.tsx` edits are planned.
