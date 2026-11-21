/**
 * Drawing the fish, side on. Each species is drawn facing right, nose at
 * +L/2, centred on its body; the caller turns and flips it. A fish's tail
 * sweeps toward and away from you as it swims, so from the side the tail fin
 * foreshortens rather than bending up and down: that is what `tail` drives.
 */
import type { FishId } from './catalog';

type Ctx = CanvasRenderingContext2D;

export interface FishLook {
  /** Body length, world units. */
  L: number;
  /** Tail beat phase, radians. */
  tail: number;
  /** 0 calm to 1 flaring (bettas). */
  flare: number;
  /** 0 day to 1 night: neon tetras fade their colors in the dark. */
  night: number;
  t: number;
  /** Per-fish offset, so a school doesn't shimmer in step. */
  phase: number;
}

/** A body outline from nose to the narrow tail stem, as fractions of L. */
function body(ctx: Ctx, L: number, top: number, belly: number, stem: number, stemH: number) {
  const n = L * 0.5;
  const p = L * stem;
  ctx.beginPath();
  ctx.moveTo(n, 0);
  ctx.bezierCurveTo(n * 0.82, -top * L * 0.95, L * 0.02, -top * L * 1.08, p, -stemH * L);
  ctx.lineTo(p, stemH * L);
  ctx.bezierCurveTo(L * 0.04, belly * L * 1.08, n * 0.78, belly * L * 0.9, n, 0);
  ctx.closePath();
}

