# 03-spec-dice-skins-and-brews.md

## Introduction/Overview

The shop (spec 02) will sell dice skins and cauldron brews, and the catalog in `packages/shared/src/catalog.ts` already lists them, but the client can draw none of them. This spec is the client-side renderer for five dice skins and four brews. It reads `seat.equipped` and nothing else, draws the roller's skin on the dice and the roller's brew in the cauldron, and is visible to everyone watching that tray. It changes nothing on the server. With nothing equipped the table looks exactly as it does today.

## Goals

- Draw all five skins (bone, obsidian, moonstone, googly, gilded) and all four brews (swamp, violetMurk, witchfire, starwater) from `seat.equipped.diceSkin` and `seat.equipped.brew`.
- Show the skin and brew of whoever is rolling, to everyone who sees that tray.
- Leave the default look unchanged to the pixel: no skin and no brew equals today's porcelain dice and empty cauldron.
- Stay light enough for phones inside Discord: procedural materials and canvas textures only, no image files, few draw calls, small particle counts, and no particle motion with reduced motion.
- Let the owner preview every item before the shop exists: a skin picker, a brew picker and a Yatzy button in the dice lab, and a dev-only `?cosmetics=diceSkin:gilded,brew:witchfire` URL override.
- Mark exactly the nine items of this spec `available: true` in the catalog.

## User Stories

- **As a player who bought a skin**, I want my dice to look different so that the table feels like mine.
- **As a player watching someone roll**, I want to see their skin and brew so that what they bought is worth showing off.
- **As a player on a phone**, I want the extras not to slow the game down.
- **As someone who dislikes motion**, I want the effects to hold still when my device asks for reduced motion.
- **As the owner**, I want to preview each item in the lab so that I can judge it before anyone can buy it.

## Demoable Units of Work

### Unit 1: What to draw, decided by pure code

**Purpose:** One small, testable place that turns a seat's `equipped` into a skin id and a brew id, and holds the colors and settings of every item. It serves the dice scene and the lab, and guards against the catalog and the renderer drifting apart.

**Functional Requirements:**

- The system shall provide `skinOf(equipped)` and `brewOf(equipped)` returning an item id this client can draw, or null for the default look when the slot is empty or the id is unknown.
- The system shall provide `lookOf(equipped)` returning `{ skin, brew }`, and `resolveEquipped(seatEquipped, override)` where a dev override wins when present.
- The system shall hold one definition for each id in `DICE_SKINS` and `BREWS` (colors, roughness, features), and a test shall fail when the catalog and the definitions differ.
- The system shall provide `parseCosmeticsOverride(search)` in `apps/web/src/cosmetics/`, reading `?cosmetics=slot:id,...`, ignoring unknown slots, unknown ids, ids in the wrong slot and repeated slots.
- The system shall honor the override only when `import.meta.env.DEV` or `VITE_LAB === '1'`, so a production build ignores it.

**Proof Artifacts:**

- Test: `look.test.ts` and `parseCosmeticsOverride.test.ts` pass, demonstrating the selection rules, the fallback to default and the catalog parity.

### Unit 2: Dice skins in the scene

**Purpose:** Draw the dice in the equipped skin while a roll tumbles, rests, is held and hovered, exactly where the porcelain dice are drawn today.

**Functional Requirements:**

- The system shall draw the five dice with the skin of the seat whose tray is shown, passed to `DiceTray` as `equipped` and to the scene as `look`.
- The system shall draw **bone** as ivory with ink-black pips and a faint grain, **obsidian** as glossy black with silver pips, **moonstone** as milky pale glass with a soft inner glow on each face that breathes slowly, **googly** as a dark plum die whose pips are white eyes with black pupils that follow the camera and lag behind the roll, and **gilded** as gold metal with dark bronze pips that flare in turn, with small star glints, on a Yatzy.
- The system shall keep every pip readable against its body (dark pips on light bodies, light pips on dark ones).
- The system shall leave the shadows, hover lift, fade, held shelf and hop motion untouched, and shall use the porcelain code path unchanged when no skin is equipped.
- The system shall, with reduced motion on, keep googly pupils centered toward the camera, hold the moonstone glow steady and skip the gilded star glints.
- The system shall keep the skin down to at most three meshes per die.

