import { lazy, Suspense } from 'react';
import { BRAND_NAME } from '@rollhouse/shared';
import wordmark from './art/wordmark.webp';
import { FlatFace } from './dice/DiceTray';
import { hasWebGL, renderQuality } from './dice/webgl';
import { usePrefs } from './theme/prefs';

const LobbyDie = lazy(() => import('./dice/LobbyDie'));

/** The plum band with the wordmark, across the top of every screen. */
export function BrandBar() {
  return (
    <header className="topbar">
      <h1 className="sr-only">{BRAND_NAME}</h1>
      <img className="band-wordmark" src={wordmark} alt="" width={396} height={128} />
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
      <span className="word">{letters(first, 0, 'pink')}</span>{' '}
      <span className="word">{letters(second, first.length, 'violet')}</span>
    </p>
  );
}

/** A die turning beside the bouncing name, under the band. */
export function Welcome({ tagline = true }: { tagline?: boolean }) {
  const { theme, reducedMotion } = usePrefs();
  return (
    <div className="brand">
      <span className="brand-die" aria-hidden="true">
        {hasWebGL() && renderQuality() === 'high' ? (
          <Suspense fallback={null}>
            <LobbyDie theme={theme} still={reducedMotion} />
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
