/**
 * How the tank's animals behave. Each screen simulates its own copy: only
 * events (feeding, a tap on the glass, a Yatzy, your turn) need to be shared,
 * never positions. The start is seeded, so a tank opens the same everywhere.
 *
 * Neon tetras school (separation, alignment, cohesion, and a wandering goal).
 * Corydoras sift along the sand and now and then dash up for a gulp of air.
 * A betta drifts near the top and flares now and then. Shrimp graze the sand
 * and hop. Everyone goes for food, and slows down in the evening.
 */
import { FISH, type FishId, type TankLayout } from './catalog';
import { clamp, depthScale, floorY, H, lerp, seeded, SURFACE, W } from './world';

export interface Fish {
  id: FishId;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** -1 facing left to 1 facing right; it passes through 0 as the fish turns. */
  facing: number;
  tail: number;
  phase: number;
  goal: { x: number; y: number; z: number } | null;
  /** Seconds left in the current behavior. */
  timer: number;
  mode: 'swim' | 'root' | 'gulp' | 'sink' | 'hover' | 'graze' | 'hop';
  flare: number;
  /** Seconds left fleeing a tap on the glass. */
  fleeing: number;
}

export interface Flake {
  x: number;
  y: number;
  z: number;
  /** Seconds afloat before it starts to sink. */
  float: number;
  age: number;
  eaten: boolean;
}

export interface Bubble {
  x: number;
  y: number;
  z: number;
  r: number;
  vy: number;
  phase: number;
}

export interface Tap {
  x: number;
  y: number;
  age: number;
}

/** Top speeds, world units per second, before evening and excitement. */
const SPEED: Record<FishId, number> = { neonTetra: 70, pandaCory: 34, betta: 30, cherryShrimp: 26 };
/** Room for depth in distances: one unit of z counts as this many world units. */
const ZW = 260;
const OUTLET_X = 46;

export class TankSim {
  fish: Fish[] = [];
  flakes: Flake[] = [];
  bubbles: Bubble[] = [];
  taps: Tap[] = [];
  t = 0;
  /** 0 day to 1 evening, easing toward `nightGoal`. */
  night = 0;
  nightGoal = 0;
  private frenzy = 0;
  private greet = 0;
  private school = { x: W / 2, y: H * 0.42, z: 0.6, timer: 0 };
  private bubbleClock = 0;
  private rand: () => number;

  constructor(layout: TankLayout, seed = 1) {
    this.rand = seeded(seed);
    const r = this.rand;
    for (const { id, count } of layout.fish) {
      for (let i = 0; i < count; i++) {
        const z = 0.35 + r() * 0.55;
        const x = 80 + r() * (W - 160);
        const zone = FISH[id].zone;
        const y =
          zone === 'school'
            ? H * (0.3 + r() * 0.25)
            : zone === 'upper'
              ? H * (0.16 + r() * 0.15)
              : floorY(x, z) - 6;
        this.fish.push({
          id,
          x,
          y,
          z,
          vx: (r() - 0.5) * 20,
          vy: 0,
          vz: 0,
          facing: r() < 0.5 ? -1 : 1,
          tail: r() * 6.28,
          phase: r() * 6.28,
          goal: null,
          timer: r() * 3,
          mode: zone === 'bottom' ? 'root' : zone === 'surface' ? 'graze' : 'swim',
          flare: 0,
          fleeing: 0,
        });
      }
    }
  }

  /** Sprinkle flakes on the surface around `x` (anywhere if not given). */
  feed(x?: number) {
    const r = this.rand;
    const cx = x ?? 150 + r() * (W - 300);
    for (let i = 0; i < 14; i++) {
      this.flakes.push({
        x: clamp(cx + (r() - 0.5) * 120, 20, W - 20),
        y: SURFACE + 2,
        z: 0.3 + r() * 0.6,
        float: 0.6 + r() * 1.6,
        age: 0,
        eaten: false,
      });
    }
  }

