import { lazy, Suspense } from 'react';
import { BRAND_NAME } from '@rollhouse/shared';
import wordmark from './art/wordmark.webp';
import { FlatFace } from './dice/DiceTray';
import { CauldronCoinIcon } from './icons';
import { hasWebGL } from './dice/webgl';
import { useWallet } from './shop/WalletContext';
import { usePrefs } from './theme/prefs';
import './navCoins.css';

const LobbyDie = lazy(() => import('./dice/LobbyDie'));

/** The player's coins at the right of the band, wherever they can spend them. */
export function NavCoins() {
  const wallet = useWallet();
  if (!wallet?.canBuy) return null;
  return (
    <span className="nav-coins" data-testid="nav-balance">
      <CauldronCoinIcon />
      <span className="amount">{wallet.balance}</span>
      <span className="sr-only">{wallet.balance === 1 ? ' coin' : ' coins'}</span>
    </span>
  );
}

/** The plum band with the wordmark and the coin balance, across the top of every screen. */
export function BrandBar() {
  return (
    <header className="topbar">
      <h1 className="sr-only">{BRAND_NAME}</h1>
      <img className="band-wordmark" src={wordmark} alt="" width={396} height={128} />
      <NavCoins />
    </header>
  );
}

/** The name, letter by letter, each bobbing a beat after the last. */
function BouncyName() {
  const [first = '', second = ''] = BRAND_NAME.split(' ');
  const letters = (word: string, offset: number, cls: string) =>
    [...word].map((ch, i) => (
      <span
        key={i}
        className={`bounce ${cls}`}
        style={{ animationDelay: `${(offset + i) * 0.12}s` }}
      >
        {ch}
      </span>
    ));
  return (
    <p className="brand-title" aria-hidden="true">
      <span className="word">{letters(first, 0, 'first')}</span>{' '}
      <span className="word">{letters(second, first.length, 'second')}</span>
    </p>
  );
}

/** A die turning beside the bouncing name, under the band. Flat only where there is no WebGL at all. */
export function Welcome({ tagline = true }: { tagline?: boolean }) {
  const { prefs, theme, reducedMotion } = usePrefs();
  return (
    <div className="brand">
      <span className="brand-die" aria-hidden="true">
        {hasWebGL() ? (
          <Suspense fallback={null}>
            <LobbyDie theme={theme} scheme={prefs.scheme} still={reducedMotion} />
          </Suspense>
        ) : (
          <span className="brand-flat">
            <FlatFace value={5} />
          </span>
        )}
      </span>
      <div className="brand-text">
        <BouncyName />
        {tagline && <p className="tagline">Five dice, one table.</p>}
      </div>
    </div>
  );
}
