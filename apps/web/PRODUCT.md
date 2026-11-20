# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One family's adults, playing together on evening Discord voice calls, mostly from laptops and
desktops. Nobody is a stranger; the table is at most eight people who know each other well. The job
is a relaxed game night: roll, decide which box to fill, watch everyone else's turns, and see who
wins.

## Product Purpose

Rollhouse is a private five-dice scoring game (the Yatzy family of rules) that runs as a Discord
Activity. Each player can fill 1 to 5 scorecards at once. Success is the family choosing it for game
night and staying in it between turns because watching is pleasant, not only playing.

## Positioning

It is made for one family, not a market. The server rolls every die with a secure random source and
every screen plays the same recorded physical tumble, so the dice feel real and nobody can doubt
them. Planned: a persistent personal aquarium bought with game winnings, shown to the whole table on
its owner's turn.

## Operating Context

- Launched inside Discord's Activity frame during a voice call; sign-in is Discord's own.
- One table per Activity instance. Play styles: Take turns (seat order or shuffled once) and
  Everyone at once (also used for games spread over days).
- Between turns, players watch the active player's dice tray and switch between players' score pads
  with tabs.
- Evening use is the primary scene. Light and dark modes both exist; the system setting is the
  default.

## Capabilities and Constraints

- React + Vite client, React Three Fiber dice scene with physics tumbles recorded offline and
  replayed; Colyseus server is authoritative and clients send only intents.
- Every color comes from one palette file with a WCAG AA (4.5:1) contrast test on every text pairing.
- Text sizes Regular / Large / Extra large scale the whole UI (rem-based); minimum body size is 17px.
- Reduced motion, fast rolls, and a volume control are user preferences stored on the device.
- The whole score pad must fit a laptop window without scrolling.
- Up to 8 seats; each seat has a unique player color, chosen in the lobby and shown on avatars, the
  pad's numbers and the dice cup.
- Planned feature (agreed, not built): coins earned by every player from each game, stored
  server-side per Discord account, spent in a shop on semi-realistic freshwater fish, plants and
  decor for a personal aquarium. You always see your own tank; on a player's turn everyone sees
  that player's tank.

## Brand Commitments

- Name: Rollhouse (defined only in `packages/shared/src/brand.ts`).
- The previous candy-shop identity is rejected entirely: no candy names, colors, motifs or
  vocabulary. The owner wants only a light touch of femininity in its place.
- The aquarium fish are semi-realistic real species, not cartoons.

## Evidence on Hand

No photography, illustrations, logos or marketing assets exist beyond the code-drawn dice scene and
icons. There are no testimonials, metrics or public claims, and none should be invented.

## Product Principles

- The dice are the show: rolls must stay fair, physical and the same on every screen.
- Watching is part of playing: what's on screen between your turns should be worth looking at.
- Calm over flashy: an evening game among family, never a casino or a slot machine.
- Readable at a glance on a laptop, at any text size.

## Accessibility & Inclusion

WCAG AA contrast for all text, rem sizing with three text sizes, keyboard play (Space to roll),
visible focus, and reduced-motion support are existing commitments to preserve.
