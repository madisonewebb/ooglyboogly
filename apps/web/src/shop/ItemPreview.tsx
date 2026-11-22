import type { ReactNode } from 'react';
import { STICKER_PACKS, type ShopEntry, type Slot } from '@rollhouse/shared';
import { STICKERS } from '../Reactions';

/**
 * What a shop card shows of its item. Sticker packs show their real stickers.
 * The cosmetics are drawn by specs 03 and 04; until they are, each slot gets a
 * quiet line glyph in a plum frame, with no pretence that it is the item.
 */
const GLYPHS: Record<Slot, ReactNode> = {
  diceSkin: (
    <>
      <rect x="12" y="12" width="40" height="40" rx="9" />
      <circle cx="24" cy="24" r="2.6" fill="currentColor" />
      <circle cx="32" cy="32" r="2.6" fill="currentColor" />
      <circle cx="40" cy="40" r="2.6" fill="currentColor" />
    </>
  ),
  brew: (
    <>
      <path d="M13 28h38v5a19 19 0 0 1-38 0z" />
      <path d="M10 28h44M20 52l-3 6M44 52l3 6" />
      <path d="M26 21c-3-4 3-6 0-11M38 21c-3-4 3-6 0-11" />
    </>
  ),
  celebration: (
    <>
      <path d="M32 8l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" />
      <path d="M50 44l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
    </>
  ),
};

export function ItemPreview({ entry }: { entry: ShopEntry }) {
  if (entry.slot === null) {
    const pack = STICKER_PACKS.find((p) => p.id === entry.id);
    return (
      <div className="preview preview-pack" aria-hidden="true">
        {pack?.stickers.map((id) => (
          <img key={id} src={STICKERS[id].art} alt="" width={64} height={64} />
        ))}
      </div>
    );
  }
  return (
    <div className="preview preview-glyph" data-slot={entry.slot} aria-hidden="true">
      <svg
        viewBox="0 0 64 64"
        width="64"
        height="64"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {GLYPHS[entry.slot]}
      </svg>
    </div>
  );
}