**Proof Artifacts:**

- Screenshot: one screenshot per skin on a settled roll, plus the default, demonstrating each look and that the default is unchanged.
- Screenshot: googly mid-roll and a gilded Yatzy mid-glint.
- Test: pure tests for the geometry helper and the skin rig where they can run without a GPU.

### Unit 3: Cauldron brews and the Yatzy effects

**Purpose:** Fill the cauldron the dice are shaken in with the roller's brew, and make a Yatzy special for the legendary items.

**Functional Requirements:**

- The system shall draw, inside the cauldron, a liquid surface in the brew's colors with a slowly drifting texture, plus rising particles from one procedural GPU shader (bubbles, smoke puffs, flames, glitter), at most 16 particles per layer and two layers.
- The system shall draw **swamp** as murky green with a few slow bubbles, **violetMurk** as deep purple with light smoke, **witchfire** as dark green liquid with green flames licking the rim, and **starwater** as indigo with glitter and small bubbles.
- The system shall shoot a comet out of the cauldron's place and across the tray on a Yatzy when the brew is starwater.
- The system shall fade the brew out as the cauldron tips to pour and with the cauldron's own fade, so nothing hangs in the air.
- The system shall, with reduced motion on, draw the liquid and particles frozen at one still moment and skip the comet.
- The system shall draw an empty cauldron, as today, when no brew is equipped.
- The system shall flip `available` to true for the five skins and four brews in `catalog.ts`, and change nothing else there.

**Proof Artifacts:**

- Screenshot: one screenshot per brew with the cauldron out, plus the default empty cauldron.
- Screenshot: the starwater comet in flight.
- Test: `catalog` flags test shows exactly the nine items are available among the items of this spec.

### Unit 4: Preview, dev override and the performance budget

**Purpose:** Make every item viewable without the server and record the performance choices.

**Functional Requirements:**

- The system shall add a skin picker, a brew picker, a Yatzy button and a hold-the-cauldron toggle to the dice lab.
- The system shall start the lab with the `?cosmetics=` override applied, and apply the same override in the real game's tray where the lab is enabled.
- The system shall document draw calls, particle counts, texture sizes and reduced-motion behavior in the proof file for this unit.
- The system shall pass `task lint`, `task typecheck`, `task test`, `task build` and `E2E_PORT=8092 task e2e`.

**Proof Artifacts:**

- Screenshot: the lab with the pickers.
- CLI: output of each gate command.

## Non-Goals (Out of Scope)

1. **Any server, `db.ts`, `protocol.ts` or shop UI change.** Spec 02 owns buying, equipping and filling `Seat.equipped`.
2. **Pets, celebrations and their mount points.** Spec 04 owns them; this spec leaves the cauldron rim free for it.
3. **Image assets.** Everything is procedural; no `nano-banana-prompts.md` is needed because there is no art to generate.
4. **Skins on the lobby die or the flat no-WebGL dice.** They keep the porcelain look.
5. **Showing other players' skins on your own tray in Everyone at once.** See Open Questions.
6. **Sound.** No new sounds.

## Design Considerations

Witchy and cozy, with only a light feminine touch and no candy look: muted, earthy and dusk colors (ivory, ink, plum, moss, indigo), no bright pastels, no glitter overload. Fredoka stays the display face; this spec adds no text. The lab pickers reuse the existing form look, and their styles live in a new CSS file.

## Repository Standards

- Pure logic in small modules with tests beside them (`*.test.ts`, Vitest). The web package has no DOM setup, so tests cover pure helpers and use `react-dom/server` where useful.
- New code in `apps/web/src/cosmetics/skins/` and `.../brews/`; shared-file edits (`DiceScene.tsx`, `dieModel.ts`, `DiceTray.tsx`, `Lab.tsx`, `Game.tsx`, `catalog.ts` flags) kept small and separated.
- New styles in new CSS files, not `styles.css`.
- Conventional commits with `Related to T<n> in Spec 03`; no push; `Math.random` stays out of `apps/server` and `packages/rules`.
- Gates: `task lint`, `task typecheck`, `task test`, `task build`, `E2E_PORT=8092 task e2e`.

