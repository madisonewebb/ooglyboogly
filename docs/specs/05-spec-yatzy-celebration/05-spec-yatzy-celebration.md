# 05-spec-yatzy-celebration.md

## Introduction/Overview

The owner asked for "a bigger celebration when someone does roll a Yatzy". Today a Yatzy gets a line of text on the pad ("Yatzy bonus, +100!" or "Another Yatzy!") and, for a player who bought it, the equipped Ghost Parade (spec 04). This spec adds a big **default** celebration that every screen at the table plays whenever anyone rolls a Yatzy, whether or not anyone owns anything: a burst of palette-colored confetti, a large YATZY! banner naming the roller, a short synthesized fanfare and a glow and gentle shake on the tray, for about 3.6 seconds. It is client-only: it reads the replayed move log, exactly as spec 04 does, and changes nothing on the server, `db.ts` or `protocol.ts`.

## Goals

- Every Yatzy roll, by anyone, in any play style and with any number of cards, plays the celebration on every client, once.
- It never fires on a reconnect, a replay or a snapshot, and never for a roll that is not five of a kind.
- It never blocks play: dice and buttons stay usable underneath, and it removes itself.
- It is cheap enough for a phone inside Discord, with a software renderer: no WebGL, at most 54 moving pieces, only compositor properties animating, and no long main-thread task caused by it.
- It respects reduced motion, the mute setting and the volume, and is accessible (polite announcement, decoration hidden, AA contrast in every theme and scheme).
- The owner can preview it on demand on the dev bench; production builds do not contain the bench.

## User Stories

- **As a player**, I want a Yatzy to feel like a big moment so that rolling one is something we all remember.
- **As someone at the table who did not roll it**, I want to see who rolled it and to be in on it too, because the celebration plays for everyone.
- **As a player with the Ghost Parade**, I want my parade to still play, without it fighting the new burst.
- **As a player who asks for less motion**, I want a banner and a still ring of stars, with no flying confetti or shake.
- **As the owner**, I want to trigger the celebration from a button with any name, so that I can judge it without waiting for a real Yatzy.

## Demoable Units of Work

### Unit 1: Deciding when a Yatzy is rolled, from the move log

**Purpose:** Plain, testable code that says whether a new game state contains a Yatzy roll and who rolled it.

**Functional Requirements:**

- The system shall provide `yatzyRollsBetween(prev, next)` returning the seats that rolled a Yatzy (five of a kind) going from one replayed state to the next, empty when nobody did.
- It shall return nothing when the two states are the same object or the same position (reconnect, replay, snapshot), when a player's roll counter moved by anything but exactly one (a catch-up), when the roll is not five of a kind, when the change is an undo, and when the player merely re-rolled dice that already showed a Yatzy (everything held).
- It shall return every Yatzy in a game, one per Yatzy roll, in Take turns and Everyone at once, with one card or several, and both seats when two Yatzys land in one update.

**Proof Artifacts:**

- Test: `yatzyRolls.test.ts` passes, with the games built by the real rules engine, covering fires once, not on reconnect or replay, not for a non-Yatzy, each of several Yatzys fires, undo, held re-roll, catch-up.

### Unit 2: The celebration itself

**Purpose:** The look and sound of the moment.

**Functional Requirements:**

