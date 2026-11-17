import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BRAND_NAME } from '@rollhouse/shared';
import { App } from './App';
import './styles.css';

document.title = BRAND_NAME;

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
