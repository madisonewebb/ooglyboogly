# 04-spec-pets-and-celebrations.md

## Introduction/Overview

Oogly Boogly players will be able to buy and wear a pet and a Yatzy celebration (spec 02 sells them; the catalog in `packages/shared/src/catalog.ts` lists them). This spec makes the client able to draw them. A pet is a small flat sprite that sits on the dice tray next to the cauldron and reacts to the game: it perks up at a good roll or a score, droops at a bust, and (the legendary one) cheers wildly at a Yatzy. The Ghost Parade is a line of little ghosts that marches across the screen on a Yatzy, for everyone to see. Everything is driven by `seat.equipped`, which every player at the table receives, so everyone sees the same pets. This is a client-only spec: it reads `seat.equipped` and the replayed move log, and changes nothing on the server.

## Goals

- Four pets (toad, black cat, bat, ghost cheerleader) and one celebration (ghost parade) draw correctly when equipped, and the `available` flags of exactly those five catalog items are true.
- Each pet has 3 poses (idle, happy, sad) and the ghost cheerleader a fourth, a Yatzy cheer, all animated calmly and respecting reduced motion.
- Reactions come only from the move log (a pure, tested function), never from new server messages, and fire once per event: never again on a reconnect or a replay.
- With nothing equipped the screen is exactly what it is today.
- Real Nano Banana art drops in by saving files with agreed names, with no code change; until then charming vector placeholders ship.
- The owner can preview everything without the server, on the dev server or in a `VITE_LAB=1` build.

## User Stories

- **As a player with a pet**, I want it to sit by my dice and react to my rolls and scores so that the game feels alive and a little bit mine.
- **As a player at the table**, I want to see other people's pets and their Ghost Parade on a Yatzy so that a Yatzy is a moment for everyone.
- **As the owner**, I want to preview every pose and the parade with a URL parameter so that I can judge the look before the shop sells them.
- **As a player who asks for less motion**, I want pets to swap poses without bouncing, and the parade to appear without marching, so that I am not bothered by movement.

## Demoable Units of Work

### Unit 1: Reactions as pure functions of the move log

**Purpose:** Decide, in plain testable code, what a pet feels and when the parade fires, so the screen code has no game logic in it.

**Functional Requirements:**

- The system shall provide `eventsBetween(prev, next)` that turns two consecutive replayed game states into the live events between them (a roll with its dice, a score with its value, or an undo), and returns no events when nothing changed, when a replay is identical (reconnect), or when more than one roll or more than one score changed at once (a catch-up).
- The system shall provide `petMood(event)` returning `cheer` for a Yatzy (rolled five of a kind, or a Yatzy written in, or a Yatzy bonus), `happy` for a roll with four of a kind, a full house or a straight and for any score above 0, `sad` for a score of 0 (a bust) and for a final roll of a turn with no three of a kind, full house, straight or Yatzy in it, and no reaction otherwise.
- The system shall provide `celebrationStep(event, memo)` firing the celebration on a Yatzy roll, and on a Yatzy score only when that same player's Yatzy roll did not already fire it, so one Yatzy is one parade.
- The system shall map a pose a pet has no art for to `happy` (only the ghost cheerleader has a `cheer`).
- The system shall parse `?cosmetics=pet:toad,celebration:ghostParade` with a pure `parseCosmeticsOverride(search)`, ignoring unknown slots and ids that do not fit their slot.

**Proof Artifacts:**

- Test: `mood.test.ts` and `parseCosmeticsOverride.test.ts` pass and cover each mood, each non-event, reconnect, catch-up, undo, the roll-then-score dedupe and the parser edge cases.

### Unit 2: Pet sprites, animated, with placeholder art and a prompt sheet

**Purpose:** Draw each pet in each pose, from real art when it exists and from vector placeholders when it does not.

**Functional Requirements:**