- The system shall render a fixed, full-screen, `pointer-events: none` layer with: a glow wash, 54 confetti pieces in palette colors (accent, strong, option, pip; strips, dots and four-point stars) flying out in a burst from the upper middle and falling, a large `YATZY!` in Fredoka on the band color with the accent border, and a pill under it reading `<Name> rolled a Yatzy!` (several rollers: `A and B rolled Yatzys!`).
- The system shall run 3.6 seconds and then remove itself (a timer in the component).
- The system shall play a short fanfare (a soft drum thump, an ascending bell arpeggio, a shimmer) through the existing master gain, so mute and the volume slider apply, and silent until audio is unlocked.
- The system shall, while it plays, give the tray column a soft accent glow and one short shake (520 ms), through a flag on the root element, without editing `styles.css`.
- With reduced motion it shall show no flying pieces and no shake: the banner and a ring of 12 still stars for 2.5 seconds, a static glow, and a quieter three-bell sound. Nothing animates (the app's global reduced-motion rule would otherwise cut an animation to 1 ms).
- The banner is the one live region (`role="status"`, `aria-live="polite"`, `aria-atomic`); the big word and all decoration are `aria-hidden`. Text pairings are `on-band` on `band` and `on-accent` on `accent`, both already checked by `palette.test.ts` in light and dark and all three schemes.

**Proof Artifacts:**

- Test: `plan.test.ts` and `YatzyCelebration.test.tsx` (`renderToString`): 54 pieces, only palette colors, duration, announcement text, status role, hidden confetti, reduced-motion ring, no controls inside.
- Screenshot: the burst mid-flight in light and dark, a phone width, other schemes, and the reduced-motion version, on the dev bench, with the time each was taken.
- Measurement: main-thread long tasks while it plays, with and without CPU throttling.

### Unit 3: On the table, with the Ghost Parade

**Purpose:** Play it for everyone, once, and keep it friends with the equipped celebration.

**Functional Requirements:**

- The system shall mount one component in `Game.tsx` (`YatzyStage`) that watches `game` with a hook, plays the celebration once per `yatzyRollsBetween` result, and keeps its state to itself so starting and clearing it re-renders nothing else on the game screen.
- When the roller has the Ghost Parade equipped (spec 04), the parade shall play right after the burst has finished, not together with it: `YatzyStage` renders the parade only while no celebration is showing. A parade cue that arrives during the burst simply waits.
- The existing `Sparkles`, the joker hint text and the sticker floats are untouched.

**Proof Artifacts:**

- Test: `YatzyStage.test.tsx` (nothing on a first state, the parade renders when no burst is playing).
- Run: a real game against the real server, honest about what it did and did not catch.

### Unit 4: Dev bench and end to end

**Purpose:** Preview on demand, keep production clean.

**Functional Requirements:**

- The `?pets` bench shall have a `Roller` field and a `Yatzy` button (key Y), and `?pets&yatzy=1&roller=Name` shall start it on load. It is gated by `import.meta.env.DEV || VITE_LAB === '1'` like the rest of the bench, so production builds contain neither.
- An e2e test shall check that the production build has no Yatzy button on `/?pets&yatzy=1`, and that an ordinary turn on a real table shows no celebration unless the dice really were five of a kind.

**Proof Artifacts:**

- Test: `yatzy.spec.ts` passes against the production build.

## Non-Goals (Out of Scope)

1. Anything on the server, `db.ts` or `protocol.ts`, including a dev roll override (there is none today and adding one would touch the server).
2. A celebration for the Yatzy score being written in, for the upper bonus, or for anything but a Yatzy roll.
3. Pets reacting differently, or changes to the Ghost Parade itself (spec 04).
4. New settings: no toggle to turn the celebration off beyond mute and reduced motion.
5. WebGL, canvas particles or new dependencies.

## Design Considerations

Witchy and cozy with a light feminine touch, no candy look: the confetti uses only the four palette colors already in the app (pink accent, lavender strong, pale option, plum pip), as thin strips, small dots and four-point stars like the existing `Sparkles`, with no gold, rainbow or glitter. The word is set in Fredoka on the dark band plate with a pink border, so it reads as a witch's shop sign more than a party. The glow is a soft wash of accent and lavender. Every color is a CSS variable, so the three schemes and both themes work with no extra code.

## Repository Standards

- Pure logic with Vitest tests beside it; no DOM test setup in the web package, so `renderToString` for components and Playwright for the rest.
- New code under `apps/web/src/celebrations/yatzy/`, new CSS in `yatzy.css`, no edits to `styles.css`, `DiceScene.tsx`, `dieModel.ts`, `LobbyDie.tsx` or the server. Small edits only in `Game.tsx` (one import and one mount), `PetBench.tsx` (one import and one row) and `sound.ts` (the fanfare).
- Conventional commits, each ending with `Related to T<n> in Spec 05` and the Claude trailer; one commit per parent task; no push.
- Gates: `task lint`, `task typecheck`, `task test` (100% coverage stays on `packages/rules`), `task build`, `E2E_PORT=8101 task e2e`.

## Technical Considerations

- **From the move log, via consecutive states**, as spec 04: `useTable` replays the log into a `GameState` after every move, and a Yatzy roll is a roll counter going up by one with five of a kind on the dice. A reconnect replays the same log into an identical position, so nothing fires, and the first state a screen ever sees is the baseline. `eventsBetween` from spec 04 was not reused because it deliberately drops an update where two players rolled at once (Everyone at once), which would silently lose a Yatzy; this function reports both.
- **Cost.** Confetti is 54 `span`s animated only through `translate`, `rotate` and `opacity` (compositor properties), so no layout and no JS per frame. The overlay uses `contain: strict` and the glow `will-change: opacity`. The celebration owns its state in `YatzyStage`; an earlier version kept it in `Game` and measured worse, see the proofs.
- **The tray shake is a `translate` on `.tray-col`**, which makes it the containing block of any fixed descendant while it runs (520 ms). The overlay is mounted outside `.tray-col` in the game, and through a portal on the bench, for that reason (a first bench screenshot showed the banner trapped inside the column).
- **Reduced motion** is `usePrefs().reducedMotion`, which follows the OS media query; the global rule in `styles.css` cuts animations to 1 ms, so the still version has no animations at all.
- **Gating.** The bench is a lazy chunk behind a build-time constant; `YatzyBench` is imported only from the bench, so it is not in production.

## Security Considerations

- Nothing crosses the network. The roller's name is shown as React text (escaped, truncated with an ellipsis), never as markup. No new dependencies.

## Success Metrics

1. Every rule in Unit 1 has a test; the suite, lint, typecheck, build and e2e pass.
2. Real screenshots of the burst (light and dark, desktop and phone) and the reduced-motion version.
3. No long task above the 50 ms threshold attributable to the celebration in the measured runs.
4. Production contains no Yatzy bench.

## Open Questions

No open questions at this time. Decisions made without the owner (batch mode):

1. **Duration:** 3.6 s (reduced motion 2.5 s), in `plan.ts`.
2. **Coordination with the Ghost Parade:** burst first, parade right after, never together. The parade is a 7 s walk; played together it would double the noise and two live regions would announce at once. Easy to flip in `YatzyStage.tsx` (render the parade without the `!yatzy.cue` guard).
3. **Who sees it:** every client, including the roller and spectators, whatever the play style.
4. **A Yatzy score or bonus** does not celebrate again: the celebration is for the roll, once, and the pad text and sparkle stay as they were.
5. **Holding a Yatzy and re-rolling** is the same Yatzy: it does not fire again.
6. **Sound:** thump, C major bell arpeggio over 0.66 s, shimmer, all through the master gain. Quiet three-bell version for reduced motion.
7. **Two Yatzys in one update** (Everyone at once) show one banner naming both.
8. **A server-side dev roll override** does not exist and is out of scope, so a full real game cannot be forced to produce a Yatzy; see the e2e limits in the proofs.
