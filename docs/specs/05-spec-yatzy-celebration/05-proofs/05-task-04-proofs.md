# Task 04 Proofs - Dev bench, screenshots, e2e

## Task Summary

This task adds the dev-only way to see the celebration on demand, and the end-to-end checks. `YatzyBench` adds a `Roller` field and a `Yatzy` button (key Y) to the `?pets` bench, and `?pets&yatzy=1&roller=Name` starts it on load. `e2e/tests/yatzy.spec.ts` checks the production build and an ordinary roll.

## What This Task Proves

- The bench plays the real `YatzyCelebration` for any roller name (the screenshots in the task 2 proofs say `Madi rolled a Yatzy!`, taken from the bench, with real timings).
- The production build does not contain the bench: the e2e opens `/?pets&yatzy=1&roller=Madi` and gets the ordinary sign-in page with no `Yatzy` button and no celebration; and a search of the built JavaScript for the bench's `Yatzy celebration` group label finds nothing, while the celebration component itself (used by the game) is there.
- An ordinary roll on a real table plays no celebration.

## Evidence Summary

- The bench control owns its own state and renders the overlay through a portal on the body. A first version kept the state in the bench page, which re-rendered the 3D tray and showed long tasks of 55 to 200 ms; moving it out removed them (details in the task 2 proofs).
- Dev bench keys and URLs: key `Y`, button `Yatzy`, `?pets&yatzy=1&roller=Madi`. Run with `pnpm -F @rollhouse/web exec vite --port 5199` or a `VITE_LAB=1` build.

## What the e2e could and could not cover end to end

Could: production has no bench (test 1); an ordinary roll on a real table, in a real browser against the real server, plays nothing and leaves the page usable (test 2; if the dice happen to be five of a kind, a one in 1296 chance, the test instead requires the celebration to show with `pointer-events: none`, so it never fails on a real Yatzy).

Could not: force a Yatzy. The server rolls real random dice and has no dev roll override; adding one means touching the server, which this task may not. So the e2e cannot assert "a Yatzy plays the celebration on every screen". That is covered by: the pure `yatzyRollsBetween` tests (every firing rule, on games built with the real rules engine), the render tests, and the one real Yatzy I caught in a lab-build game (task 3 proofs, both screens, parade after the burst, nothing after a reload). That real run is a one-off script, not part of the gates, and it needed luck (turn 9 of the first game).

## Artifact: e2e

```bash
E2E_PORT=8101 task e2e
```

**Result summary:** see the validation report for the final gate results.