- The system shall load `apps/web/src/art/pets/<petId>/<pose>.webp` with `import.meta.glob` when the file exists, per pose, and otherwise draw a witchy vector placeholder for that pet and pose in React and SVG.
- The system shall animate with the `motion` library: an idle bob, a hop and squash for happy, a slump for sad, a series of hops and a wiggle for cheer, each with a soft shadow, and nothing but a pose swap with reduced motion.
- The system shall ship `nano-banana-prompts.md` with one ready-to-paste prompt per pet per pose (13) and one for the ghost parade, each naming the exact filename to save as.
- The system shall keep every placeholder readable at about 4.5rem and fine on both the light and dark themes.

**Proof Artifacts:**

- Test: pure tests for the art index (file path to pet and pose), the pose fallback and the per-pose motion plan; `renderToString` renders every pet and pose.
- Screenshot: every pet in every pose (13 images), captured on the dev bench.

### Unit 3: Pets on the table, driven by the game and `seat.equipped`

**Purpose:** Show the right pet to everyone, reacting at the right time.

**Functional Requirements:**

- The system shall show the pet of whoever's tray is shown (the player up in Take turns; you, or the player you are viewing as a spectator, in Everyone at once), as a DOM overlay over the dice tray, so `DiceScene.tsx` is untouched.
- The system shall, in Take turns, keep showing the pet of the player who just acted until its reaction ends, because the turn has already moved on when a score lands; in Everyone at once react only to the shown player's moves.
- The system shall show nothing when the shown player has no pet, and leave the screen as it is today.
- The system shall mark the overlay `aria-hidden` and keep it from taking pointer events or covering a die.

**Proof Artifacts:**

- Screenshot: the pet on the tray in light and dark themes.
- Test: an e2e plays a real game with nothing equipped and finds no pet or parade; the existing e2e suite passes.

### Unit 4: Ghost Parade

**Purpose:** Make a Yatzy a moment for the whole table.

**Functional Requirements:**

- The system shall, when a Yatzy event happens for a player whose `equipped.celebration` is `ghostParade`, march a line of little ghosts across the whole screen, on every client, once, then remove it from the page.
- The system shall keep the existing Yatzy `Sparkles` and the sticker floats working at the same time.
- The system shall, with reduced motion, show the ghosts standing in a row for about three seconds, with no marching or bobbing, and announce the Yatzy politely to screen readers either way.
- The system shall let the latest parade win if a second one starts while the first plays.

**Proof Artifacts:**

- Screenshot: the parade mid-march (captured mid-animation, said so in the proof), and a reduced-motion capture.

### Unit 5: Dev override and bench

**Purpose:** Let the owner see it all before the shop exists.

**Functional Requirements:**

- The system shall honor `?cosmetics=...` only when `import.meta.env.DEV` or `VITE_LAB === '1'`, applying it to every seat so the owner sees pets in a real game too.
- The system shall provide a bench page (`?pets`, same gating) with a control for every pet and every pose and a button for the parade.

**Proof Artifacts:**

- Test: the production build ignores both the parameter and the bench (e2e opens `?pets&cosmetics=pet:toad` and sees the normal app and no pet).

## Non-Goals (Out of Scope)

1. **Anything on the server**, `db.ts`, `protocol.ts` or the shop and lobby UI: spec 02.
2. **Dice skins, brews and `DiceScene.tsx` changes**: spec 03.
3. **Real generated art**: Nano Banana images cannot be made in a build; prompts are written for the owner to run.
4. **3D pet models** or pets that move around the screen.
5. **Sounds for pets** (a croak, a meow): a later polish.
6. **More celebrations or pets**, and legendary-only reactions for pets other than the ghost cheerleader.

## Design Considerations

Witchy and cozy, only a light feminine touch, no candy look. Placeholders use a deep plum outline (`#2A2440`) with a thin pale rim so the black cat and bat read on the dark theme, muted fills (toad moss green, cat ink black with amber eyes, bat plum grey, ghost white with lavender and dusky-rose pompoms) and no gradients, glitter or saturated pinks. The pets are drawn as billboards: flat, facing the viewer, standing on a soft oval shadow, in the style of the existing ghost stickers in `apps/web/src/art/stickers/`. The parade ghosts match the sticker ghosts: round white sheets, big dark eyes, a few with a witch hat, bow or party hat. The only text is a visually hidden announcement, so no new color pairings arise; `palette.test.ts` is unaffected. Fredoka stays the display face; the bench uses the existing buttons.

