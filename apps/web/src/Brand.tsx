import { lazy, Suspense } from 'react';
import { BRAND_NAME } from '@rollhouse/shared';
import { FlatFace } from './dice/DiceTray';
import { Frond } from './Frond';
import { hasWebGL, renderQuality } from './dice/webgl';
import { usePrefs } from './theme/prefs';

const LobbyDie = lazy(() => import('./dice/LobbyDie'));

/** The wordmark on a sunprint plate, with a porcelain die turning beside it. */
export function Brand({ tagline = true }: { tagline?: boolean }) {
  const { theme, reducedMotion } = usePrefs();
  return (
    <div className="brand print">
      <Frond seed={11} lean={-0.2} className="brand-frond left" />
      <Frond seed={3} lean={0.15} className="brand-frond right" />
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
      <h1 className="wordmark">{BRAND_NAME}</h1>
      {tagline && <p className="tagline">Five dice, one table.</p>}
    </div>
  );
}
