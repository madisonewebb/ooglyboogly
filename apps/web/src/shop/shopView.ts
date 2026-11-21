import {
  type Equipped,
  type Rarity,
  SHOP_ENTRIES,
  type ShopEntry,
  shopEntry,
  type Slot,
  type WalletMessage,
} from '@rollhouse/shared';

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  spooky: 'Spooky',
  legendary: 'Legendary',
};

/** One clear state for a shop card. */
export type CardState =
  /** Not drawable yet: listed, not for sale. */
  | { kind: 'soon' }
  | { kind: 'owned'; worn: boolean }
  | { kind: 'afford' }
  | { kind: 'short'; missing: number }
  /** For sale, but this player cannot spend here (a guest outside dev). */
  | { kind: 'closed' };

export function cardState(entry: ShopEntry, wallet: WalletMessage | null): CardState {
  if (wallet?.owned.includes(entry.id)) {
    return { kind: 'owned', worn: entry.slot !== null && wallet.equipped[entry.slot] === entry.id };
  }
  if (!entry.available) return { kind: 'soon' };
  if (!wallet?.canBuy) return { kind: 'closed' };
  return wallet.balance >= entry.price
    ? { kind: 'afford' }
    : { kind: 'short', missing: entry.price - wallet.balance };
}

export const coinWord = (n: number): string => `${n} ${n === 1 ? 'coin' : 'coins'}`;

/** The words on the card for its state. State is never shown by color alone. */
export function stateLabel(state: CardState): string {
  switch (state.kind) {
    case 'soon':
      return 'Coming soon';
    case 'owned':
      return state.worn ? 'Owned, wearing it' : 'Owned';
    case 'afford':
      return 'You can afford this';
    case 'short':
      return `${coinWord(state.missing)} short`;
    case 'closed':
      return 'Not for sale to guests';
  }
}

export interface Section {
  key: string;
  title: string;
  blurb: string;
  entries: ShopEntry[];
}

const SLOT_SECTIONS: { slot: Slot; title: string; blurb: string }[] = [
  { slot: 'diceSkin', title: 'Dice skins', blurb: 'A new look for all five dice.' },
  { slot: 'brew', title: 'Brews', blurb: 'What bubbles in the cauldron.' },
  { slot: 'pet', title: 'Pets', blurb: 'A friend on the rim of the cauldron.' },
  { slot: 'celebration', title: 'Celebrations', blurb: 'How your big moments are marked.' },
];

/** What the shop shows, in order: the things for sale today first, then what is coming. */
export function shopSections(): Section[] {
  return [
    {
      key: 'stickers',
      title: 'Sticker packs',
      blurb: 'Extra stickers for the reaction tray, yours for good.',
      entries: SHOP_ENTRIES.filter((e) => e.slot === null),
    },
    ...SLOT_SECTIONS.map(({ slot, title, blurb }) => ({
      key: slot,
      title,
      blurb,
      entries: SHOP_ENTRIES.filter((e) => e.slot === slot),
    })),
  ];
}

export interface GoalProgress {
  entry: ShopEntry;
  balance: number;
  /** 0 to 100, whole numbers. */
  percent: number;
  ready: boolean;
}

/** Coins toward the pinned item, or null when nothing is pinned (or it left the shop). */
export function goalProgress(wallet: WalletMessage | null): GoalProgress | null {
  const entry = wallet?.goal ? shopEntry(wallet.goal) : undefined;
  if (!wallet || !entry || wallet.owned.includes(entry.id)) return null;
  const ratio = Math.min(1, wallet.balance / entry.price);
  return {
    entry,
    balance: wallet.balance,
    percent: Math.floor(ratio * 100),
    ready: wallet.balance >= entry.price,
  };
}

/** "Bone, Toad": what a player has on, for the seat list. Null when nothing. */
export function lookLine(equipped: Equipped | undefined): string | null {
  const names = Object.values(equipped ?? {})
    .map((id) => shopEntry(id)?.name)
    .filter((n): n is string => n !== undefined);
  return names.length > 0 ? names.join(', ') : null;
}
