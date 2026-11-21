# Shop roadmap: specs 02, 03 and 04

Spec 01 (coins and payouts) is built. These three specs turn coins into a shop. They are built in
parallel, each in its own git worktree and branch, so this file fixes what they share and who owns
which files. Merge order is 02, then 03 and 04 in either order.

## The shared contract (already in the code)

- `packages/shared/src/catalog.ts`: slots (`diceSkin`, `brew`, `pet`, `celebration`), rarities, the price
  table, every item with an id, name, rarity, price and an `available` flag, and the `Equipped` type.
- `Seat.equipped?: Equipped` in `packages/shared/src/protocol.ts`: what a player has on, shown to
  everyone at the table. A missing slot is the default look (the one the game has today).
- Prices: skins, brews and celebrations 40 / 100 / 300; pets 60 / 150 / 400 (common, spooky, legendary).
- `available: false` means the client cannot draw the item yet. The shop lists it as "coming soon"
  and will not sell it. Spec 03 flips the flags of its dice skins and brews, spec 04 those of its
  pets and celebrations, and nobody else touches them.
- The balance table is `wallets` (not `players`; an earlier reverted coins version left a `players`
  table in some databases). Coins come only from finished games (spec 01).

## Who owns what

| Spec                          | Owns (may create or change)                                                                                                                                                                                                                                                                                                                                     | Must not change                                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 02 Shop, inventory, equipping | `apps/server/src/db.ts` (inventory and equipped tables, buy and equip), the server messages or HTTP routes for shop actions, shop messages in `protocol.ts`, `apps/server/src/rooms/TableRoom.ts` (filling `Seat.equipped`), a new Shop screen and a Shop button in the lobby, the goal pin, sticker packs (new `STICKER_IDS` and art), the README Shop section | `DiceScene.tsx`, `dieModel.ts`, anything under `apps/web/src/cosmetics/`                                                       |
| 03 Dice skins and brews       | `apps/web/src/dice/DiceScene.tsx`, `dieModel.ts`, new files under `apps/web/src/cosmetics/skins/` and `.../brews/`, the lab page (`Lab.tsx`) for previewing, and the `available` flags of `DICE_SKINS` and `BREWS`                                                                                                                                              | The server, `db.ts`, `protocol.ts`, the shop UI                                                                                |
| 04 Pets and celebrations      | New files under `apps/web/src/cosmetics/pets/` and `.../celebrations/`, small hooks in `Game.tsx` for reactions to rolls, scores, busts and Yatzys, and the `available` flags of `PETS` and `CELEBRATIONS`                                                                                                                                                      | The server, `db.ts`, `protocol.ts`, the shop UI, `DiceScene.tsx` internals beyond one mount point for pets on the cauldron rim |

Both 03 and 04 read `seat.equipped` and nothing else, so they do not depend on spec 02 being merged.
Until it is, they preview with a dev-only override (the `?lab` page or a `?cosmetics=slot:id,...` URL
parameter that exists only on the dev server and in `VITE_LAB=1` builds).

## Rules for every spec

- Follow the SDD workflow's documents, using `docs/specs/01-spec-coins-and-payouts/` as the template:
  spec, tasks, audit, proofs folder and validation report, in `docs/specs/NN-spec-<name>/`.
- Nobody is available to answer questions during a build. Decide, write the assumption down in the
  spec's Open Questions, and move on. Treat every approval checkpoint in the workflow as approved.
- Look and feel: witchy and cozy, with only a light feminine touch; no candy look. Fredoka display
  face. Every text pairing must pass the WCAG AA checks in `palette.test.ts`. Respect reduced motion.
- Art: Nano Banana assets cannot be generated in a build. Ship working placeholders (vector or
  procedural) and write `nano-banana-prompts.md` in the spec folder with one prompt per asset, in the
  style of the existing stickers in `apps/web/src/art/stickers/`.
- Quality gates, all of which must exit 0 before a spec is called done: `task lint`, `task typecheck`,
  `task test` (100% coverage stays on `packages/rules`), `task build`, `task e2e`. Run e2e with your
  own port so parallel builds do not collide: `E2E_PORT=8091 task e2e` (spec 02), 8092 (spec 03),
  8093 (spec 04). Never use ports 8080 or 5173; they belong to a person's own dev servers.
- Commit on your own branch in your own worktree, in conventional commits with
  `Related to T<n> in Spec <NN>` lines. Never push, never open a pull request, never touch `develop`.
  Pushing `develop` deploys to staging.
- Never run `pkill -f`, `killall` or anything that matches processes by pattern; stop only the
  process ids you started.
- Randomness: no `Math.random` in `apps/server` or `packages/rules`.
