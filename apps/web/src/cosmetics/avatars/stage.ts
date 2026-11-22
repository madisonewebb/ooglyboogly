/**
 * The one WebGL renderer behind every avatar on screen. Each avatar is a plain 2D canvas; this
 * stage draws its rig into a single hidden WebGL canvas, then copies the picture over. So a table
 * of eight players costs one GL context, not eight, and one animation loop.
 *
 * The loop stops by itself when nothing moves (reduced motion, or nobody on screen), and it drops
 * to a capped frame rate otherwise. If WebGL cannot start, or the context is lost, every avatar
 * is told, and the page falls back to the flat avatar.
 */
import * as THREE from 'three';
import { clockNow, type MoodCue, type Pose, poseAt } from './animation';
import { type AvatarLook, lookKey } from './items';
import { buildRig, type Rig } from './model';

/** Frames per second while anything is animating. */
const FPS = 30;
/** The hidden canvas is never bigger than this, however large an avatar is asked for. */
const MAX_PX = 256;
/** What the camera sees: x from -1 to 1, y from -0.12 to 1.88, so auras and hats have room. */
const VIEW = { left: -1, right: 1, bottom: -0.12, top: 1.88 };

export interface AvatarHandle {
  /** Changes what the avatar wears or the tint, rebuilding it. */
  setLook(look: AvatarLook, tintHex: string): void;
  /** Starts (or restarts) a mood. */
  setCue(cue: MoodCue | null): void;
  /** Reduced motion holds the rest pose and draws only when something changes. */
  setReduced(reduced: boolean): void;
  remove(): void;
}

interface Entry {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  seed: number;
  rig: Rig | null;
  key: string;
  cue: MoodCue | null;
  reduced: boolean;
  dirty: boolean;
}

class Stage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(
    VIEW.left,
    VIEW.right,
    VIEW.top,
    VIEW.bottom,
    0.1,
    20,
  );
  private entries = new Set<Entry>();
  private raf = 0;
  private last = 0;
  private px = 0;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  failed = false;
  onFail = new Set<() => void>();

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.fail();
    });
    this.camera.position.set(0, 0.8, 6);
    this.camera.lookAt(0, 0.8, 0);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#cfc4ee', 1.8));
    const key = new THREE.DirectionalLight('#ffffff', 1.7);
    key.position.set(-2, 3, 4);
    this.scene.add(key);
  }

  add(canvas: HTMLCanvasElement, seed: number): AvatarHandle | null {
    const ctx = canvas.getContext('2d');
    if (!ctx || this.failed) return null;
    clearTimeout(this.idleTimer);
    const entry: Entry = {
      canvas,
      ctx,
      seed,
      rig: null,
      key: '',
      cue: null,
      reduced: false,
      dirty: true,
    };
    this.entries.add(entry);
    this.wake();
    return {
      setLook: (look, tintHex) => {
        const key = `${lookKey(look)}@${tintHex}`;
        if (key === entry.key) return;
        if (entry.rig) this.drop(entry.rig);
        entry.rig = buildRig(look, tintHex);
        entry.rig.root.visible = false;
        this.scene.add(entry.rig.root);
        entry.key = key;
        entry.dirty = true;
        this.wake();
      },
      setCue: (cue) => {
        entry.cue = cue;
        entry.dirty = true;
        this.wake();
      },
      setReduced: (reduced) => {
        entry.reduced = reduced;
        entry.dirty = true;
        this.wake();
      },
      remove: () => {
        if (entry.rig) this.drop(entry.rig);
        this.entries.delete(entry);
        if (this.entries.size === 0) {
          // Strict-mode remounts and quick screen changes come back within moments.
          this.idleTimer = setTimeout(() => stageGone(this), 2000);
        }
      },
    };
  }

  private drop(rig: Rig) {
    this.scene.remove(rig.root);
    rig.dispose();
  }

  private fail() {
    this.failed = true;
    broken = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    for (const f of this.onFail) f();
  }

  private wake() {
    if (this.raf === 0 && !this.failed) this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (ms: number) => {
    this.raf = 0;
    if (this.failed) return;
    if (document.hidden) {
      this.raf = requestAnimationFrame(this.frame);
      return;
    }
    if (ms - this.last < 1000 / FPS - 2) {
      this.raf = requestAnimationFrame(this.frame);
      return;
    }
    this.last = ms;
    const t = clockNow();
    let moving = false;
    try {
      for (const e of this.entries) {
        if (!e.rig || !e.canvas.isConnected) continue;
        if (e.reduced && !e.dirty) continue;
        this.draw(e, t, poseAt(t, e.seed, e.cue, e.reduced));
        e.dirty = false;
        moving ||= !e.reduced;
      }
    } catch {
      this.fail();
      return;
    }
    if (moving || [...this.entries].some((e) => e.dirty)) {
      this.raf = requestAnimationFrame(this.frame);
    }
  };

  private draw(e: Entry, t: number, pose: Pose) {
    const { canvas, rig } = e;
    if (!rig) return;
    const px = Math.min(MAX_PX, Math.max(canvas.width, canvas.height));
    if (px !== this.px) {
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(px, px, false);
      this.px = px;
    }
    for (const o of this.entries) if (o.rig) o.rig.root.visible = o === e;
    rig.update(t, pose);
    this.renderer.render(this.scene, this.camera);
    e.ctx.clearRect(0, 0, canvas.width, canvas.height);
    e.ctx.drawImage(this.renderer.domElement, 0, 0, canvas.width, canvas.height);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

let stage: Stage | null = null;
let broken = false;

function stageGone(s: Stage) {
  if (stage === s) stage = null;
  s.dispose();
}

/**
 * Puts an avatar on the shared stage, or returns null when WebGL will not start (the caller then
 * shows the flat avatar). `onFail` is called later if the context is lost.
 */
export function addAvatar(
  canvas: HTMLCanvasElement,
  seed: number,
  onFail: () => void,
): AvatarHandle | null {
  if (broken) return null;
  try {
    stage ??= new Stage();
    const handle = stage.add(canvas, seed);
    if (!handle) return null;
    const s = stage;
    s.onFail.add(onFail);
    return {
      ...handle,
      remove: () => {
        s.onFail.delete(onFail);
        handle.remove();
      },
    };
  } catch {
    broken = true;
    stage = null;
    return null;
  }
}
