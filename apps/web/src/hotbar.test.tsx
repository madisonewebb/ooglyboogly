import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { STICKER_IDS } from '@rollhouse/shared';
import { PrefsProvider } from './theme/prefs';
import { ReactionPicker } from './Reactions';
import {
  DEFAULT_SLOTS,
  isTypingTarget,
  MAX_SLOTS,
  moveSlot,
  normalizeSlots,
  toggleSlot,
} from './hotbar';

describe('hotbar slots', () => {
  it('falls back to the default stickers', () => {
    expect(normalizeSlots(null)).toEqual([...DEFAULT_SLOTS]);
    expect(normalizeSlots([])).toEqual([...DEFAULT_SLOTS]);
    expect(normalizeSlots(['nope', 7])).toEqual([...DEFAULT_SLOTS]);
  });
  it('keeps valid, unique favorites in order', () => {
    expect(normalizeSlots(['heart', 'x', 'cheering', 'heart'])).toEqual(['heart', 'cheering']);
    expect(normalizeSlots([...STICKER_IDS, ...STICKER_IDS]).length).toBeLessThanOrEqual(MAX_SLOTS);
  });
  it('toggles but never empties the bar', () => {
    expect(toggleSlot(['heart', 'cheering'], 'heart')).toEqual(['cheering']);
    expect(toggleSlot(['heart'], 'heart')).toEqual(['heart']);
    expect(toggleSlot(['heart'], 'sleeping')).toEqual(['heart', 'sleeping']);
  });
  it('reorders within bounds', () => {
    expect(moveSlot(['heart', 'cheering', 'sleeping'], 0, 1)).toEqual([
      'cheering',
      'heart',
      'sleeping',
    ]);
    expect(moveSlot(['heart', 'cheering'], 0, -1)).toEqual(['heart', 'cheering']);
  });
  it('ignores key presses meant for typing', () => {
    expect(isTypingTarget({ tagName: 'INPUT', isContentEditable: false } as never)).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: false } as never)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe('ReactionPicker', () => {
  it('shows every default sticker at once, numbered', () => {
    const html = renderToString(
      <PrefsProvider>
        <ReactionPicker send={() => {}} />
      </PrefsProvider>,
    );
    expect(html.match(/class="hotbar-slot"/g)).toHaveLength(DEFAULT_SLOTS.length);
    expect(html).toContain('Cheering (1)');
    expect(html).not.toContain('sticker-tray');
  });
});
