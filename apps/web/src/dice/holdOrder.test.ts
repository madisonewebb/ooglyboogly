import { describe, expect, it } from 'vitest';
import { holdOrder, shelfSeats } from './holdOrder';

const held = (...dice: number[]) => [0, 1, 2, 3, 4].map((i) => dice.includes(i));

describe('holdOrder', () => {
  it('is empty with nothing held', () => {
    expect(holdOrder([], held())).toEqual([]);
  });

  it('follows the order dice were held in, not their index', () => {
    let order = holdOrder([], held(3));
    order = holdOrder(order, held(3, 0));
    order = holdOrder(order, held(3, 0, 4));
    expect(order).toEqual([3, 0, 4]);
  });

  it('closes the gap when a die is released, and puts it last when re-held', () => {
    expect(holdOrder([3, 0, 4], held(3, 4))).toEqual([3, 4]);
    expect(holdOrder([3, 4], held(3, 4, 0))).toEqual([3, 4, 0]);
  });

  it('seats dice that appear together by index', () => {
    expect(holdOrder([], held(4, 1, 2))).toEqual([1, 2, 4]);
    expect(holdOrder([4], held(4, 0, 2))).toEqual([4, 0, 2]);
  });

  it('forgets everything once all dice are released', () => {
    expect(holdOrder([2, 1], held())).toEqual([]);
  });

  it('ignores stale or duplicate entries', () => {
    expect(holdOrder([2, 2, 9], held(2))).toEqual([2]);
  });
});

describe('shelfSeats', () => {
  it('seats held dice in order and leaves the rest on their own index', () => {
    expect(shelfSeats([3, 0, 4], 5)).toEqual([1, 1, 2, 0, 2]);
  });

  it('is the identity when nothing is held', () => {
    expect(shelfSeats([], 5)).toEqual([0, 1, 2, 3, 4]);
  });
});