## Technical Considerations

- **One rig, one code path.** `Dice` builds its materials through a `SkinRig`; with no skin the rig builds exactly the porcelain materials of before, so the default cannot drift.
- **Googly eyes** use a merged sclera mesh and a merged pupil mesh per die. The pupils move in a vertex shader (`onBeforeCompile`) from a per-die uniform: the gaze direction in the die's own space, projected onto each face. Gaze is the direction to the camera, a slow drift, and a lag against the die's own velocity.
- **Moonstone** avoids `transmission` (an extra render pass): an opaque pale body with a radial emissive map per face and a slow pulse.
- **Gilded** metal needs an environment map; without one (software GL) metalness drops so it does not render black.
- **Particles** run on the GPU from a time uniform (`THREE.Points`, additive, shape drawn in the fragment shader), so no CPU work per frame; a second small CPU-driven `Points` draws the comet and the gilded glints.
- **Idle frames.** The scene renders on demand; skins with idle motion invalidate about 15 times a second, only with motion allowed and the page visible. The cauldron already invalidates while it is out.
- **Whose look.** `Game.tsx` already picks the tray player (the player up in Take turns, otherwise your own seat, or the viewed one for a spectator). It passes that seat's `equipped` to `DiceTray`.
- **Yatzy trigger.** A roll with a recorded path and every die equal, as `Rig` already tests for the camera thump; the effect starts at the roll's `celebrate` time and then runs on its own clock.

## Security Considerations

The client only reads `seat.equipped` to choose among ids it already knows; an unknown or hostile string falls back to the default look and is never interpolated into anything. The `?cosmetics=` override is compiled out of production builds' behavior by the lab gate and never reaches the server. No secrets are involved; screenshots use guest names.

## Success Metrics

1. All nine items render and are shown in screenshots.
2. No equipped item draws pixel-for-pixel what the dice scene drew before, checked by the default screenshot and by code path.
3. At most 3 meshes per die and 2 particle draw calls plus 2 small extras for the cauldron; no texture larger than 256 by 256.
4. All five gate commands exit 0.

## Open Questions

No questions are open. Nobody was available to answer, so these were decided and recorded:

1. **Whose look in Everyone at once?** In that mode each player rolls on their own tray, and `Game.tsx` shows you your own tray (a spectator sees the viewed player's). So the tray draws the tray owner's skin and brew, and in practice you see your own skin; other players' skins appear in Take turns, where the tray follows the player up, and to spectators. Showing someone else's dice there would need a second tray, which is a larger change; the owner may want a mini-tray or a roll replay later.
2. **Cauldron is only out while rolling.** The cauldron is drawn only during the shake and pour, so brews show then, not at rest. A resting cauldron prop is a possible later spec.
3. **Where the comet starts.** The cauldron has usually left by the time a Yatzy lands, so the comet starts at the cauldron's home spot above the left of the tray.
4. **Unknown ids.** An id the client does not know (a newer server) draws the default look.
5. **Availability is not checked at draw time.** The client draws any id it knows, so the override can preview items before the flags matter.
6. **Googly gaze.** "Follows the camera or the roll" is done as both: toward the camera at rest with a slow drift, and lagging the die's motion in a roll. Not the mouse pointer, because dice buttons sit over the canvas.
7. **Gilded pips are dark bronze at rest** and flare bright gold on a Yatzy, so they stay readable on gold.
8. **Lobby die and flat dice** keep the porcelain look.
9. **Pets mount point.** Spec 04's pets sit on the rim; the cauldron's group is left open and this spec adds only one `Brew` child to it, so a pet is one more child line.
10. **No Nano Banana prompts file.** There is no art in this spec.
