/**
 * Drawing the tank's water, light, sand, plants and decor, in world units.
 * Everything is drawn in daylight colors; evening is one overlay at the end,
 * so a plant never needs a night version. Things that never move (stones,
 * wood, moss, the carpet) are drawn once into sprites and reused.
 */
import type { DecorId, PlantId, TankItem } from './catalog';
import { clamp, depthScale, floorY, H, lerp, mix, seeded, SURFACE, W } from './world';

type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

/* ---------- Shapes ---------- */

/** Fills a strip along a spine, `widths[i]` wide at each point: leaves, ribbons, branches. */
function ribbon(ctx: Ctx, spine: Pt[], widths: number[]) {
  const n = spine.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const [ax, ay] = spine[Math.max(0, i - 1)]!;
    const [bx, by] = spine[Math.min(n - 1, i + 1)]!;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const w = widths[i]! / 2;
    const [cx, cy] = spine[i]!;
    left.push([cx + nx * w, cy + ny * w]);
    right.push([cx - nx * w, cy - ny * w]);
  }
  ctx.beginPath();
  ctx.moveTo(left[0]![0], left[0]![1]);
  for (const [x, y] of left.slice(1)) ctx.lineTo(x, y);
  for (const [x, y] of right.reverse()) ctx.lineTo(x, y);
  ctx.closePath();
}

