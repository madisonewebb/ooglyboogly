# 02-spec-shop-inventory-equipping.md

## Introduction/Overview

Spec 01 gave every player a coin balance that grows as they finish games. This spec lets them spend it. It adds a shop reached from the lobby, an inventory of what each player owns, one equipped item per slot that everyone at the table can see, a goal pin with a progress bar, and the first two things that are for sale from day one: sticker packs that unlock extra stickers in the reaction picker. Dice skins, brews, pets and celebrations are listed in the shop (they are in the shared catalog) but stay "coming soon" until specs 03 and 04 can draw them. This spec follows the contract in `docs/specs/shop-roadmap.md`.

## Goals

- A player can spend coins in a shop opened from the lobby, and sees their balance in the lobby and in the shop.
- Every purchase is validated by the server against the catalog and is one database transaction that cannot double-charge or overspend.
- Each player can equip one item per slot; what they wear is visible to everyone through `Seat.equipped`.
- A player can pin one goal and sees coins-toward-price progress in the lobby, on any device.
- The whole loop (earn, buy, unlock, see it) is demoable today through sticker packs.
- Items that are not drawable yet are shown as "coming soon" and cannot be bought.

## User Stories

- **As a player**, I want to see what I can buy and how close I am so that earning coins feels like it leads somewhere.
- **As a player**, I want to preview an item (its name, rarity, price and a line about it) before I spend coins so that I never buy blind.
- **As a player saving up**, I want to pin the thing I want and watch a progress bar so that I have something to aim for.
- **As a player**, I want to equip what I own and have my table see it so that my choices show.
- **As the host**, I want the server to be the only authority on prices and ownership so that nobody can cheat the shop.

## Demoable Units of Work

### Unit 1: Owning things: catalog, tables and a safe purchase

**Purpose:** Make coins spendable on the server, and nothing else yet. It serves every later unit and protects the economy.

**Functional Requirements:**

- The system shall define two sticker packs in `packages/shared/src/packs.ts`, each priced at the common tier (40 coins), each with three pack-only stickers, and a single `shopEntry(id)` lookup that covers the catalog items and the packs.
- The system shall create `inventory`, `equipped` and `goals` tables in the existing database with `CREATE TABLE IF NOT EXISTS`, never reusing the names `players` or `ledger`.
- The system shall buy an item in one `BEGIN IMMEDIATE` transaction: refuse if already owned, deduct the catalog price with a guarded `UPDATE` (so the balance never goes below 0), insert the inventory row with the price paid, and clear the goal if it was this item.
- The system shall refuse, changing nothing, a purchase of an unknown item, an item that is not `available`, an item already owned (a no-op error), and an item the player cannot afford.
- The system shall never use a price, name or availability sent by a client.
- The system shall equip an owned item in its slot (replacing what was there) or unequip a slot, accepting only an item that `fitsSlot()` the slot and is owned.
- The system shall pin one goal per player at most, only for an item that is for sale and not yet owned, and clear it on request or when it is bought.

**Proof Artifacts:**

- Test: `db.test.ts` buys, refuses a double buy, cannot afford, unknown, coming soon, rolls back when a step fails, equips, replaces, unequips, pins and clears, which demonstrates the rules.
- Test: `packs.test.ts` shows pack ids never clash with the catalog and prices equal the common tier.

### Unit 2: The table knows: shop messages and `Seat.equipped`

**Purpose:** Let clients ask for these actions and let everyone see the result. It serves the Shop screen and the other players.

**Functional Requirements:**

