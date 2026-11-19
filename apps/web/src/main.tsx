import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BRAND_NAME } from '@rollhouse/shared';
import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-600.css';
import '@fontsource/atkinson-hyperlegible-next/latin-800.css';
import '@fontsource/gluten/latin-700.css';
import { App } from './App';
import { installThemeCss, PrefsProvider } from './theme/prefs';
import './styles.css';

document.title = BRAND_NAME;
installThemeCss();

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');
createRoot(root).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <PrefsProvider>
        <App />
      </PrefsProvider>
    </MotionConfig>
  </StrictMode>,
);
