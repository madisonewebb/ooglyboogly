import * as THREE from 'three';
import { seeded } from '../rng';

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, size: number) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Bone: a pale, faintly mottled grain, mostly white so the body color shows through. */
export function grainTexture(): THREE.Texture {
  return canvasTexture(128, (g, n) => {
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, n, n);
    const rand = seeded(21);
    for (let i = 0; i < 26; i++) {
      const x = rand() * n;
      const y = rand() * n;
      const r = 14 + rand() * 30;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(150,120,70,${0.06 + rand() * 0.07})`);
      grad.addColorStop(1, 'rgba(150,120,70,0)');
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(110,85,50,${0.05 + rand() * 0.08})`;
      g.fillRect(rand() * n, rand() * n, 1 + rand(), 1 + rand());
    }
  });
}

/** Moonstone: light that is brightest in the middle of each face and fades toward the edges. */
export function glowTexture(): THREE.Texture {
  return canvasTexture(64, (g, n) => {
    const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n * 0.62);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.55, '#7C84A0');
    grad.addColorStop(1, '#1C2030');
    g.fillStyle = grad;
    g.fillRect(0, 0, n, n);
  });
}
