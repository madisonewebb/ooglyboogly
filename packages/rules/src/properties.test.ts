import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { activePlayers, applyMove, createGame, isCardFull, replay } from './engine';
import { cardOptions } from './options';
import { computePayouts } from './payout';
import { scoreBox } from './scoring';
import { cardTotal, playerTotal } from './totals';
import {
  BOXES,
  type Die,
  YATZY,
  FULL_HOUSE,
  type GameSetup,
  type GameState,
  LARGE_STRAIGHT,
  type Move,
  ROLLS_PER_TURN,
  SMALL_STRAIGHT,
  UPPER_BOXES,
} from './types';

const die = fc.integer({ min: 1, max: 6 }) as fc.Arbitrary<Die>;
const dice = fc.array(die, { minLength: 5, maxLength: 5 });

describe('scoring properties', () => {
  it('does not depend on the order of the dice', () => {
    fc.assert(
      fc.property(dice, fc.func(fc.integer()), (ds, key) => {
        const shuffled = [...ds].sort((a, b) => key(a) - key(b) || a - b);
        for (const box of BOXES) expect(scoreBox(box, shuffled)).toBe(scoreBox(box, ds));
      }),
    );
  });

  it('keeps every box within its possible values', () => {
    fc.assert(
      fc.property(dice, (ds) => {
        const total = ds.reduce<number>((a, b) => a + b, 0);
        UPPER_BOXES.forEach((box, i) => {
          const v = scoreBox(box, ds);
          expect(v % (i + 1)).toBe(0);
          expect(v).toBeLessThanOrEqual(5 * (i + 1));
        });
        expect([0, total]).toContain(scoreBox('threeKind', ds));
        expect([0, total]).toContain(scoreBox('fourKind', ds));
        expect([0, FULL_HOUSE]).toContain(scoreBox('fullHouse', ds));
        expect([0, SMALL_STRAIGHT]).toContain(scoreBox('smallStraight', ds));
        expect([0, LARGE_STRAIGHT]).toContain(scoreBox('largeStraight', ds));
        expect([0, YATZY]).toContain(scoreBox('yatzy', ds));
        expect(scoreBox('chance', ds)).toBe(total);
        // A large straight is always a small one; four of a kind is always three.
        if (scoreBox('largeStraight', ds)) expect(scoreBox('smallStraight', ds)).toBe(30);
        if (scoreBox('fourKind', ds)) expect(scoreBox('threeKind', ds)).toBe(total);
      }),
    );
  });
});

/** Small seeded PRNG so a fast-check seed drives a whole game deterministically. */
function prng(seed: number) {
  let a = seed >>> 0;
  return (n: number) => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) % n) as number;
  };
}

/** Plays a whole game with random but legal moves, checking invariants on the way. */
function simulate(setup: GameSetup, seed: number) {
  const r = prng(seed);
  let state: GameState = createGame(setup);
  const moves: Move[] = [];
  const apply = (m: Move) => {
    state = applyMove(state, m);
    moves.push(m);
  };
  const face = () => (r(6) + 1) as Die;

  let guard = 0;
  while (!state.finished) {
    if (++guard > 20_000) throw new Error('game did not finish');
    const actors = activePlayers(state);
    const player = actors[r(actors.length)]!;
    const { turn, cards } = state.players[player]!;

    const wantsRoll = turn.rolls === 0 || (turn.rolls < ROLLS_PER_TURN && r(3) > 0);
    if (wantsRoll) {
      if (turn.rolls > 0) {
        for (let i = 0; i < 5; i++)
          if (r(4) === 0)
            apply({ type: 'hold', player, die: i, held: !state.players[player]!.turn.held[i] });
        if (state.players[player]!.turn.held.every(Boolean))
          apply({ type: 'hold', player, die: r(5), held: false });
      }
      const free = state.players[player]!.turn.held.filter((h) => !h).length;
      // Now and then roll a Yatzy so the joker paths get exercised.
      const same = r(8) === 0 ? face() : null;
      apply({ type: 'roll', player, values: Array.from({ length: free }, () => same ?? face()) });
      continue;
    }

    const choices = cards.flatMap((c, ci) => {
      if (isCardFull(c)) return [];
      const opts = cardOptions(c, turn.dice!).options.filter((o) => o.allowed);
      // Invariant: a card with open boxes always has somewhere legal to write.
      expect(opts.length).toBeGreaterThan(0);
      return opts.map((o) => ({ card: ci, box: o.box }));
    });
    const pick = choices[r(choices.length)]!;
    const before = state;
    apply({ type: 'score', player, ...pick });

    // Invariant: undo exactly reverses a score.
    if (!state.finished && r(4) === 0) {
      const undone = applyMove(state, { type: 'undo', player });
      expect(undone).toEqual(before);
      if (r(2) === 0) {
        state = undone;
        moves.push({ type: 'undo', player });
      }
    }
  }
  return { state, moves };
}