- The system shall accept `buy`, `equip` and `goal` messages on the table room (not HTTP: the room already authenticates the session and can rebroadcast), and answer each with a private `wallet` message to every device of the player who sent it.
- The system shall include the player's own `wallet` (balance, owned ids, equipped, goal, `canBuy`) in the snapshot on join and rejoin, and never send it to anyone else.
- The system shall refuse to buy, equip or pin for a guest (id starting `guest-`) unless guest payouts are enabled, and when no database is configured, answering `SHOP_CLOSED`.
- The system shall allow equipping only before the game starts (in the lobby) and answer `STARTED` otherwise; buying and pinning are allowed at any time.
- The system shall load `Seat.equipped` from the database when a player is seated, and rebroadcast the lobby when a player changes it.
- The system shall let a player change only their own items: the player is the authenticated session, and the messages carry no user id.
- The system shall accept a sticker pack's stickers in a reaction only from a player who owns the pack, and always accept the default stickers.
- The system shall send the updated `wallet` when a finished game pays out.

**Proof Artifacts:**

- Test: `TableRoom.test.ts` plays buy, equip, unequip, goal and refusal paths through a real room, shows `Seat.equipped` reaching a second client, shows a guest refused where payouts are off, and shows a pack sticker accepted only from its owner.

### Unit 3: The Shop screen, the lobby balance and the goal pin

**Purpose:** The part players touch.

**Functional Requirements:**

- The lobby shall show the player's coin balance (cauldron coin icon) and a Shop button, and, when a goal is pinned, its name and a progress bar of coins toward its price.
- The Shop screen shall list every catalog item and the two packs in sections, each card showing name, rarity, price, blurb, a preview, and one clear state: owned (and equipped or not), can afford, cannot afford (and how many coins short), or coming soon (not buyable).
- Buying shall take two taps (Buy, then a confirmation naming the price), so a stray tap spends nothing.
- A card shall offer Equip or Unequip for an owned cosmetic, Pin or Unpin as the goal for an unowned item that is for sale, and nothing but the owned state for a pack.
- Where a live preview is not possible yet, the card shall show a tasteful placeholder (a witchy glyph in a rarity-tinted frame); sticker packs shall show their actual stickers.
- The screens shall use the Fredoka display face and existing palette tokens only, so every text pairing already passes `palette.test.ts`, shall not use a candy look, and shall respect reduced motion.
- The lobby seat list shall show what each player has on.

**Proof Artifacts:**

- Test: render tests with `renderToString` for the card states and the lobby panel; pure helper tests for state, progress and sections.
- Screenshot: the Shop screen and the lobby with balance and goal bar.

### Unit 4: Sticker packs in the reaction picker

**Purpose:** The first thing worth buying, and proof the loop works today.

**Functional Requirements:**

- The picker shall show the nine default stickers always, and a pack's three stickers only once the player owns it.
- Each pack sticker shall ship as a simple witchy vector placeholder, and `nano-banana-prompts.md` shall have one prompt per sticker in the style of the existing stickers.
- A pack sticker sent by an owner shall float up on every player's screen, owner or not.

**Proof Artifacts:**

- Test: a picker render test; Playwright e2e: earn coins in a 1-card two-guest game, top up, buy a pack, see its stickers in the picker.
- File: `nano-banana-prompts.md` with six prompts.

### Unit 5: End to end and the README

**Functional Requirements:**

- A Playwright test shall play a 1-card two-guest game to the end and see the earned coins in the lobby balance and the shop, buy a sticker pack, and see the pack's stickers in the picker in a second game.
- The README shall have a short Shop section.

## Non-Goals (Out of Scope)

1. **Drawing the cosmetics**: dice skins, brews, pets and celebrations, and changing their `available` flags (specs 03 and 04).
2. **Selling items for real money, gifting, trading or refunds.**
3. **Rotating prices, sales or daily stock**: prices are fixed from the catalog.
4. **Equipping or changing look during a game**: the lobby only.
5. **Admin tools** for granting items or coins: fixes are made in the database.
6. **A way back to the lobby after a game**: the existing "close and relaunch" flow stays.

## Design Considerations

