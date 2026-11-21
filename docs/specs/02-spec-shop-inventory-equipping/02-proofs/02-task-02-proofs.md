# Task 02 Proofs - Shop messages and `Seat.equipped`

## Task Summary

The table room now accepts `buy`, `equip` and `goal`, answers each with the sender's private wallet, shows what players wear through `Seat.equipped`, and takes pack stickers only from owners.

## What This Task Proves

- A client cannot choose a price or name another player: both attempts are ignored (tested with a fake price and a foreign user id).
- The wallet reaches every device of its owner and nobody else, and rides in the snapshot on join.
- Guests cannot shop where guest payouts are off; a table with no database is closed to everyone.
- Equipping works only in the lobby; `Seat.equipped` reaches the other seats and survives a rejoin.
- A pack sticker is refused from a non-owner and delivered from an owner.
- A database failure answers with an error rather than crashing the room, and a failing database no longer stops anyone joining.

## Evidence Summary

- `TableRoom.test.ts`: 17 new tests in `the shop` (47 in the file), all passing.
- Server and shared tests together: all passing.

## Artifact: Room tests

**Command:**

```bash
pnpm exec vitest run apps/server/src/rooms/TableRoom.test.ts -t "the shop"
```

**Result summary:** 17 passed.

## Notes

- `tells every device of a player, and nobody else` checks a third player's wallet counter does not move, and that the lobby JSON never contains the buyer's inventory.
- `acts only for the signed-in player` fails if the server used the user id in the message: Mom has no coins and the named player has 100.
