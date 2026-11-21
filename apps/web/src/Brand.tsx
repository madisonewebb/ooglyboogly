import { BRAND_NAME } from '@rollhouse/shared';
import banner from './art/banner.webp';

/**
 * The banner: the ghost peeking over the clouds beside the name. The name is
 * in the art, so the heading is there for screen readers only.
 */
export function Brand({ tagline = true }: { tagline?: boolean }) {
  return (
    <div className="brand">
      <img className="brand-banner" src={banner} alt="" width={1376} height={768} />
      <h1 className="sr-only">{BRAND_NAME}</h1>
      {tagline && <p className="tagline">Five dice, one table.</p>}
    </div>
  );
}
