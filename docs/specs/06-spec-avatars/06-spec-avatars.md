# 06 Spec: Avatars

Every player has a little 3D avatar, and the shop sells cosmetics for it. This replaces the
removed 2D pets. The Ghost Parade celebration stays.

## The character

A soft, squishy, amorphous blob: a deformed sphere that wobbles like jelly, with two dot eyes, a
tiny mouth and a light blush. No fixed limbs; the cosmetics carry the personality. It is tinted
with the player's seat tint, washed toward white so it stays soft. Witchy and cozy, a light
feminine touch only, no candy look.

All of it is modeled in code (Three.js primitives and one deformed sphere). No glTF, no images.

## Where it shows

- A small avatar in every seat's tab at the top of the pad (game screen).
- A larger one in every seat of the lobby list.
- Everyone sees everyone's cosmetics, from `Seat.equipped`, exactly as dice skins do.
- Dev: `?cosmetics=hat:crown,face:monocle` overrides the cosmetics of every avatar (lab only).
  `?avatars` opens a bench with every item, mood buttons and a tint picker (same gate as
  `?celebrations`: the dev server or `VITE_LAB=1`).

## Cosmetic slots

New slots `hat`, `face`, `held`, `aura` in `packages/shared/src/catalog.ts`. Prices follow the
existing tiers: common 40, spooky 100, legendary 300. No protocol change: the equip flow, wallet
and `Seat.equipped` already carry any slot, and unknown ids are ignored.

| Slot | Items (rarity)                                                              |
| ---- | --------------------------------------------------------------------------- |
| hat  | partyHat (common), bow (common), witchHat (spooky), crown (legendary)       |
| face | glasses (common), mustache (common), monocle (spooky), eyepatch (spooky)    |
| held | wand (common), lantern (spooky), cauldron (spooky), crystalBall (legendary) |
| aura | sparkles (common), candleFlame (spooky), orbitingStars (legendary)          |

The shop gets a section per slot and each slot a line glyph in `ItemPreview`.

## Animation

- Idle: a slow bob, a gentle jelly ripple, a sway, and a blink every few seconds (offset per seat).
- Score: a happy hop with a bigger ripple. Yatzy (roll or score): the same. Zero: a droop (squash,
  lean, frown), then recovery. Events come from `eventsBetween` in
  `cosmetics/celebrations/events.ts`; a reconnect replay causes nothing.
- Reduced motion: the rest pose only. Nothing bobs, wobbles, blinks or bounces.

The animation is a pure function of time (`animation.ts`) and is unit tested.

## Cost and fallback

- One shared WebGL renderer draws every avatar into a hidden canvas and copies the picture into
  each avatar's own 2D canvas, so a table of eight is one GL context. One loop, 30 fps, which
  stops by itself when nothing moves (reduced motion) and pauses on a hidden tab.
- The 3D code loads lazily; the flat avatar shows until it is ready.
- No GPU (no WebGL, or a software renderer as the dice detect it, or a lost context): a flat
  SVG blob with the same items, with a CSS bob and bounce unless motion is reduced.
  `?quality=low` forces this for testing.

## Assumptions

- The avatar sits next to the existing Discord avatar (identity) rather than replacing it.
- Items are in the Fredoka-era palette already used by the app; text pairings are unchanged.