  /** A knock on the glass at a point: everything nearby darts away. */
  tap(x: number, y: number) {
    this.taps.push({ x, y, age: 0 });
    for (const f of this.fish) {
      const dx = f.x - x;
      const dy = f.y - y;
      const d = Math.hypot(dx, dy) + 0.001;
      if (d > 170 || f.id === 'cherryShrimp') continue;
      const push = (1 - d / 170) * 160 + 60;
      f.vx = (dx / d) * push;
      f.vy = (dy / d) * push * 0.6;
      f.vz = -0.6;
      f.fleeing = 0.7;
      if (f.mode === 'root') f.mode = 'swim';
    }
  }

  /** A Yatzy: everyone gets excited for a couple of seconds. */
  celebrate() {
    this.frenzy = 2.6;
    this.school.timer = 0;
  }

  /** Your turn: they come to the front glass to see you. */
  welcome() {
    this.greet = 3.4;
  }

  step(dt: number) {
    if (dt <= 0) return;
    this.t += dt;
    this.night += (this.nightGoal - this.night) * Math.min(1, dt * 0.8);
    this.frenzy = Math.max(0, this.frenzy - dt);
    this.greet = Math.max(0, this.greet - dt);
    const r = this.rand;

    // The school's goal wanders; faster when excited.
    this.school.timer -= dt * (this.frenzy > 0 ? 4 : 1);
    if (this.school.timer <= 0) {
      this.school = {
        x: 140 + r() * (W - 280),
        y: H * (0.24 + r() * 0.34 + this.night * 0.15),
        z: 0.35 + r() * 0.5,
        timer: 4 + r() * 5,
      };
    }
    if (this.greet > 0) Object.assign(this.school, { x: W / 2, y: H * 0.48, z: 0.95 });

    this.stepFlakes(dt);
    this.stepBubbles(dt);
    for (const tap of this.taps) tap.age += dt;
    this.taps = this.taps.filter((tap) => tap.age < 0.8);

    for (const f of this.fish) {
      f.fleeing = Math.max(0, f.fleeing - dt);
      if (f.id === 'neonTetra') this.tetra(f, dt);
      else if (f.id === 'pandaCory') this.cory(f, dt);
      else if (f.id === 'betta') this.betta(f, dt);
      else this.shrimp(f, dt);
      this.eat(f);
      // Turning: the fish swings through edge-on to face where it's going.
      if (Math.abs(f.vx) > 3) {
        const want = Math.sign(f.vx);
        f.facing = clamp(f.facing + Math.sign(want - f.facing) * dt * 4.5, -1, 1);
      }
      const speed = Math.hypot(f.vx, f.vy);
      f.tail += dt * (5 + speed * 0.22);
      f.flare = Math.max(0, f.flare - dt * 0.4);
    }
  }

  /** How fast everyone may go right now: slower in the evening, faster when excited. */
  private pace(id: FishId) {
    return SPEED[id] * (1 - this.night * 0.55) * (this.frenzy > 0 ? 2.3 : 1);
  }

  private steer(f: Fish, gx: number, gy: number, gz: number, strength: number, dt: number) {
    f.vx += (gx - f.x) * strength * dt;
    f.vy += (gy - f.y) * strength * dt;
    f.vz += ((gz - f.z) * ZW * strength * dt) / ZW;
  }

  private move(f: Fish, dt: number, maxSpeed: number, drag: number) {
    const speed = Math.hypot(f.vx, f.vy);
    const cap = f.fleeing > 0 ? maxSpeed * 2.6 : maxSpeed;
    if (speed > cap) {
      f.vx *= cap / speed;
      f.vy *= cap / speed;
    }
    const k = Math.exp(-drag * dt);
    f.vx *= k;
    f.vy *= k;
    f.vz *= Math.exp(-2 * dt);
    f.vz = clamp(f.vz, -0.25, 0.25);
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.z = clamp(f.z + f.vz * dt, 0.15, 0.97);
    // Stay in the water and off the glass.
    const margin = 24;
    if (f.x < margin) f.vx += (margin - f.x) * 6 * dt;
    if (f.x > W - margin) f.vx -= (f.x - (W - margin)) * 6 * dt;
    f.x = clamp(f.x, 6, W - 6);
    const floor = floorY(f.x, f.z) - FISH[f.id].length * depthScale(f.z) * 0.22;
    f.y = clamp(f.y, SURFACE + 8, floor);
  }

