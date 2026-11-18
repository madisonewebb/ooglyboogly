import { randomInt } from 'node:crypto';
import { DICE_PER_ROLL, type Die, FACES } from '@rollhouse/rules';

/**
 * Rolls dice for a roll the server has just accepted. crypto.randomInt draws
 * from the OS's secure random source without modulo bias. Never use
 * Math.random, and never derive a die from the animation seed.
 */
export function rollDice(count: number): Die[] {
  if (!Number.isInteger(count) || count < 1 || count > DICE_PER_ROLL) {
    throw new RangeError(`can roll 1 to ${DICE_PER_ROLL} dice, not ${count}`);
  }
  return Array.from({ length: count }, () => randomInt(1, FACES + 1) as Die);
}