/** A soft shadow on the sand under something. */
function shadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.22) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
  g.addColorStop(0, `rgb(40 50 40 / ${a})`);
  g.addColorStop(1, 'rgb(40 50 40 / 0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.beginPath();
  ctx.arc(x, y, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ---------- The static background: water and sand ---------- */

export function drawBackground(ctx: Ctx) {
  // Air under the lid, lit by the lamp.
  const air = ctx.createLinearGradient(0, 0, 0, SURFACE);
  air.addColorStop(0, '#F7FBFA');
  air.addColorStop(1, '#E6F2EF');
  ctx.fillStyle = air;
  ctx.fillRect(0, 0, W, SURFACE);

  // Water against a frosted backdrop: bright near the lamp, deeper toward the sand.
  const water = ctx.createLinearGradient(0, SURFACE, 0, H);
  water.addColorStop(0, '#DDEFEA');
  water.addColorStop(0.45, '#AFD5CC');
  water.addColorStop(1, '#78A99D');
  ctx.fillStyle = water;
  ctx.fillRect(0, SURFACE, W, H - SURFACE);

  // The sand, from the back glass to the front.
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 10) ctx.lineTo(x, floorY(x, 0));
  ctx.lineTo(W, H);
  ctx.closePath();
  const sand = ctx.createLinearGradient(0, H * 0.74, 0, H);
  sand.addColorStop(0, '#CDBF9F');
  sand.addColorStop(0.35, '#DED0B2');
  sand.addColorStop(1, '#C3AD88');
  ctx.fillStyle = sand;
  ctx.fill();

  // Grains: lighter and darker specks, denser toward the front.
  const rand = seeded(42);
  for (let i = 0; i < 2600; i++) {
    const x = rand() * W;
    const z = Math.sqrt(rand());
    const y = floorY(x, z) + rand() * 6;
    if (y > H) continue;
    const r = (0.5 + rand() * 1.3) * depthScale(z);
    const tone = rand();
    ctx.fillStyle =
      tone < 0.45
        ? `rgb(150 128 96 / ${0.35 + rand() * 0.3})`
        : tone < 0.8
          ? `rgb(245 238 222 / ${0.4 + rand() * 0.4})`
          : `rgb(110 116 112 / ${0.3 + rand() * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.3, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // The back glass meets the sand in a soft shadow.
  ctx.beginPath();
  for (let x = 0; x <= W; x += 10) ctx.lineTo(x, floorY(x, 0) - 1);
  ctx.strokeStyle = 'rgb(90 110 100 / 0.25)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

/** Shafts of light from the lamp, drifting slowly. */
export function drawRays(ctx: Ctx, t: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 4; i++) {
    const x0 = 90 + i * 250 + Math.sin(t * 0.11 + i * 1.7) * 30;
    const w0 = 40 + ((i * 37) % 30);
    const slant = 150;
    const bottom = H * 0.86;
    const a = 0.16 + 0.07 * Math.sin(t * 0.23 + i * 2.1);
    const g = ctx.createLinearGradient(0, SURFACE, 0, bottom);
    g.addColorStop(0, `rgb(255 255 245 / ${a})`);
    g.addColorStop(1, 'rgb(255 255 245 / 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, SURFACE);
    ctx.lineTo(x0 + w0, SURFACE);
    ctx.lineTo(x0 + w0 + slant + 60, bottom);
    ctx.lineTo(x0 + slant - 30, bottom);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Rippling light on the sand. */
export function drawCaustics(ctx: Ctx, t: number) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, floorY(x, 0));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  ctx.lineCap = 'round';
  const rand = seeded(7);
  for (let i = 0; i < 46; i++) {
    const z = 0.15 + rand() * 0.85;
    const speed = 6 + rand() * 10;
    const len = (40 + rand() * 70) * depthScale(z);
    const x0 = ((rand() * W + t * speed) % (W + 120)) - 60;
    const phase = rand() * 6.28;
    ctx.strokeStyle = `rgb(255 255 240 / ${0.12 + 0.12 * Math.sin(t * 0.9 + phase) ** 2})`;
    ctx.lineWidth = (1 + rand() * 1.2) * depthScale(z);
    ctx.beginPath();
    for (let s = 0; s <= 8; s++) {
      const x = x0 + (s / 8) * len;
      const y = floorY(x, z) + Math.sin(s * 0.9 + t * 1.3 + phase) * 2.2 * depthScale(z);
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** The underside of the surface catching the light. */
export function drawSurface(ctx: Ctx, t: number) {
  ctx.save();
  const g = ctx.createLinearGradient(0, SURFACE - 3, 0, SURFACE + 10);
  g.addColorStop(0, 'rgb(255 255 255 / 0.85)');
  g.addColorStop(1, 'rgb(255 255 255 / 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, SURFACE + 12);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, SURFACE + Math.sin(x * 0.03 + t * 1.4) * 1.4);
  ctx.lineTo(W, SURFACE + 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Haze over everything drawn so far that sits behind depth `z`: water between it and you. */
export function drawHaze(ctx: Ctx, z: number, alpha: number) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, SURFACE);
  ctx.lineTo(W, SURFACE);
  for (let x = W; x >= 0; x -= 20) ctx.lineTo(x, floorY(x, z));
  ctx.closePath();
  ctx.fillStyle = `rgb(160 205 195 / ${alpha})`;
  ctx.fill();
  ctx.restore();
}

/** Evening: the room light goes down and a cool moonlight takes over from the lamp. */
export function drawEvening(ctx: Ctx, night: number) {
  if (night <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = mix('#FFFFFF', '#28497A', night);
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'screen';
  const moon = ctx.createLinearGradient(0, 0, 0, H);
  moon.addColorStop(0, `rgb(120 150 210 / ${0.22 * night})`);
  moon.addColorStop(1, 'rgb(120 150 210 / 0)');
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** The front glass: a faint reflection and darker corners. */
export function drawGlass(ctx: Ctx) {
  ctx.save();
  const sheen = ctx.createLinearGradient(0, 0, W, H);
  sheen.addColorStop(0, 'rgb(255 255 255 / 0.08)');
  sheen.addColorStop(0.3, 'rgb(255 255 255 / 0)');
  sheen.addColorStop(0.62, 'rgb(255 255 255 / 0)');
  sheen.addColorStop(0.7, 'rgb(255 255 255 / 0.05)');
  sheen.addColorStop(0.78, 'rgb(255 255 255 / 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.4, W / 2, H * 0.45, W * 0.62);
  v.addColorStop(0, 'rgb(20 40 40 / 0)');
  v.addColorStop(1, 'rgb(20 40 40 / 0.22)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ---------- Plants that sway ---------- */

/** Where an item's base sits on screen, and how large it draws. */
export function anchor(item: TankItem): { x: number; y: number; s: number } {
  const s = depthScale(item.z) * (item.size ?? 1);
  return { x: item.x, y: floorY(item.x, item.z) - (item.lift ?? 0) * depthScale(item.z), s };
}

function vallisneria(ctx: Ctx, item: TankItem, t: number, still: boolean) {
  const { x, y, s } = anchor(item);
  const rand = seeded(item.seed);
  const blades = 8 + Math.floor(rand() * 5);
  const room = y - SURFACE;
  for (let b = 0; b < blades; b++) {
    const bx = x + (rand() - 0.5) * 46 * s;
    const tall = room * (0.55 + rand() * 0.38);
    const lean = (rand() - 0.5) * 0.5;
    const phase = rand() * 6.28;
    const wide = (6 + rand() * 3) * s;
    const spine: Pt[] = [];
    const widths: number[] = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      const sway = still ? 0 : Math.sin(t * 0.55 + phase + u * 1.8) * 16 * u ** 1.6 * s;
      spine.push([bx + lean * tall * u + sway, y - tall * u]);
      // The ribbon twists as it rises, so it narrows and widens.
      const twist = 0.4 + 0.6 * Math.abs(Math.cos(u * 3.2 + phase));
      widths.push(wide * twist * (u > 0.92 ? (1 - u) / 0.08 : 1));
    }
    const g = ctx.createLinearGradient(0, y, 0, y - tall);
    g.addColorStop(0, '#3F6E30');
    g.addColorStop(0.6, '#5E9440');
    g.addColorStop(1, '#8EBF5C');
    ctx.fillStyle = g;
    ribbon(ctx, spine, widths);
    ctx.fill();
    ctx.strokeStyle = 'rgb(40 70 30 / 0.25)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
}

function rotala(ctx: Ctx, item: TankItem, t: number, still: boolean) {
  const { x, y, s } = anchor(item);
  const rand = seeded(item.seed);
  const stems = 6 + Math.floor(rand() * 4);
  const room = y - SURFACE;
  for (let k = 0; k < stems; k++) {
    const bx = x + (rand() - 0.5) * 50 * s;
    const tall = room * (0.32 + rand() * 0.3);
    const phase = rand() * 6.28;
    const lean = (rand() - 0.5) * 0.25;
    const at = (u: number): Pt => [
      bx + lean * tall * u + (still ? 0 : Math.sin(t * 0.7 + phase + u) * 5 * u * s),
      y - tall * u,
    ];
    ctx.strokeStyle = '#6E8F4C';
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const [px, py] = at(i / 10);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Leaf pairs all the way up, green turning rose toward the light.
    const pairs = Math.floor(tall / (6.5 * s));
    for (let i = 1; i <= pairs; i++) {
      const u = i / pairs;
      const [px, py] = at(u);
      const len = (7 + 3 * (1 - Math.abs(u - 0.5))) * s * (u > 0.9 ? 0.7 : 1);
      ctx.fillStyle = mix('#5C9A42', '#E07E96', clamp((u - 0.45) / 0.55, 0, 1) ** 1.4);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(side * (1.05 - u * 0.45) - Math.PI / 2 + (i % 2) * 0.3);
        ctx.beginPath();
        ctx.ellipse(0, -len / 2, len * 0.32, len / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

function fernLeaf(ctx: Ctx, len: number, wide: number, color: string) {
  const spine: Pt[] = [];
  const widths: number[] = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    spine.push([0, -len * u]);
    widths.push(wide * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.8 + 0.3);
  }
  ctx.fillStyle = color;
  ribbon(ctx, spine, widths);
  ctx.fill();
  ctx.strokeStyle = 'rgb(140 190 110 / 0.5)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -len * 0.92);
  ctx.stroke();
}

function javaFern(ctx: Ctx, item: TankItem, t: number, still: boolean) {
  const { x, y, s } = anchor(item);
  const rand = seeded(item.seed);
  const leaves = 8 + Math.floor(rand() * 4);
  for (let i = 0; i < leaves; i++) {
    const spread = (i / (leaves - 1) - 0.5) * 2.3 + (rand() - 0.5) * 0.3;
    const sway = still ? 0 : Math.sin(t * 0.5 + i) * 0.04;
    ctx.save();
    ctx.translate(x + (rand() - 0.5) * 10 * s, y);
    ctx.rotate(spread * 0.65 + sway);
    const tone = rand();
    fernLeaf(ctx, (48 + rand() * 34) * s, (9 + rand() * 3) * s, mix('#2C5627', '#4F8A3A', tone));
    ctx.restore();
  }
}

function frogbit(ctx: Ctx, item: TankItem, t: number, still: boolean) {
  const { s } = anchor(item);
  const rand = seeded(item.seed);
  const pads = 5 + Math.floor(rand() * 4);
  for (let i = 0; i < pads; i++) {
    const px = item.x + (rand() - 0.5) * 120 * s;
    const r = (18 + rand() * 9) * s;
    // Roots trail down into the water.
    ctx.strokeStyle = 'rgb(225 230 200 / 0.55)';
    ctx.lineWidth = 0.8;
    const roots = 3 + Math.floor(rand() * 4);
    for (let k = 0; k < roots; k++) {
      const len = (24 + rand() * 46) * s;
      const rx = px + (rand() - 0.5) * r;
      const sway = still ? 0 : Math.sin(t * 0.8 + i + k) * 4;
      ctx.beginPath();
      ctx.moveTo(rx, SURFACE + 2);
      ctx.quadraticCurveTo(rx + sway, SURFACE + len / 2, rx + sway * 1.6, SURFACE + len);
      ctx.stroke();
    }
    // The pad, floating flat, seen nearly edge-on.
    // Seen from below: the pad's dark underside against the light.
    ctx.fillStyle = '#4F8A33';
    ctx.beginPath();
    ctx.ellipse(px, SURFACE + 1, r, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgb(220 245 190 / 0.5)';
    ctx.beginPath();
    ctx.ellipse(px - r * 0.2, SURFACE - r * 0.08, r * 0.6, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------- Things that never move: drawn once into sprites ---------- */

interface Sprite {
  canvas: HTMLCanvasElement;
  /** World-space box the sprite covers. */
  x: number;
  y: number;
  w: number;
  h: number;
}

const sprites = new Map<string, Sprite>();

/** The box each still item needs, around its anchor, in world units at scale 1. */
const BOX: Record<string, [number, number, number, number]> = {
  stone: [-80, -95, 160, 115],
  driftwood: [-230, -290, 460, 310],
  teapot: [-70, -80, 140, 100],
  moss: [-60, -34, 120, 52],
  anubias: [-60, -70, 120, 82],
  carpet: [-110, -18, 220, 30],
};

function stone(ctx: Ctx, item: TankItem) {
  const { x, y, s } = anchor(item);
  const rand = seeded(item.seed);
  const w = (55 + rand() * 30) * s;
  const h = (40 + rand() * 25) * s;
  shadow(ctx, x, y + 2 * s, w * 0.75, 7 * s, 0.3);
  const pts: Pt[] = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI;
    const r = 0.82 + rand() * 0.22;
    pts.push([x + Math.cos(a) * w * 0.5 * r, y + Math.sin(a) * h * r + 4 * s]);
  }
  ctx.beginPath();
  ctx.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < n; i++) {
    const [px, py] = pts[i - 1]!;
    const [cx, cy] = pts[i]!;
    ctx.quadraticCurveTo(px, py, (px + cx) / 2, (py + cy) / 2);
  }
  ctx.lineTo(pts[n - 1]![0], pts[n - 1]![1]);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - w / 2, y - h, x + w / 3, y);
  g.addColorStop(0, '#B4BBBD');
  g.addColorStop(0.5, '#868E92');
  g.addColorStop(1, '#5A6064');
  ctx.fillStyle = g;
  ctx.fill();
  // Seiryu's pale veins.
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgb(235 238 236 / 0.55)';
  ctx.lineWidth = 1.1 * s;
  for (let v = 0; v < 3; v++) {
    const vy = y - h * (0.2 + rand() * 0.6);
    ctx.beginPath();
    ctx.moveTo(x - w / 2, vy);
    ctx.bezierCurveTo(x - w / 6, vy - 8 * s, x + w / 6, vy + 6 * s, x + w / 2, vy - 4 * s);
    ctx.stroke();
  }
  ctx.restore();
}

function driftwood(ctx: Ctx, item: TankItem) {
  const { x, y, s } = anchor(item);
  const rand = seeded(item.seed);
  shadow(ctx, x, y + 2 * s, 150 * s, 10 * s, 0.28);
  const bark = (y0: number, y1: number) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#8A6548');
    g.addColorStop(1, '#4B3324');
    return g;
  };
  const branch = (
    bx: number,
    by: number,
    angle: number,
    len: number,
    wide: number,
    depth: number,
  ) => {
    const spine: Pt[] = [];
    const widths: number[] = [];
    let a = angle;
    let px = bx;
    let py = by;
    for (let i = 0; i <= 12; i++) {
      spine.push([px, py]);
      widths.push(wide * (1 - (i / 12) * 0.75));
      a += (rand() - 0.5) * 0.22;
      px += Math.cos(a) * (len / 12);
      py += Math.sin(a) * (len / 12);
    }
    ctx.fillStyle = bark(by - len, by);
    ribbon(ctx, spine, widths);
    ctx.fill();
    // Grain running along the wood.
    ctx.strokeStyle = 'rgb(205 175 135 / 0.22)';
    ctx.lineWidth = wide * 0.08;
    for (const off of [-0.18, 0.12]) {
      ctx.beginPath();
      spine.slice(1, -2).forEach(([sx, sy], i) => {
        const w = widths[i + 1]! * off;
        if (i === 0) ctx.moveTo(sx, sy + w);
        else ctx.lineTo(sx, sy + w);
      });
      ctx.stroke();
    }
    if (depth < 2) {
      const forks = 2 + Math.floor(rand() * 2);
      for (let f = 0; f < forks; f++) {
        const at = spine[4 + Math.floor(rand() * 7)]!;
        branch(
          at[0],
          at[1],
          a + (rand() - 0.5) * 1.6 - 0.2,
          len * (0.45 + rand() * 0.2),
          wide * 0.55,
          depth + 1,
        );
      }
    }
  };
  // A root along the sand, then the wood rising from it and branching.
  branch(x - 150 * s, y + 2 * s, -0.08, 170 * s, 20 * s, 2);
  branch(x - 40 * s, y, -0.95, 200 * s, 22 * s, 0);
  branch(x + 10 * s, y, -0.45, 150 * s, 16 * s, 1);
}

function teapot(ctx: Ctx, item: TankItem) {
  const { x, y, s } = anchor(item);
  shadow(ctx, x, y + 2 * s, 46 * s, 7 * s, 0.3);
  ctx.save();
  ctx.translate(x, y - 22 * s);
  ctx.rotate(-0.22);
  ctx.scale(s, s);
  const porcelain = ctx.createRadialGradient(-10, -10, 4, 0, 0, 40);
  porcelain.addColorStop(0, '#FFFFFF');
  porcelain.addColorStop(0.7, '#E9EEF2');
  porcelain.addColorStop(1, '#BFC8D2');
  ctx.fillStyle = porcelain;
  // Spout and handle first, so the body sits over their joins.
  ctx.beginPath();
  ctx.moveTo(26, 2);
  ctx.quadraticCurveTo(46, 0, 52, -20);
  ctx.lineTo(57, -19);
  ctx.quadraticCurveTo(52, 6, 28, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#E2E8EE';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(-32, 0, 13, Math.PI * 0.55, Math.PI * 1.45);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 33, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  // A cobalt band with a small flower, like blue-and-white ware.
  ctx.strokeStyle = '#2D5A9C';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(0, 4, 31, 8, 0, 0, Math.PI);
  ctx.stroke();
  ctx.fillStyle = '#2D5A9C';
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 4, -6 + Math.sin(a) * 4, 2.6, 1.6, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // Lid and knob.
  ctx.fillStyle = porcelain;
  ctx.beginPath();
  ctx.ellipse(0, -23, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -28, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Half-sunk: sand heaped against its foot.
  ctx.fillStyle = '#D7C8A8';
  ctx.beginPath();
  ctx.ellipse(x - 4 * s, y + 1 * s, 40 * s, 7 * s, 0, Math.PI, 0);
  ctx.fill();
}

function moss(ctx: Ctx, item: TankItem) {
  const { x, y, s } = anchor(item);
  const rand = seeded(item.seed);
  ctx.lineCap = 'round';
  for (let i = 0; i < 420; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    const px = x + Math.cos(a) * r * 52 * s;
    const py = y - 8 * s + Math.sin(a) * r * 18 * s;
    const len = (3 + rand() * 5) * s;
    const dir = -Math.PI / 2 + (rand() - 0.5) * 2.4;
    ctx.strokeStyle = mix('#2F5A26', '#7DB352', rand() * 0.8 + (1 - r) * 0.2);
    ctx.lineWidth = 1.1 * s;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(dir) * len, py + Math.sin(dir) * len);
    ctx.stroke();
  }
}

function anubias(ctx: Ctx, item: TankItem) {
  const { x, y, s } = anchor(item);
  const rand = seeded(item.seed);
  const leaves = 6 + Math.floor(rand() * 3);
  for (let i = 0; i < leaves; i++) {
    const a = -Math.PI / 2 + (i / (leaves - 1) - 0.5) * 2.4;
    const stalk = (14 + rand() * 18) * s;
    const lx = x + Math.cos(a) * stalk;
    const ly = y + Math.sin(a) * stalk;
    ctx.strokeStyle = '#3F6B33';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(a + Math.PI / 2);
    const len = (24 + rand() * 10) * s;
    const g = ctx.createLinearGradient(-8 * s, 0, 8 * s, -len);
    g.addColorStop(0, '#22461F');
    g.addColorStop(1, '#3E7233');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -len / 2, len * 0.34, len / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // The waxy shine anubias leaves have.
    ctx.fillStyle = 'rgb(255 255 255 / 0.13)';
    ctx.beginPath();
    ctx.ellipse(-len * 0.1, -len * 0.62, len * 0.1, len * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function carpet(ctx: Ctx, item: TankItem) {
  const { x, s } = anchor(item);
  const rand = seeded(item.seed);
  const half = 100 * s;
  for (let i = 0; i < 520; i++) {
    const px = x + (rand() * 2 - 1) * half * Math.sqrt(rand());
    const fade = 1 - Math.abs(px - x) / half;
    const z = item.z + (rand() - 0.5) * 0.12;
    const py = floorY(px, z) - rand() * 9 * s * (0.4 + fade);
    const r = (1.8 + rand() * 1.3) * s;
    ctx.fillStyle = mix('#3E7A2E', '#86C860', rand());
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * 0.8, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

const STILL: Partial<Record<PlantId | DecorId, (ctx: Ctx, item: TankItem) => void>> = {
  stone,
  driftwood,
  teapot,
  moss,
  anubias,
  carpet,
};

const LIVE: Partial<
  Record<PlantId | DecorId, (ctx: Ctx, item: TankItem, t: number, still: boolean) => void>
> = { vallisneria, rotala, javaFern, frogbit };

/** Draws one item: still ones from a sprite made at this canvas's resolution. */
export function drawItem(ctx: Ctx, item: TankItem, t: number, still: boolean, pxPerUnit: number) {
  const live = LIVE[item.id];
  if (live) return live(ctx, item, t, still);
  const paint = STILL[item.id];
  if (!paint) return;
  const key = `${item.id}:${item.seed}:${item.x}:${item.z}:${item.size ?? 1}:${item.lift ?? 0}:${pxPerUnit.toFixed(3)}`;
  let sprite = sprites.get(key);
  if (!sprite) {
    const { x, y, s } = anchor(item);
    const [bx, by, bw, bh] = BOX[item.id]!;
    const box = { x: x + bx * s, y: y + by * s, w: bw * s, h: bh * s };
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(box.w * pxPerUnit));
    canvas.height = Math.max(1, Math.ceil(box.h * pxPerUnit));
    const c = canvas.getContext('2d')!;
    c.scale(pxPerUnit, pxPerUnit);
    c.translate(-box.x, -box.y);
    paint(c, item);
    sprite = { canvas, ...box };
    if (sprites.size > 120) sprites.clear();
    sprites.set(key, sprite);
  }
  ctx.drawImage(sprite.canvas, sprite.x, sprite.y, sprite.w, sprite.h);
}

/** Bubbles rising from the filter outlet at the back right. */
export function drawBubble(ctx: Ctx, x: number, y: number, r: number) {
  ctx.strokeStyle = 'rgb(255 255 255 / 0.7)';
  ctx.lineWidth = 0.8;
  ctx.fillStyle = 'rgb(255 255 255 / 0.12)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgb(255 255 255 / 0.85)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

export { lerp };