  private tetra(f: Fish, dt: number) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    let ax = 0;
    let ay = 0;
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const o of this.fish) {
      if (o === f || o.id !== 'neonTetra') continue;
      const dx = o.x - f.x;
      const dy = o.y - f.y;
      const dz = (o.z - f.z) * ZW;
      const d = Math.hypot(dx, dy, dz);
      if (d > 110) continue;
      n++;
      cx += o.x;
      cy += o.y;
      cz += o.z;
      ax += o.vx;
      ay += o.vy;
      if (d < 20) {
        sx -= dx / (d * d + 1);
        sy -= dy / (d * d + 1);
      }
    }
    if (n > 0) {
      this.steer(f, cx / n, cy / n, cz / n, 0.5, dt);
      f.vx += (ax / n - f.vx) * 0.9 * dt;
      f.vy += (ay / n - f.vy) * 0.9 * dt;
      f.vx += sx * 900 * dt;
      f.vy += sy * 900 * dt;
    }
    const food = this.nearestFood(f, 280, false);
    if (food) this.steer(f, food.x, food.y, food.z, 2.4, dt);
    else this.steer(f, this.school.x, this.school.y, this.school.z, 0.32, dt);
    // A little restlessness of its own.
    f.vx += Math.sin(this.t * 1.3 + f.phase * 3) * 14 * dt;
    f.vy += Math.cos(this.t * 1.1 + f.phase * 2) * 10 * dt;
    this.move(f, dt, this.pace('neonTetra'), 0.6);
  }

  private cory(f: Fish, dt: number) {
    const r = this.rand;
    const L = FISH.pandaCory.length * depthScale(f.z);
    const floor = floorY(f.x, f.z) - L * 0.2;
    f.timer -= dt;
    if (this.greet > 0 && f.mode !== 'gulp' && f.mode !== 'sink') {
      f.mode = 'swim';
      f.goal = { x: W / 2 + (f.phase - 3) * 30, y: floorY(W / 2, 0.95), z: 0.95 };
    }
    const food = this.nearestFood(f, 220, true);
    if (food && f.mode !== 'gulp') {
      f.mode = 'swim';
      f.goal = { x: food.x, y: food.y, z: food.z };
    }
    if (f.mode === 'root') {
      // Nose down in the sand, sifting.
      f.vx *= Math.exp(-6 * dt);
      f.y = floor + Math.sin(this.t * 9 + f.phase) * 0.8;
      if (f.timer <= 0) {
        if (r() < 0.12 && this.night < 0.5) {
          f.mode = 'gulp';
          f.goal = { x: f.x + (r() - 0.5) * 60, y: SURFACE + 6, z: f.z };
        } else {
          f.mode = 'swim';
          f.goal = {
            x: clamp(f.x + (r() - 0.5) * 320, 40, W - 40),
            y: floor,
            z: clamp(f.z + (r() - 0.5) * 0.3, 0.45, 0.95),
          };
        }
      }
      return;
    }
    const goal = f.goal ?? { x: f.x, y: floor, z: f.z };
    const fast = f.mode === 'gulp' || f.mode === 'sink' ? 3.2 : 1;
    this.steer(
      f,
      goal.x,
      f.mode === 'swim' ? floorY(goal.x, goal.z) : goal.y,
      goal.z,
      1.4 * fast,
      dt,
    );
    this.move(f, dt, this.pace('pandaCory') * fast, 2.2);
    if (f.mode === 'swim') f.y = lerp(f.y, floorY(f.x, f.z) - L * 0.2, Math.min(1, dt * 6));
    const there = Math.hypot(goal.x - f.x, goal.y - f.y) < 10;
    if (f.mode === 'gulp' && f.y < SURFACE + 14) {
      f.mode = 'sink';
      f.goal = { x: f.x + (r() - 0.5) * 80, y: floorY(f.x, f.z), z: f.z };
    } else if (f.mode === 'sink' && f.y >= floorY(f.x, f.z) - L * 0.3) {
      f.mode = 'root';
      f.timer = 2 + r() * 3;
    } else if (f.mode === 'swim' && (there || Math.abs(goal.x - f.x) < 8)) {
      f.mode = 'root';
      f.timer = 2 + r() * 4;
    }
  }

  private betta(f: Fish, dt: number) {
    const r = this.rand;
    f.timer -= dt;
    if (f.timer <= 0 || !f.goal) {
      f.goal = {
        x: 120 + r() * (W - 240),
        y: H * (0.14 + r() * 0.28 + this.night * 0.2),
        z: 0.4 + r() * 0.55,
      };
      f.timer = 6 + r() * 7;
      if (f.goal.z > 0.85 && r() < 0.5) f.flare = 1;
    }
    const food = this.nearestFood(f, 300, false);
    const g = this.greet > 0 ? { x: W / 2 + 60, y: H * 0.36, z: 0.95 } : (food ?? f.goal);
    this.steer(f, g.x, g.y, g.z, food ? 1.4 : 0.35, dt);
    // He hovers more than he swims.
    f.vy += Math.sin(this.t * 0.9 + f.phase) * 4 * dt;
    if (this.frenzy > 0) f.flare = 1;
    this.move(f, dt, this.pace('betta'), 1.4);
  }

  private shrimp(f: Fish, dt: number) {
    const r = this.rand;
    const L = FISH.cherryShrimp.length * depthScale(f.z);
    const floor = floorY(f.x, f.z) - L * 0.22;
    f.timer -= dt;
    const food = this.nearestFood(f, 160, true);
    if (f.mode === 'hop') {
      f.vy += 260 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.y >= floor && f.vy > 0) {
        f.y = floor;
        f.vx = 0;
        f.vy = 0;
        f.mode = 'graze';
        f.timer = 1.5 + r() * 4;
      }
      return;
    }
    f.y = floor;
    if (food) {
      f.vx = Math.sign(food.x - f.x) * 12;
      f.x += f.vx * dt;
    } else if (f.timer <= 0 || this.frenzy > 2.4) {
      // A little hop, left or right, with a flick of the tail.
      const dir = r() < 0.5 ? -1 : 1;
      f.mode = 'hop';
      f.vx = dir * (30 + r() * 40);
      f.vy = -(40 + r() * 50);
      f.x = clamp(f.x, 30, W - 30);
    } else {
      f.vx = 0;
    }
  }

  private nearestFood(f: Fish, reach: number, onFloor: boolean) {
    let best: Flake | null = null;
    let bestD = reach;
    for (const k of this.flakes) {
      if (k.eaten) continue;
      const settled = k.y >= floorY(k.x, k.z) - 2;
      if (onFloor !== settled) continue;
      const d = Math.hypot(k.x - f.x, k.y - f.y, (k.z - f.z) * ZW);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    return best;
  }

  private eat(f: Fish) {
    for (const k of this.flakes) {
      if (k.eaten) continue;
      if (Math.hypot(k.x - f.x, k.y - f.y) < 10 && Math.abs(k.z - f.z) < 0.12) k.eaten = true;
    }
  }

  private stepFlakes(dt: number) {
    for (const k of this.flakes) {
      k.age += dt;
      if (k.float > 0) {
        k.float -= dt;
        k.x += Math.sin(this.t + k.age) * 3 * dt;
        continue;
      }
      const floor = floorY(k.x, k.z) - 1;
      if (k.y < floor) {
        k.y = Math.min(floor, k.y + 16 * dt);
        k.x += Math.sin(k.age * 2.3 + k.z * 10) * 9 * dt;
      }
    }
    this.flakes = this.flakes.filter((k) => !k.eaten && k.age < 40);
  }

  private stepBubbles(dt: number) {
    const r = this.rand;
    this.bubbleClock += dt;
    while (this.bubbleClock > 0.14) {
      this.bubbleClock -= 0.14;
      this.bubbles.push({
        x: OUTLET_X + (r() - 0.5) * 6,
        y: floorY(OUTLET_X, 0.12) - 8,
        z: 0.12,
        r: 1.2 + r() * 2.8,
        vy: -40 - r() * 30,
        phase: r() * 6.28,
      });
    }
    for (const b of this.bubbles) {
      b.vy -= 30 * dt;
      b.y += b.vy * dt;
      b.x += Math.sin(this.t * 6 + b.phase) * 10 * dt;
    }
    this.bubbles = this.bubbles.filter((b) => b.y > SURFACE + 2);
  }
}
