# 02-tasks-shop-inventory-equipping.md

Spec: `02-spec-shop-inventory-equipping.md`

## Relevant Files

| File                                           | Why It Is Relevant                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `packages/shared/src/packs.ts`                 | New. Two sticker packs, the pack stickers, `ShopEntry` and `shopEntry()`.               |
| `packages/shared/src/packs.test.ts`            | New. Prices, unique ids, sticker membership, lookup.                                    |
| `packages/shared/src/protocol.ts`              | Shop messages, `WalletMessage`, `Snapshot.wallet`, shop error codes, wider `StickerId`. |
| `packages/shared/src/index.ts`                 | Re-exports `packs.ts`.                                                                  |
| `apps/server/src/db.ts`                        | `inventory`, `equipped`, `goals` tables; buy, equip, pin and read functions.            |
| `apps/server/src/db.test.ts`                   | Transaction, idempotency, rollback, equip and goal tests.                               |
| `apps/server/src/rooms/TableRoom.ts`           | Shop messages, `Seat.equipped`, wallet messages, pack-sticker check.                    |
| `apps/server/src/rooms/TableRoom.test.ts`      | Room tests for the shop through real clients.                                           |
| `apps/web/src/useTable.ts`                     | Receives the wallet and exposes it.                                                     |
| `apps/web/src/App.tsx`                         | Provides the wallet to the screens.                                                     |
| `apps/web/src/shop/WalletContext.tsx`          | New. Context and `useWallet()`.                                                         |
| `apps/web/src/shop/shopView.ts`                | New. Pure helpers: card state, progress, sections, seat look text.                      |
| `apps/web/src/shop/shopView.test.ts`           | New. Tests for the helpers.                                                             |
| `apps/web/src/shop/Shop.tsx`                   | New. The Shop screen and its cards.                                                     |
| `apps/web/src/shop/ItemPreview.tsx`            | New. Placeholder previews and pack sticker previews.                                    |
| `apps/web/src/shop/WalletPanel.tsx`            | New. The lobby's balance, Shop button and goal bar.                                     |
| `apps/web/src/shop/Shop.test.tsx`              | New. `renderToString` tests for cards and the panel.                                    |
| `apps/web/src/shop/shop.css`                   | New. All shop styles.                                                                   |
| `apps/web/src/screens/Lobby.tsx`               | Shop button, panel, seat look line (shared file).                                       |
| `apps/web/src/Reactions.tsx`                   | Picker shows owned pack stickers; `STICKERS` covers every id.                           |
| `apps/web/src/Reactions.test.tsx`              | New. Picker render tests.                                                               |
| `apps/web/src/art/stickers/packs/*.svg`        | New. Six vector placeholder stickers.                                                   |
| `e2e/tests/shop.spec.ts`                       | New. Earn, buy a pack, see its stickers.                                                |
| `README.md`                                    | Short Shop section.                                                                     |
| `docs/specs/02-spec-shop-inventory-equipping/` | Spec, tasks, audit, proofs, `nano-banana-prompts.md`, validation.                       |

### Notes

- Do not edit `DiceScene.tsx`, `dieModel.ts`, anything under `apps/web/src/cosmetics/`, or the `available` flags in `catalog.ts`.
- The real catalog items are all `available: false` until specs 03 and 04, so purchase tests of catalog items inject a lookup; the real packs are used end to end.
- Table names `players` and `ledger` stay unused.
- Run e2e with `E2E_PORT=8091`. Never use 8080 or 5173. Never match processes by pattern.
- Proofs use guest names only.

## Tasks

### [x] 1.0 Catalog, database and the safe purchase

Covers Spec Unit 1. No server messages or UI yet.

#### 1.0 Proof Artifact(s)

- Test: `packs.test.ts` and `db.test.ts` pass, demonstrating prices, ownership, no double charge, rollback, equip and goal rules.

#### 1.0 Tasks

- [x] 1.1 Create `packs.ts` with two packs, six pack stickers, `ShopEntry` and `shopEntry()`; export it from `index.ts`; test it.
- [x] 1.2 Add `inventory`, `equipped` and `goals` tables to `openDatabase`.
- [x] 1.3 Add `buyItem` (one `BEGIN IMMEDIATE` transaction, guarded deduction, goal cleared on buy) with an injectable lookup for tests.
- [x] 1.4 Add `equipItem`, `pinGoal`, `ownsItem`, `getEquipped` and `getWallet`.
- [x] 1.5 Write the database tests, including a rollback after a failing later step and a second connection.
- [x] 1.6 Add the shop messages, `WalletMessage`, `Snapshot.wallet`, error codes and the wider `StickerId` to `protocol.ts`.

### [x] 2.0 Shop messages and `Seat.equipped`

Covers Spec Unit 2.

#### 2.0 Proof Artifact(s)

- Test: `TableRoom.test.ts` shop tests pass, demonstrating the server flow, privacy of the wallet, guest rules, lobby-only equipping and pack stickers.

#### 2.0 Tasks

- [x] 2.1 Give each room member an `equipped` loaded from the database when they sit, and include it in `lobby()` seats when not empty.
- [x] 2.2 Handle `buy`, `equip` and `goal`: check the table membership, the shop is open for this player, then call `db.ts`; answer with `wallet` to all devices of that player; errors go to `error`.
- [x] 2.3 Equip only before the game starts, and rebroadcast the lobby on equip.
- [x] 2.4 Put `wallet` in the snapshot and send a new one after a payout.
- [x] 2.5 Accept pack stickers in `react` only from owners.
- [x] 2.6 Write the room tests.

### [x] 3.0 The Shop screen, lobby balance and goal pin

Covers Spec Unit 3.

#### 3.0 Proof Artifact(s)

- Test: `shopView.test.ts` and `Shop.test.tsx` pass.
- Screenshot: Shop and lobby.

#### 3.0 Tasks

- [x] 3.1 `useTable` keeps the wallet; `WalletContext` provides it in `App.tsx`.
- [x] 3.2 `shopView.ts` helpers and tests.
- [x] 3.3 `ItemPreview` placeholders; `Shop` screen with sections, cards, two-tap buy, equip, pin; `shop.css`.
- [x] 3.4 `WalletPanel` in the lobby with the Shop button and the goal bar; the seat look line.
- [x] 3.5 Render tests; reduced motion check by CSS media query and prefs class.

### [x] 4.0 Sticker packs

Covers Spec Unit 4.

#### 4.0 Proof Artifact(s)

- Test: picker render tests; `nano-banana-prompts.md`; art files.

#### 4.0 Tasks

- [x] 4.1 Six SVG placeholders under `art/stickers/packs/`.
- [x] 4.2 `STICKERS` covers every id; the picker shows pack stickers only when owned.
- [x] 4.3 `nano-banana-prompts.md`.

### [x] 5.0 End to end, README and gates

Covers Spec Unit 5.

#### 5.0 Proof Artifact(s)

- Test: `e2e/tests/shop.spec.ts`; all gates exit 0.

#### 5.0 Tasks

- [x] 5.1 Playwright test: play 1-card game, check the lobby balance in a second game, top up, buy, see stickers.
- [x] 5.2 README Shop section.
- [x] 5.3 Run lint, typecheck, test, build and e2e on port 8091.
- [x] 5.4 Validation report.
