import { MotionConfig } from 'motion/react';
import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BRAND_NAME } from '@rollhouse/shared';
import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-600.css';
import '@fontsource/atkinson-hyperlegible-next/latin-800.css';
import '@fontsource/quicksand/latin-700.css';
import { App } from './App';
import { installThemeCss, PrefsProvider } from './theme/prefs';
import './styles.css';

document.title = BRAND_NAME;

// The dice bench (`?lab`): on the dev server, or in a build made with VITE_LAB=1.
// Production builds leave it out.
const Lab =
  import.meta.env.DEV || import.meta.env.VITE_LAB === '1'
    ? lazy(() => import('./Lab').then((m) => ({ default: m.Lab })))
    : null;
installThemeCss();

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');
createRoot(root).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <PrefsProvider>
        {Lab && location.search.includes('lab') ? (
          <Suspense fallback={null}>
            <Lab />
          </Suspense>
        ) : (
          <App />
        )}
      </PrefsProvider>
    </MotionConfig>
  </StrictMode>,
);
