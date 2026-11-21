/**
 * One aquarium on a canvas. It runs its own simulation and draws it every
 * frame in world units (tank/world.ts), scaled to whatever size it is given.
 * Tapping the glass startles the fish; feeding, a Yatzy and your turn come in
 * through the handle. With reduced motion everything moves slowly and the
 * plants hold still.
 */
import { type Ref, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { usePrefs } from '../theme/prefs';
import { describe, FISH, type TankLayout } from './catalog';
import { DRAW } from './fish';
import {
  drawBackground,
  drawBubble,
  drawCaustics,
  drawEvening,
  drawGlass,
  drawHaze,
  drawItem,
  drawRays,
  drawSurface,
} from './scenery';
import { type Fish, TankSim } from './sim';
import { clamp, depthScale, H, W } from './world';

export interface TankHandle {
  feed(): void;
  celebrate(): void;
  welcome(): void;
}

interface Props {
  layout: TankLayout;
  /** Seeds where the fish start. */
  seed?: number;
  evening?: boolean;
  /** Whose tank, for screen readers: "Mom's tank". */
  label: string;
  className?: string;
  ref?: Ref<TankHandle> | undefined;
}

const FLAKE_COLORS = ['#D69A45', '#B8503A', '#E6C46A', '#8A6A3A'];

function drawFish(ctx: CanvasRenderingContext2D, f: Fish, sim: TankSim) {
  const L = FISH[f.id].length * depthScale(f.z);
  const dir = f.facing < 0 ? -1 : 1;
  // Edge-on mid-turn, but never thinner than a sliver.
  const sx = dir * Math.max(0.16, Math.abs(f.facing));
  const rooting = f.mode === 'root' ? 0.28 : 0;
  const pitch =
    f.id === 'cherryShrimp' ? 0 : clamp(Math.atan2(f.vy, Math.abs(f.vx) + 10), -0.5, 0.5);
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate((pitch + rooting) * dir);
  ctx.scale(sx, 1);
  DRAW[f.id](ctx, { L, tail: f.tail, flare: f.flare, night: sim.night, t: sim.t, phase: f.phase });
  ctx.restore();
}

function render(
  ctx: CanvasRenderingContext2D,
  sim: TankSim,
  layout: TankLayout,
  background: HTMLCanvasElement,
  px: number,
  py: number,
  still: boolean,
) {
  const t = sim.t;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(background, 0, 0);
  ctx.setTransform(px, 0, 0, py, 0, 0);
  drawRays(ctx, t);
  drawCaustics(ctx, t);

  // Everything with a depth, drawn back to front in three bands, with water haze between them.
  type Thing = { z: number; draw: () => void };
  const things: Thing[] = [
    ...layout.items.map((item) => ({
      z: item.z,
      draw: () => drawItem(ctx, item, t, still, px),
    })),
    ...sim.fish.map((f) => ({ z: f.z, draw: () => drawFish(ctx, f, sim) })),
    ...sim.bubbles.map((b) => ({
      z: b.z,
      draw: () => drawBubble(ctx, b.x, b.y, b.r * depthScale(b.z)),
    })),
    ...sim.flakes.map((k, i) => ({
      z: k.z,
      draw: () => {
        const s = depthScale(k.z);
        ctx.save();
        ctx.translate(k.x, k.y);
        ctx.rotate(k.age * 1.7 + i);
        ctx.fillStyle = FLAKE_COLORS[i % FLAKE_COLORS.length]!;
        ctx.fillRect(-2.2 * s, -1.4 * s, 4.4 * s, 2.8 * s);
        ctx.restore();
      },
    })),
  ].sort((a, b) => a.z - b.z);
  const bands: [number, number, number][] = [
    [0, 0.4, 0.2],
    [0.4, 0.75, 0.08],
    [0.75, 2, 0],
  ];
  for (const [lo, hi, haze] of bands) {
    for (const thing of things) if (thing.z >= lo && thing.z < hi) thing.draw();
    if (haze > 0) drawHaze(ctx, hi, haze);
  }

  drawSurface(ctx, t);
  // A knock on the glass leaves a fading ring.
  for (const tap of sim.taps) {
    ctx.strokeStyle = `rgb(255 255 255 / ${0.55 * (1 - tap.age / 0.8)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tap.x, tap.y, 6 + tap.age * 70, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawEvening(ctx, sim.night);
  drawGlass(ctx);
}

export function Tank({ layout, seed = 1, evening = false, label, className, ref }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { reducedMotion } = usePrefs();
  const sim = useMemo(() => new TankSim(layout, seed), [layout, seed]);

  useImperativeHandle(
    ref,
    () => ({
      feed: () => sim.feed(),
      celebrate: () => sim.celebrate(),
      welcome: () => sim.welcome(),
    }),
    [sim],
  );

  useEffect(() => {
    sim.nightGoal = evening ? 1 : 0;
  }, [sim, evening]);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    let px = 1;
    let py = 1;
    const background = document.createElement('canvas');

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.max(1, Math.round(c.clientWidth * dpr));
      c.height = Math.max(1, Math.round(c.clientHeight * dpr));
      px = c.width / W;
      py = c.height / H;
      background.width = c.width;
      background.height = c.height;
      const b = background.getContext('2d')!;
      b.setTransform(px, 0, 0, py, 0, 0);
      drawBackground(b);
    };
    const sized = new ResizeObserver(resize);
    sized.observe(c);
    resize();
    // Off screen, it stops drawing; the fish wait where they were.
    const seen = new IntersectionObserver(([e]) => {
      visible = e?.isIntersecting ?? true;
    });
    seen.observe(c);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000) * (reducedMotion ? 0.3 : 1);
      last = now;
      if (visible) {
        sim.step(dt);
        render(ctx, sim, layout, background, px, py, reducedMotion);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      sized.disconnect();
      seen.disconnect();
    };
  }, [sim, layout, reducedMotion]);

  return (
    <canvas
      ref={canvas}
      className={`tank${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={`${label}: ${describe(layout)}`}
      onPointerDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        sim.tap(
          ((e.clientX - rect.left) / rect.width) * W,
          ((e.clientY - rect.top) / rect.height) * H,
        );
      }}
    />
  );
}