## Repository Standards

- Pure logic with Vitest tests beside it; the web package has no DOM setup, so components are checked with `react-dom/server`'s `renderToString` and by Playwright.
- New code under `apps/web/src/cosmetics/pets/` and `.../celebrations/`, new styles in new CSS files (not `styles.css`), small edits only in `Game.tsx` and `main.tsx`.
- Conventional commits, each ending with `Related to T<n> in Spec 04`; one commit per parent task; no push.
- Gates: `task lint`, `task typecheck`, `task test`, `task build`, `E2E_PORT=8093 task e2e`.

## Technical Considerations

- **Reactions come from the move log, via consecutive states.** `useTable` replays the log into a `GameState` after every move and does not expose the raw moves. The hook compares each new state with the previous one (`eventsBetween`); a roll is `turn.rolls` going up, a score is a box filling. This is the move log's own effect, needs no new message and no edit to `useTable.ts`, and by construction cannot fire on a reconnect (the same log gives the same state). A jump of more than one roll or one score at once is treated as a catch-up and ignored.
- **An undo** raises the restored turn's roll counter; it is detected from the emptied box and not counted as a roll.
- **Mount point.** `.tray-col` is `position: relative`. `DiceTray` is wrapped in a small relatively positioned `div` that also holds the pet layer, which sits in the top-right of the stage, just over the tray frame near where the cauldron pours. `DiceScene.tsx` and `dieModel.ts` are not touched.
- **Art loading.** `import.meta.glob('../../art/pets/*/*.webp', { eager: true, query: '?url', import: 'default' })` yields `{}` when no file exists, which is not an error.
- **Parade** is a `position: fixed`, `pointer-events: none` layer, driven by CSS keyframes (translate across the viewport, bob inside) so it costs no React renders while it marches; React only mounts it and removes it after its duration.
- **Gating.** `import.meta.env.DEV || VITE_LAB === '1'` is a build-time constant, so the override and bench code is dropped from production builds.

## Security Considerations

- Nothing new crosses the network. `seat.equipped` is data from the server shown as given; an unknown pet or celebration id is ignored, never rendered as markup or a path.
- Art paths come from build-time globbing, not from user input. The dev override is absent from production builds.

## Success Metrics

1. All pure functions have tests for each rule above; the whole suite, lint, typecheck, build and e2e pass.
2. 13 pet screenshots plus the parade, all real captures from the app.
3. A tray with nothing equipped renders the same DOM as before (no pet or parade elements).
4. Dropping a `toad/happy.webp` into `art/pets/` changes the happy toad with no code change (checked once, then removed).

## Open Questions

No open questions at this time. Decisions made without the owner (batch mode):

1. **Whose pet in Everyone at once:** the pet of the player whose tray you see, which is yours when you are seated (as for dice), the viewed player's when you spectate. Only their moves make it react. Other players' pets are not shown (one tray, one pet). A Yatzy parade, though, plays for any player's Yatzy, for everyone.
2. **Take turns:** the pet follows the player who just acted until its reaction ends (about 2 s), then the pet of the player now up swaps in.
3. **Whose celebration:** the celebration equipped by the player who got the Yatzy.
4. **"Good roll":** four of a kind, a full house or a straight. **"Bad roll":** the third roll of a turn with no three of a kind, full house, straight or Yatzy. Any score above 0 is happy, a 0 is sad. Easy to retune in `mood.ts`.
5. **One Yatzy, one parade:** it fires on the Yatzy roll and not again on the Yatzy score that follows.
6. **Position:** top-right of the dice stage, over the frame (the cauldron itself is only visible while pouring, so the pet cannot live on a moving rim).
7. **Dev override** applies to every seat, so one URL shows a pet whoever is up.
8. **Bench route:** `?pets`, added to `main.tsx` beside `?lab` so that `Lab.tsx` (spec 03's) is untouched.
9. **Placeholders:** real images win per pose; any pose without a file falls back to the placeholder for that pose.
