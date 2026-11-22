# 06 Spec: Super powers

Consumable, one-use items sold in the shop. Two powers, bought with coins and used from stock during a game.

## Decisions (from the owner)

- Extra Turn: the player "goes a little longer": a fresh set of rolls this turn, keeping the dice and holds. Works in Take turns and Everyone at once, only for a player who can act, never on a finished game.
- Unscratch: reopens a box on your own card that was scratched (scored 0).
- No in-game limit: use as many as you own, any time it is legal.
- Used straight from stock (no lobby loadout). Buy any number; the count goes down on use.
- No effect on coin payouts (`payout.ts` is untouched).

## Prices

Extra Turn 80, Unscratch 60 (`packages/shared/src/powers.ts`). The server prices every purchase from that list.

## Assumptions

- Extra Turn is legal only once the three rolls are spent (`ROLLS_LEFT` otherwise), so one is never wasted on a turn that still has rolls. It resets the roll counter to 0 and nothing else. Holds stay and can be changed again; the roll after it rolls the free dice. (`hold` now checks "has any roll happened" by `dice !== null`, which is the same thing as before for a normal turn.)
- Unscratch needs no dice and no turn: it works for any seated player on a live game, including off-turn in Take turns and after finishing their card in Everyone at once. Only a box holding exactly 0 can be reopened (`NOT_A_ZERO`). A finished game is closed (`GAME_OVER`), so the last box of the game cannot be reopened after the fact.
- If Unscratch reopens the very box the player's undo window points at, that window is dropped (nothing is left to take back). Other undo windows are untouched.
- In Take turns, passing the turn now skips seats whose cards are all full. Without powers every seat finishes together, so nothing changes there; with Unscratch a done player can be reopened while others play on, and the skip stops the game stalling on a seat with nowhere to write.
- Both powers are ordinary moves in the move log (`extraTurn`, `unscratch`), so replay, snapshots and spectators work unchanged.
- Spending: the server checks the move with the rules engine first, then takes one from stock (`UPDATE ... WHERE qty > 0`), then applies and broadcasts the move. An illegal move never costs a power; no stock refuses with `NO_POWER`. If the database fails, the move is not applied.
- Guests and tables with no database cannot buy or use powers (same `canShop` guard as the rest of the shop).
- Powers are not in `SLOTS` and not in `shopEntry`/`buyItem` (those are one-per-player). They have their own messages (`buyPower`, `usePower`) and a `power_stock(user_id, power_id, qty CHECK qty >= 0)` table. The wallet message carries `powers`.
- The shop is only open from the lobby, so powers are bought there and used in the next game. Spectators have no seat and cannot use powers.

## UI

- Shop: a "Super powers" section; each card shows "You have N" and stays buyable, with the same confirm step as other purchases.
- Game: small buttons under the Roll button, only when you own the power and it is legal right now. Unscratch asks which zero to reopen, then for a yes.
- Same look as the rest of the shop: theme variables only, Fredoka display, state in words, no motion added.