/** The tail fin, swinging: its width shrinks as it turns edge-on. */
function tailFin(
  ctx: Ctx,
  L: number,
  look: FishLook,
  stem: number,
  len: number,
  spread: number,
  fork: number,
  fill: string | CanvasGradient,
) {
  const p = L * stem;
  const k = 0.5 + 0.5 * Math.abs(Math.cos(look.tail));
  ctx.save();
  ctx.translate(p, 0);
  ctx.rotate(Math.sin(look.tail) * 0.18);
  ctx.scale(k, 1);
  const l = L * len;
  const s = L * spread;
  ctx.beginPath();
  ctx.moveTo(0, -L * 0.03);
  ctx.quadraticCurveTo(-l * 0.5, -s * 0.5, -l, -s);
  ctx.quadraticCurveTo(-l * (1 - fork), 0, -l, s);
  ctx.quadraticCurveTo(-l * 0.5, s * 0.5, 0, L * 0.03);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function eye(ctx: Ctx, x: number, y: number, r: number, ring = '#E8ECEA') {
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#101418';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgb(255 255 255 / 0.85)';
  ctx.beginPath();
  ctx.arc(x + r * 0.3, y - r * 0.35, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------- Neon tetra ---------- */

function neonTetra(ctx: Ctx, look: FishLook) {
  const { L } = look;
  const glow = 1 - look.night * 0.65;
  tailFin(ctx, L, look, -0.33, 0.2, 0.14, 0.55, 'rgb(225 235 230 / 0.35)');
  // Dorsal and anal fins: small and clear.
  ctx.fillStyle = 'rgb(225 235 230 / 0.4)';
  ctx.beginPath();
  ctx.moveTo(L * 0.02, -L * 0.12);
  ctx.lineTo(-L * 0.05, -L * 0.24);
  ctx.lineTo(-L * 0.12, -L * 0.1);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-L * 0.05, L * 0.1);
  ctx.lineTo(-L * 0.2, L * 0.17);
  ctx.lineTo(-L * 0.26, L * 0.06);
  ctx.fill();

  body(ctx, L, 0.13, 0.12, -0.33, 0.045);
  const g = ctx.createLinearGradient(0, -L * 0.14, 0, L * 0.13);
  g.addColorStop(0, '#7E8A6C');
  g.addColorStop(0.45, '#C9CEC0');
  g.addColorStop(1, '#EEEAE0');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // The red lower flank, from mid-body to the tail.
  const red = ctx.createLinearGradient(L * 0.12, 0, -L * 0.1, 0);
  red.addColorStop(0, 'rgb(226 52 62 / 0)');
  red.addColorStop(1, `rgb(226 52 62 / ${0.95 * glow + 0.05})`);
  ctx.fillStyle = red;
  ctx.fillRect(-L * 0.4, -L * 0.005, L * 0.6, L * 0.2);
  // The electric stripe: it shifts hue as the light catches it.
  const hue = 188 + 14 * Math.sin(look.t * 2.2 + look.phase);
  ctx.fillStyle = `hsl(${hue} ${95 * glow}% ${48 + 14 * glow}%)`;
  ctx.shadowColor = `hsl(${hue} 100% 60% / ${0.8 * glow})`;
  ctx.shadowBlur = L * 0.12;
  ctx.beginPath();
  ctx.moveTo(L * 0.34, -L * 0.035);
  ctx.quadraticCurveTo(0, -L * 0.07, -L * 0.33, -L * 0.03);
  ctx.lineTo(-L * 0.33, L * 0.0);
  ctx.quadraticCurveTo(0, -L * 0.01, L * 0.34, L * 0.005);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  eye(ctx, L * 0.34, -L * 0.02, L * 0.045);
}

/* ---------- Panda corydoras ---------- */

function pandaCory(ctx: Ctx, look: FishLook) {
  const { L } = look;
  tailFin(ctx, L, look, -0.32, 0.22, 0.17, 0.4, 'rgb(235 230 220 / 0.55)');
  // The black-tipped dorsal fin stands tall.
  ctx.fillStyle = '#1F1F24';
  ctx.beginPath();
  ctx.moveTo(L * 0.12, -L * 0.18);
  ctx.quadraticCurveTo(L * 0.06, -L * 0.42, L * 0.0, -L * 0.36);
  ctx.lineTo(-L * 0.08, -L * 0.17);
  ctx.closePath();
  ctx.fill();
  // Pectoral fin, fanned under the chest.
  ctx.fillStyle = 'rgb(240 232 222 / 0.7)';
  ctx.beginPath();
  ctx.moveTo(L * 0.22, L * 0.1);
  ctx.lineTo(L * 0.05, L * 0.22 + Math.sin(look.tail * 1.5) * L * 0.02);
  ctx.lineTo(L * 0.14, L * 0.1);
  ctx.fill();

  // Arched back, flat belly: a fish made for the bottom.
  const n = L * 0.5;
  ctx.beginPath();
  ctx.moveTo(n, L * 0.06);
  ctx.bezierCurveTo(n * 0.9, -L * 0.2, L * 0.05, -L * 0.24, -L * 0.32, -L * 0.06);
  ctx.lineTo(-L * 0.32, L * 0.05);
  ctx.bezierCurveTo(L * 0.0, L * 0.14, n * 0.8, L * 0.15, n, L * 0.06);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -L * 0.22, 0, L * 0.14);
  g.addColorStop(0, '#E6DCD2');
  g.addColorStop(0.6, '#F6EFE8');
  g.addColorStop(1, '#F2D9D2');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // The panda marks: a mask over the eye and a spot at the tail.
  ctx.fillStyle = '#1C1C22';
  ctx.beginPath();
  ctx.ellipse(L * 0.3, -L * 0.04, L * 0.08, L * 0.15, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-L * 0.28, -L * 0.0, L * 0.07, L * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  // Armour plates down the flank.
  ctx.strokeStyle = 'rgb(150 130 120 / 0.35)';
  ctx.lineWidth = L * 0.012;
  for (let i = 0; i < 6; i++) {
    const x = L * (0.18 - i * 0.075);
    ctx.beginPath();
    ctx.arc(x + L * 0.06, 0, L * 0.06, Math.PI * 0.6, Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.restore();
  eye(ctx, L * 0.32, -L * 0.04, L * 0.035, '#3A3A40');
  // Whiskers.
  ctx.strokeStyle = 'rgb(230 220 210 / 0.8)';
  ctx.lineWidth = L * 0.012;
  for (const d of [0.02, 0.06]) {
    ctx.beginPath();
    ctx.moveTo(n * 0.96, L * 0.08);
    ctx.lineTo(n + L * 0.04, L * (0.13 + d));
    ctx.stroke();
  }
}

/* ---------- Betta ---------- */

function betta(ctx: Ctx, look: FishLook) {
  const { L, t } = look;
  const flare = 1 + look.flare * 0.18;
  const wave = (u: number) => Math.sin(t * 2.1 - u * 3 + look.phase) * L * 0.05 * u;
  const finFill = (x0: number, y0: number, r: number) => {
    const g = ctx.createRadialGradient(x0, y0, r * 0.15, x0, y0, r);
    g.addColorStop(0, 'rgb(78 86 196 / 0.9)');
    g.addColorStop(0.6, 'rgb(110 92 205 / 0.82)');
    g.addColorStop(0.85, 'rgb(226 110 150 / 0.75)');
    g.addColorStop(1, 'rgb(240 160 185 / 0.45)');
    return g;
  };
  const stem = -L * 0.3;
  // The veil tail: long, flowing, drooping as it trails.
  ctx.save();
  ctx.translate(stem, 0);
  ctx.scale(flare * (0.75 + 0.25 * Math.abs(Math.cos(look.tail))), flare);
  const tl = L * 1.05;
  ctx.beginPath();
  ctx.moveTo(0, -L * 0.06);
  ctx.bezierCurveTo(
    -tl * 0.3,
    -L * 0.42 + wave(0.3),
    -tl * 0.8,
    -L * 0.3 + wave(0.8),
    -tl,
    L * 0.12 + wave(1),
  );
  ctx.bezierCurveTo(
    -tl * 0.85,
    L * 0.55 + wave(0.9),
    -tl * 0.35,
    L * 0.42 + wave(0.4),
    0,
    L * 0.06,
  );
  ctx.closePath();
  ctx.fillStyle = finFill(0, 0, tl);
  ctx.fill();
  // Fin rays.
  ctx.strokeStyle = 'rgb(255 255 255 / 0.18)';
  ctx.lineWidth = L * 0.01;
  for (let i = 0; i < 7; i++) {
    const a = -0.5 + i * 0.17;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-Math.cos(a) * tl * 0.95, Math.sin(a) * tl * 0.5 + wave(0.9));
    ctx.stroke();
  }
  ctx.restore();
  // Dorsal fin sweeping back, anal fin flowing low.
  ctx.save();
  ctx.scale(1, flare);
  ctx.fillStyle = finFill(-L * 0.1, -L * 0.1, L * 0.55);
  ctx.beginPath();
  ctx.moveTo(L * 0.02, -L * 0.11);
  ctx.bezierCurveTo(
    -L * 0.1,
    -L * 0.42 + wave(0.5),
    -L * 0.4,
    -L * 0.36 + wave(0.8),
    -L * 0.42,
    -L * 0.12 + wave(1),
  );
  ctx.lineTo(-L * 0.26, -L * 0.07);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = finFill(-L * 0.15, L * 0.1, L * 0.7);
  ctx.beginPath();
  ctx.moveTo(L * 0.12, L * 0.1);
  ctx.bezierCurveTo(
    L * 0.0,
    L * 0.5 + wave(0.5),
    -L * 0.38,
    L * 0.52 + wave(0.9),
    -L * 0.46,
    L * 0.2 + wave(1),
  );
  ctx.lineTo(-L * 0.28, L * 0.07);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  body(ctx, L, 0.12, 0.12, -0.32, 0.06);
  const g = ctx.createLinearGradient(L * 0.5, 0, -L * 0.3, 0);
  g.addColorStop(0, '#4A3E8E');
  g.addColorStop(0.5, '#4E58BC');
  g.addColorStop(1, '#6C55C2');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Iridescent scales catching the light.
  for (let i = 0; i < 18; i++) {
    const x = L * (0.3 - (i % 6) * 0.1);
    const y = L * (-0.06 + Math.floor(i / 6) * 0.05);
    const a = 0.12 + 0.12 * Math.sin(t * 1.7 + i + look.phase);
    ctx.fillStyle = `rgb(170 200 255 / ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, L * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Gills flare red when he shows off.
  if (look.flare > 0.05) {
    ctx.fillStyle = `rgb(205 60 80 / ${0.75 * look.flare})`;
    ctx.beginPath();
    ctx.ellipse(L * 0.26, L * 0.04, L * 0.05 * look.flare + 0.1, L * 0.1, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Ventral fins: two slim trailing blades.
  ctx.fillStyle = 'rgb(214 96 140 / 0.7)';
  ctx.beginPath();
  ctx.moveTo(L * 0.22, L * 0.09);
  ctx.quadraticCurveTo(L * 0.18, L * 0.24, L * 0.08 + wave(0.6), L * 0.28);
  ctx.quadraticCurveTo(L * 0.14, L * 0.18, L * 0.16, L * 0.09);
  ctx.closePath();
  ctx.fill();
  eye(ctx, L * 0.36, -L * 0.03, L * 0.04);
}

/* ---------- Cherry shrimp ---------- */

function cherryShrimp(ctx: Ctx, look: FishLook) {
  const { L, t } = look;
  // Legs, always busy.
  ctx.strokeStyle = 'rgb(220 80 80 / 0.7)';
  ctx.lineWidth = L * 0.045;
  for (let i = 0; i < 5; i++) {
    const x = L * (0.22 - i * 0.1);
    const kick = Math.sin(t * 9 + i * 1.3 + look.phase) * L * 0.04;
    ctx.beginPath();
    ctx.moveTo(x, L * 0.08);
    ctx.lineTo(x + kick, L * 0.24);
    ctx.stroke();
  }
  // Antennae sweeping forward.
  ctx.strokeStyle = 'rgb(200 70 70 / 0.65)';
  ctx.lineWidth = L * 0.025;
  for (const a of [0, 1]) {
    const flick = Math.sin(t * 2.4 + a * 2 + look.phase) * L * 0.08;
    ctx.beginPath();
    ctx.moveTo(L * 0.42, -L * 0.04);
    ctx.quadraticCurveTo(L * 0.8, -L * 0.3 + flick, L * 1.1, -L * 0.05 + flick + a * L * 0.1);
    ctx.stroke();
  }
  // A curved back: carapace, then the tail segments bending down.
  const g = ctx.createLinearGradient(0, -L * 0.2, 0, L * 0.15);
  g.addColorStop(0, '#E8474C');
  g.addColorStop(1, '#B4222E');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(L * 0.45, -L * 0.02);
  ctx.quadraticCurveTo(L * 0.2, -L * 0.26, -L * 0.15, -L * 0.18);
  ctx.quadraticCurveTo(-L * 0.42, -L * 0.1, -L * 0.48, L * 0.12);
  ctx.lineTo(-L * 0.38, L * 0.14);
  ctx.quadraticCurveTo(-L * 0.25, L * 0.04, -L * 0.1, L * 0.06);
  ctx.quadraticCurveTo(L * 0.2, L * 0.12, L * 0.45, -L * 0.02);
  ctx.closePath();
  ctx.fill();
  // Segment lines and a translucent sheen.
  ctx.strokeStyle = 'rgb(120 20 30 / 0.4)';
  ctx.lineWidth = L * 0.02;
  for (let i = 0; i < 4; i++) {
    const x = -L * (0.05 + i * 0.1);
    ctx.beginPath();
    ctx.moveTo(x, -L * 0.17 + i * L * 0.03);
    ctx.lineTo(x - L * 0.03, L * 0.06);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgb(255 255 255 / 0.25)';
  ctx.beginPath();
  ctx.ellipse(L * 0.12, -L * 0.12, L * 0.18, L * 0.04, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Tail fan.
  ctx.fillStyle = 'rgb(220 60 70 / 0.8)';
  ctx.beginPath();
  ctx.moveTo(-L * 0.44, L * 0.12);
  ctx.lineTo(-L * 0.6, L * 0.2);
  ctx.lineTo(-L * 0.5, L * 0.26);
  ctx.closePath();
  ctx.fill();
  eye(ctx, L * 0.38, -L * 0.08, L * 0.035, 'rgb(0 0 0 / 0)');
}

export const DRAW: Record<FishId, (ctx: Ctx, look: FishLook) => void> = {
  neonTetra,
  pandaCory,
  betta,
  cherryShrimp,
};
