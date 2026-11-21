import { BRAND_NAME } from '@rollhouse/shared';
import wordmark from './art/wordmark.webp';
import ghost from './art/stickers/cheering_ghost.webp';

/** The plum band with the wordmark, across the top of every screen. */
export function BrandBar() {
  return (
    <header className="topbar">
      <h1 className="sr-only">{BRAND_NAME}</h1>
      <img className="band-wordmark" src={wordmark} alt="" width={396} height={128} />
    </header>
  );
}

/** A small cheering ghost beside the tagline, under the band. */
export function Welcome({ tagline = true }: { tagline?: boolean }) {
  if (!tagline) return null;
  return (
    <div className="brand">
      <img className="brand-ghost" src={ghost} alt="" width={256} height={256} />
      <p className="tagline">Five dice, one table.</p>
    </div>
  );
}
