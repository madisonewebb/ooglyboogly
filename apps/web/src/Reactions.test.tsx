import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PACK_STICKER_IDS, STICKER_IDS, type WalletMessage } from '@rollhouse/shared';
import { ReactionPicker, STICKERS, stickersFor } from './Reactions';
import { WalletContext } from './shop/WalletContext';

const noop = () => {};
const wallet = (over: Partial<WalletMessage> = {}): WalletMessage => ({
  balance: 55,
  owned: [],
  equipped: {},
  goal: null,
  canBuy: true,
  ...over,
});

describe('the reaction picker', () => {
  it('offers the free stickers to everyone, and each pack once it is owned', () => {
    expect(stickersFor(undefined)).toEqual([...STICKER_IDS]);
    expect(stickersFor([])).toEqual([...STICKER_IDS]);
    expect(stickersFor(['cauldronCrew'])).toEqual([...STICKER_IDS, 'cackle', 'mischief', 'ribbit']);
    expect(stickersFor(['moonlitCharms', 'bone'])).toEqual([
      ...STICKER_IDS,
      'foresaw',
      'moonMood',
      'broom',
    ]);
    expect(stickersFor(['cauldronCrew', 'moonlitCharms'])).toHaveLength(STICKER_IDS.length + 6);
  });

  it('renders the hotbar, with the editor closed', () => {
    const html = renderToString(
      <WalletContext.Provider value={wallet({ owned: ['cauldronCrew'] })}>
        <ReactionPicker send={noop} />
      </WalletContext.Provider>,
    );
    expect(html).toContain('hotbar-slot');
    expect(html).toContain('Cheering (1)');
    expect(html).not.toContain('hotbar-editor');
  });

  it('has art and a label for every sticker, free or from a pack', () => {
    // A sticker without art would float as a broken image on everyone's screen.
    for (const id of [...STICKER_IDS, ...PACK_STICKER_IDS]) {
      expect(STICKERS[id].art, id).toMatch(/\S/);
      expect(STICKERS[id].label, id).toMatch(/\S/);
    }
    expect(Object.keys(STICKERS)).toHaveLength(STICKER_IDS.length + PACK_STICKER_IDS.length);
  });
});
