import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { YatzyCelebration } from './YatzyCelebration';
import { CONFETTI_COUNT, RING_COUNT } from './plan';

const noop = () => undefined;
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

describe('YatzyCelebration', () => {
  it('names the roller in a polite status and hides the confetti from screen readers', () => {
    const html = renderToString(
      <YatzyCelebration id={1} names={['Madi']} reduced={false} onDone={noop} />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Madi rolled a Yatzy!');
    expect(html).toContain('YATZY!');
    expect(html).toMatch(/class="yatzy-confetti" aria-hidden="true"/);
    expect(count(html, /class="yatzy-piece /g)).toBe(CONFETTI_COUNT);
    expect(html).not.toContain('yatzy-ring');
    expect(html).not.toContain('class="yatzy still"');
  });

  it('is click-through by being a plain div with no controls', () => {
    const html = renderToString(
      <YatzyCelebration id={1} names={['Madi']} reduced={false} onDone={noop} />,
    );
    expect(html).not.toMatch(/<(button|a|input)\b/);
  });

  it('with reduced motion shows a still ring of stars and no confetti', () => {
    const html = renderToString(
      <YatzyCelebration id={1} names={['Sam']} reduced={true} onDone={noop} />,
    );
    expect(html).toContain('class="yatzy still"');
    expect(html).toContain('Sam rolled a Yatzy!');
    expect(count(html, /class="yatzy-star"/g)).toBe(RING_COUNT);
    expect(html).not.toContain('yatzy-piece');
  });

  it('names everyone when several roll one at once', () => {
    const html = renderToString(
      <YatzyCelebration id={1} names={['Madi', 'Sam']} reduced={false} onDone={noop} />,
    );
    expect(html).toContain('Madi and Sam rolled Yatzys!');
  });
});
