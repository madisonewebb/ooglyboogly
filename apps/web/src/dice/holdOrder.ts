/**
 * The order dice are held in. The rules only know which dice are held, so the
 * order is presentation: each tray watches `held` change and remembers who
 * joined when. Dice that appear together (a first look at someone's tray)
 * join in die order.
 */

/** `prev` with released dice dropped and newly held dice appended. */
export function holdOrder(prev: readonly number[], held: readonly boolean[]): number[] {
  const kept = prev.filter((die, at) => held[die] === true && prev.indexOf(die) === at);
  const fresh = held.flatMap((h, die) => (h && !kept.includes(die) ? [die] : []));
  return [...kept, ...fresh];
}

/**
 * The shelf seat of every die: held dice by their place in `order`, the rest
 * by their own index (their seat isn't used until they are held).
 */
export function shelfSeats(order: readonly number[], count: number): number[] {
  return Array.from({ length: count }, (_, die) => {
    const at = order.indexOf(die);
    return at < 0 ? die : at;
  });
}
