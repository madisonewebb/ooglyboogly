const SHEET = '#F6F3FB';

const channels = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** `a` mixed toward `b` by `t` (0 to 1), as a hex color. */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  const c = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

/** The blob body color from a seat tint: the tint, washed toward bedsheet white. */
export const bodyColorOf = (tintHex: string): string => mixHex(tintHex, SHEET, 0.55);
