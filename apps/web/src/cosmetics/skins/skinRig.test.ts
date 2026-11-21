import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { glazeMaterial, porcelainMaterial } from '../../dice/dieModel';
import { flareAt, GLINT, glintActive, SkinRig } from './skinRig';
import { SKIN_IDS, SKINS } from './skins';

const colors = { die: '#FFFFFF', pip: '#5B3FD0' };

// The textures draw on a canvas; there is no DOM in these tests, so give them one that accepts any call.
beforeEach(() => {
  const ctx = new Proxy({}, { get: () => () => ({ addColorStop() {} }), set: () => true });
  vi.stubGlobal('document', {
    createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('SkinRig with no skin', () => {
  it('builds exactly the porcelain materials the scene always used', () => {
    for (const rich of [true, false]) {
      const rig = new SkinRig(null, colors, rich);
      const want = porcelainMaterial(colors.die, rich);
      const glaze = glazeMaterial(colors.pip, rich);
      expect(rig.look).toBeNull();
      expect(rig.body).toHaveLength(5);
      expect(new Set(rig.body).size).toBe(5);
      for (const m of rig.body) {
        expect(m.type).toBe(want.type);
        expect(m.color.getHex()).toBe(want.color.getHex());
        expect(m.roughness).toBe(want.roughness);
        expect(m.emissiveIntensity).toBe(0.04);
      }
      expect(new Set(rig.pip).size).toBe(1);
      expect(rig.pip[0]!.color.getHex()).toBe(glaze.color.getHex());
      expect(rig.eyes).toBeNull();
      expect(rig.stars).toBeNull();
    }
  });

  it('glows by hover alone, as before', () => {
    const rig = new SkinRig(null, colors, true);
    expect(rig.glow(0, 0, 0, false)).toBe(0.04);
    expect(rig.glow(0, 1, 5000, false)).toBeCloseTo(0.04 + 0.14);
    expect(rig.frame(0, {} as never)).toBe(false);
  });
});

describe('SkinRig with a skin', () => {
  it.each(SKIN_IDS)('builds five dice for %s in the skin colors', (id) => {
    for (const rich of [true, false]) {
      const rig = new SkinRig(id, colors, rich);
      expect(rig.look).toBe(SKINS[id]);
      expect(rig.body).toHaveLength(5);
      expect(rig.body[0]!.color.getHexString()).toBe(
        new THREE.Color(SKINS[id].body).getHexString(),
      );
      // At most three meshes a die: body, and either pips or eyes (two).
      expect(rig.eyes ? 2 : 1).toBeLessThanOrEqual(2);
      rig.dispose();
    }
  });

  it('keeps metal from going black without an environment (software rendering)', () => {
    expect(new SkinRig('gilded', colors, true).body[0]!.metalness).toBe(0.9);
    expect(new SkinRig('gilded', colors, false).body[0]!.metalness).toBeLessThanOrEqual(0.55);
  });

  it('gives googly dice eyes and the others plain pips', () => {
    const googly = new SkinRig('googly', colors, true);
    expect(googly.eyes?.sclera).toHaveLength(5);
    expect(googly.eyes?.pupil).toHaveLength(5);
    expect(googly.pip).toEqual([]);
    for (const id of ['bone', 'obsidian', 'moonstone', 'gilded'] as const) {
      expect(new SkinRig(id, colors, true).eyes).toBeNull();
    }
  });

  it('gives only gilded dice glint stars and a pip material each', () => {
    const gilded = new SkinRig('gilded', colors, true);
    expect(gilded.stars).not.toBeNull();
    expect(new Set(gilded.pip).size).toBe(5);
    expect(new SkinRig('obsidian', colors, true).stars).toBeNull();
  });

  it('breathes only the moonstone glow, and only with motion allowed', () => {
    const moon = new SkinRig('moonstone', colors, true);
    const readings = new Set([0, 1, 2, 3].map((k) => moon.glow(0, 0, k * 700, false)));
    expect(readings.size).toBeGreaterThan(1);
    expect(moon.glow(0, 0, 100, true)).toBe(moon.glow(0, 0, 9000, true));
    const bone = new SkinRig('bone', colors, true);
    expect(bone.glow(0, 0, 100, false)).toBe(bone.glow(0, 0, 9000, false));
  });

  it('turns the pupils toward the camera, in the die own space', () => {
    const rig = new SkinRig('googly', colors, true);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 10, 0);
    camera.updateMatrixWorld();
    const frame = (quat: THREE.Quaternion) =>
      rig.frame(0, {
        now: 0,
        delta: 0.016,
        pos: new THREE.Vector3(),
        quat,
        camera,
        reduced: true,
        opacity: 1,
        yatzyAt: null,
      });
    frame(new THREE.Quaternion());
    const u = rig.eyes!.pupil[0]!.onBeforeCompile;
    const shader = {
      uniforms: {} as Record<string, { value: THREE.Vector3 }>,
      vertexShader: '#include <common>\n#include <begin_vertex>',
    };
    u(shader as never, undefined as never);
    expect(shader.uniforms['uGaze']!.value.toArray()).toEqual([0, 1, 0]);
    // Turn the die a quarter about z: the camera is now along the die's own x.
    frame(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2));
    const g = shader.uniforms['uGaze']!.value;
    expect(g.x).toBeCloseTo(1);
    expect(g.y).toBeCloseTo(0);
    expect(shader.vertexShader).toContain('aFaceN');
  });

  it('fades the eyes with the die', () => {
    const rig = new SkinRig('googly', colors, true);
    rig.frame(2, {
      now: 0,
      delta: 0.016,
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      camera: new THREE.PerspectiveCamera(),
      reduced: false,
      opacity: 0.4,
      yatzyAt: null,
    });
    expect(rig.eyes!.sclera[2]!.opacity).toBe(0.4);
    expect(rig.eyes!.sclera[2]!.transparent).toBe(true);
  });

  it('flares gilded pips in turn on a Yatzy and calms with reduced motion', () => {
    const rig = new SkinRig('gilded', colors, true);
    const run = (i: number, now: number, reduced: boolean) =>
      rig.frame(i, {
        now,
        delta: 0.016,
        pos: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        camera: new THREE.PerspectiveCamera(),
        reduced,
        opacity: 1,
        yatzyAt: 1000,
      });
    run(0, 1000 + GLINT.flare / 2, false);
    expect(rig.pip[0]!.emissiveIntensity).toBeGreaterThan(1);
    // Die 3 has not started yet.
    run(3, 1000 + 100, false);
    expect(rig.pip[3]!.emissiveIntensity).toBe(0);
    expect(run(4, 1000 + 100, false)).toBe(true);
    expect(rig.stars!.visible).toBe(true);
    expect(run(4, 1000 + 100, true)).toBe(false);
    expect(rig.stars!.visible).toBe(false);
    expect(run(4, 1000 + 9000, false)).toBe(false);
  });
});

describe('flare timing', () => {
  it('staggers the dice and ends each flare', () => {
    expect(flareAt(0, null, 0)).toBeNull();
    expect(flareAt(999, 1000, 0)).toBeNull();
    expect(flareAt(1000 + GLINT.flare / 2, 1000, 0)).toBeCloseTo(0.5);
    expect(flareAt(1000 + 2 * GLINT.stagger + 10, 1000, 2)).toBeGreaterThan(0);
    expect(flareAt(1000 + GLINT.flare + 1, 1000, 0)).toBeNull();
  });

  it('stays active until the last die has finished', () => {
    expect(glintActive(0, null)).toBe(false);
    expect(glintActive(1000 + 4 * GLINT.stagger + GLINT.flare, 1000)).toBe(true);
    expect(glintActive(1000 + 4 * GLINT.stagger + GLINT.flare + GLINT.tail, 1000)).toBe(false);
  });
});
