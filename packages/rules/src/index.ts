/**
 * Pure rules reducer for Rollhouse. Implemented in milestone 2.
 *
 * Dice never come from Math.random (ESLint enforces this here and in
 * apps/server); the server rolls with crypto.randomInt.
 */
export const DICE_PER_ROLL = 5;
export const FACES = 6;