const setupArb: fc.Arbitrary<GameSetup> = fc
  .record({
    players: fc.integer({ min: 1, max: 4 }),
    cardsPerPlayer: fc.integer({ min: 1, max: 5 }),
    playStyle: fc.constantFrom('turns' as const, 'together' as const),
    multipliers: fc.boolean(),
  })
  .chain((s) =>
    fc
      .shuffledSubarray(
        Array.from({ length: s.players }, (_, i) => i),
        { minLength: s.players, maxLength: s.players },
      )
      .map((turnOrder) => ({ ...s, turnOrder })),
  );

describe('whole-game properties', () => {
  it('always finishes, replays identically and totals consistently', () => {
    fc.assert(
      fc.property(setupArb, fc.integer(), (setup, seed) => {
        const { state, moves } = simulate(setup, seed);

        expect(state.players.every((p) => p.cards.every(isCardFull))).toBe(true);
        expect(replay(setup, moves)).toEqual(state);

        state.players.forEach((p, i) => {
          const t = playerTotal(state, i);
          expect(t.total).toBe(t.cards.reduce((s, c) => s + c.total, 0));
          p.cards.forEach((c, ci) => {
            const ct = cardTotal(c, ci, setup.multipliers);
            expect(ct.raw).toBe(ct.upper + ct.upperBonus + ct.lower + ct.yatzyBonus);
            expect(ct.total).toBe(ct.raw * (setup.multipliers ? ci + 1 : 1));
            // Bonuses only exist on cards whose Yatzy box holds 50, and each
            // one was written into another box: at most 12 on a 13-box card.
            if (c.yatzyBonuses > 0) expect(c.boxes.yatzy).toBe(50);
            expect(c.yatzyBonuses).toBeLessThanOrEqual(Object.keys(c.boxes).length - 1);
          });
        });
      }),
      { numRuns: 150 },
    );
  });

  it('gives every player in Take turns the same number of turns, in order', () => {
    fc.assert(
      fc.property(
        setupArb.filter((s) => s.playStyle === 'turns'),
        fc.integer(),
        (setup, seed) => {
          const { moves } = simulate(setup, seed);
          // Net scores, after undos, in the order they stuck.
          const scorers: number[] = [];
          for (const m of moves) {
            if (m.type === 'score') scorers.push(m.player);
            if (m.type === 'undo') scorers.pop();
          }
          expect(scorers).toHaveLength(13 * setup.cardsPerPlayer * setup.players);
          scorers.forEach((p, i) => expect(p).toBe(setup.turnOrder[i % setup.players]));
        },
      ),
      { numRuns: 50 },
    );
  });
});

describe('payout properties', () => {
  const cardArb = fc.record({
    boxes: fc.record(
      { yatzy: fc.constantFrom(0, YATZY), chance: fc.integer({ min: 5, max: 30 }) },
      { requiredKeys: [] },
    ),
    yatzyBonuses: fc.integer({ min: 0, max: 3 }),
  });

  it('never pays a negative amount, and one game pays a bounded total', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 2, max: 8 }),
        fc.nat(2 ** 30),
        (cards, seats, seed) => {
          const rand = prng(seed);
          const players = Array.from({ length: seats }, () =>
            Array.from({ length: cards }, () => ({
              boxes: {
                chance: 5 + rand(26),
                ...(rand(10) < 3 ? { yatzy: YATZY } : {}),
              },
              yatzyBonuses: rand(10) === 0 ? 1 : 0,
            })),
          );
          const game = {
            ...createGame({
              players: seats,
              cardsPerPlayer: cards,
              playStyle: 'turns' as const,
              multipliers: false,
              turnOrder: Array.from({ length: seats }, (_, i) => i),
            }),
            finished: true,
          };
          const finished = {
            ...game,
            players: game.players.map((p, i) => ({ ...p, cards: players[i]! })),
          };
          const payouts = computePayouts(finished);
          const finish = Math.round((10 * cards) / 3);
          const yatzy = Math.round((3 * cards) / 3);
          let sum = 0;
          for (const p of payouts) {
            expect(p.breakdown.finish).toBe(finish);
            expect(p.breakdown.win).toBeGreaterThanOrEqual(0);
            expect(p.breakdown.yatzy).toBeGreaterThanOrEqual(0);
            expect(p.total).toBe(p.breakdown.finish + p.breakdown.win + p.breakdown.yatzy);
            sum += p.total;
          }
          expect(Number.isNaN(sum)).toBe(false);
          // Everyone finishes, the win bonus is shared out once, each seat may earn the Yatzy bonus.
          expect(sum).toBeLessThanOrEqual(seats * finish + finish + seats * yatzy);
        },
      ),
    );
  });

  it('pays whole coins in the same seat order as the players', () => {
    fc.assert(
      fc.property(fc.array(cardArb, { minLength: 1, maxLength: 3 }), (cs) => {
        const game = {
          ...createGame({
            players: 2,
            cardsPerPlayer: cs.length,
            playStyle: 'turns' as const,
            multipliers: false,
            turnOrder: [0, 1],
          }),
          finished: true,
        };
        const finished = {
          ...game,
          players: game.players.map((p) => ({ ...p, cards: cs })),
        };
        const payouts = computePayouts(finished);
        expect(payouts.map((p) => p.player)).toEqual([0, 1]);
        for (const p of payouts) expect(Number.isInteger(p.total)).toBe(true);
      }),
    );
  });
});