Witchy and cozy with only a light feminine touch; no candy look (see the owner's note). The Shop is a panel-based screen like the lobby: Fredoka for headings, names and prices; the existing lavender and plum palette; the cauldron coin icon (`CauldronCoinIcon`) next to every amount. Rarity is shown by a small badge with the word (never by color alone) and a thin frame weight, not by neon colors. Card state is spelled out in words and an icon. Placeholder previews are a quiet line glyph (die, cauldron, paw, spark) in a plum-tinted frame. Progress bars use `--strong` on `--rule`, with the numbers written beside them. Motion is a short fade and a small pop on purchase; with reduced motion there is none.

## Repository Standards

- Pure shared data in `packages/shared`, server logic in `apps/server/src`, UI in `apps/web/src`; tests beside the code (Vitest; `renderToString` for web renders); Playwright for e2e.
- Plain `CREATE TABLE IF NOT EXISTS` in `db.ts`; WAL and Litestream stay compatible.
- No `Math.random` in the server or rules. Conventional commits. 100% coverage on `packages/rules` (untouched here).
- New styles in a new file (`shop/shop.css`), following `payout.css`.

## Technical Considerations

- **Messages, not HTTP.** The table room already authenticates the signed session on join, knows the seated player and can rebroadcast the lobby, so shop actions are room messages (`buy`, `equip`, `goal`) and the answer is a private `wallet` message. A purchase therefore needs the player to be connected to a table, which is how the lobby works anyway.
- **Goal storage.** A `goals` table (one row per player) on the server, so it follows a player across devices and tables.
- **Packs are not catalog items.** `catalog.ts` is a shared contract with fixed slots; a pack has no slot, so packs live in `packs.ts` and `shopEntry()` joins both for the shop.
- **Sticker authority.** `STICKER_IDS` stays the free default set; `PACK_STICKER_IDS` is the extra set; `isSticker` accepts both and the room checks pack ownership with a database read (cooldown-limited) before broadcasting.
- **Wallet in the client.** A React context fed by `useTable` gives the lobby, the shop and the sticker picker the wallet without changing `Game.tsx`.
- **Equip timing.** Rejected once `setup` exists, because a seat's look is fixed when the game starts and other specs draw from `Seat.equipped`.

## Security Considerations

- The client sends only an item id (and a slot); the server prices, checks availability and ownership, and identifies the player from the signed session.
- Guests can shop only where `GUEST_LOGIN` is on, so guest ids cannot mint or spend coins in staging or production.
- No secrets, tokens or real Discord ids appear in tests, proofs or screenshots (guests only).

## Success Metrics

1. A purchase never changes a balance by anything but the catalog price, never below zero, and never twice for one item (tests).
2. The loop works in a real browser: earn, buy a pack, see its stickers.
3. Everything the catalog marks unavailable is visible and unbuyable.
4. `task lint`, `task typecheck`, `task test`, `task build` and `E2E_PORT=8091 task e2e` all pass.

## Open Questions

No open questions remain; nobody could answer during the build, so these were decided and recorded (the owner may change any of them):

1. **Goal storage:** server-side in a `goals` table, so it follows the player across devices.
2. **Shop transport:** room messages, not HTTP routes (see Technical Considerations).
3. **When equipping is allowed:** lobby only, before the game starts. Buying and pinning are allowed at any time.
4. **Pinning an unavailable item:** not allowed; the goal must be something that can be bought now.
5. **Buying while a game is running:** allowed on the server, but the Shop button lives in the lobby.
6. **Two-tap purchase:** a confirmation step names the price before coins are spent.
7. **Spectators:** may buy, equip and pin like anyone else, because the wallet belongs to the person, not the seat; the look applies when they next sit.
8. **Unavailable items equipped:** none can be owned, because buying them is refused; equip requires ownership only.
9. **Packs live outside the catalog** (`packs.ts`) so `catalog.ts` and its slot contract stay untouched.
10. **E2E coins:** a 1-card game pays 3 to 6 coins, so the browser test cannot earn the 40 a pack costs. It plays the game for real, checks the lobby balance equals what was earned, then tops the wallet up directly in the test's own temporary database file. The server code path of the purchase is unchanged.
11. **Seat look in the lobby:** shown as a quiet text line under the name, because there are no drawable cosmetics yet.
12. **Shop closes if the game starts** while a player is in it; the table moves on.
