import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GhostParade } from './GhostParade';

const noop = () => undefined;

describe('GhostParade', () => {
  it('marches seven vector ghosts when there is no real art, and says whose it is', () => {
    const html = renderToString(
      <GhostParade id={1} name="Mom" reduced={false} onDone={noop} art={undefined} />,
    );
    expect(html.match(/class="parade-ghost"/g)).toHaveLength(7);
    expect(html).toContain('Yatzy! Mom&#x27;s ghost parade marches by.');
    expect(html).toContain('role="status"');
    expect(html).not.toContain('parade still');
  });

  it('hides the ghosts from screen readers and takes no clicks (decoration only)', () => {
    const html = renderToString(
      <GhostParade id={1} name="Mom" reduced={false} onDone={noop} art={undefined} />,
    );
    expect(html).toMatch(/class="parade-line" aria-hidden="true"/);
  });

  it('stands still with reduced motion', () => {
    const html = renderToString(
      <GhostParade id={2} name="Mom" reduced onDone={noop} art={undefined} />,
    );
    expect(html).toContain('class="parade still"');
  });

  it('slides one strip when real art exists', () => {
    const html = renderToString(
      <GhostParade id={3} name="Mom" reduced={false} onDone={noop} art="/art/parade.webp" />,
    );
    expect(html).toContain('src="/art/parade.webp"');
    expect(html).not.toContain('parade-ghost');
  });
});
