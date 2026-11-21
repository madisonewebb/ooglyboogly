import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PetLayer } from './PetLayer';
import { PET_IDS, PET_POSES, POSES } from './mood';
import { PetSprite } from './PetSprite';

const svgs = (html: string) => html.match(/<svg/g)?.length ?? 0;

describe('PetSprite', () => {
  it('draws a placeholder for every pet in every pose it has', () => {
    for (const pet of PET_IDS) {
      for (const pose of PET_POSES[pet]) {
        const html = renderToString(<PetSprite pet={pet} pose={pose} art={{}} />);
        expect(svgs(html), `${pet} ${pose}`).toBe(1);
        expect(html).toContain('viewBox="0 0 120 120"');
      }
    }
  });

  it('draws each pose differently', () => {
    for (const pet of PET_IDS) {
      const drawn = PET_POSES[pet].map((pose) =>
        renderToString(<PetSprite pet={pet} pose={pose} art={{}} />),
      );
      expect(new Set(drawn).size, pet).toBe(drawn.length);
    }
  });

  it('shows happy for a cheer a pet has no art for', () => {
    expect(renderToString(<PetSprite pet="toad" pose="cheer" art={{}} />)).toBe(
      renderToString(<PetSprite pet="toad" pose="happy" art={{}} />),
    );
  });

  it('uses the real image when its file exists, per pose', () => {
    const art = { toad: { happy: '/art/toad-happy.webp' } };
    expect(renderToString(<PetSprite pet="toad" pose="happy" art={art} />)).toContain(
      'src="/art/toad-happy.webp"',
    );
    expect(svgs(renderToString(<PetSprite pet="toad" pose="sad" art={art} />))).toBe(1);
  });

  it('works with the real art lookup too (empty until art is saved)', () => {
    expect(renderToString(<PetSprite pet="bat" pose="idle" />)).toMatch(/<svg|<img/);
  });
});

describe('PetLayer', () => {
  it('renders nothing but an empty, hidden layer without a pet', () => {
    const html = renderToString(
      <PetLayer pet={undefined} owner={0} pose="idle" nonce={0} reduced={false} />,
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('data-pet');
    expect(svgs(html)).toBe(0);
  });

  it('renders the pet and its pose', () => {
    for (const pose of POSES) {
      const html = renderToString(
        <PetLayer pet="ghostCheerleader" owner={1} pose={pose} nonce={3} reduced />,
      );
      expect(html).toContain('data-pet="ghostCheerleader"');
      expect(html).toContain(`data-pose="${pose}"`);
      expect(svgs(html)).toBe(1);
    }
  });
});
