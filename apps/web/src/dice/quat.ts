/** Minimal quaternion math ([x, y, z, w]), kept free of three.js so it can be unit tested. */
export type Quat = [number, number, number, number];
export type Vec3 = [number, number, number];

export const IDENTITY: Quat = [0, 0, 0, 1];

export function mul(a: ArrayLike<number>, b: ArrayLike<number>): Quat {
  const [ax, ay, az, aw] = [a[0]!, a[1]!, a[2]!, a[3]!];
  const [bx, by, bz, bw] = [b[0]!, b[1]!, b[2]!, b[3]!];
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function fromAxisAngle(axis: Vec3, angle: number): Quat {
  const s = Math.sin(angle / 2);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
}

export function normalize(q: Quat): Quat {
  const n = Math.hypot(...q) || 1;
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

/** The shortest rotation taking unit vector a to unit vector b. */
export function fromUnitVectors(a: ArrayLike<number>, b: ArrayLike<number>): Quat {
  const [ax, ay, az] = [a[0]!, a[1]!, a[2]!];
  const [bx, by, bz] = [b[0]!, b[1]!, b[2]!];
  const dot = ax * bx + ay * by + az * bz;
  if (dot < -0.999999) {
    // Opposite: turn half way round any axis perpendicular to a.
    const axis: Vec3 = Math.abs(ax) > 0.9 ? [0, 1, 0] : [1, 0, 0];
    const c: Vec3 = [
      ay * axis[2] - az * axis[1],
      az * axis[0] - ax * axis[2],
      ax * axis[1] - ay * axis[0],
    ];
    const n = Math.hypot(...c);
    return fromAxisAngle([c[0] / n, c[1] / n, c[2] / n], Math.PI);
  }
  return normalize([ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx, 1 + dot]);
}

export const dot4 = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]! + a[3]! * b[3]!;

export function slerp(a: ArrayLike<number>, b: ArrayLike<number>, t: number): Quat {
  let [bx, by, bz, bw] = [b[0]!, b[1]!, b[2]!, b[3]!];
  let cos = dot4(a, b);
  if (cos < 0) {
    [bx, by, bz, bw] = [-bx, -by, -bz, -bw];
    cos = -cos;
  }
  const [ax, ay, az, aw] = [a[0]!, a[1]!, a[2]!, a[3]!];
  if (cos > 0.9995) {
    return normalize([
      ax + (bx - ax) * t,
      ay + (by - ay) * t,
      az + (bz - az) * t,
      aw + (bw - aw) * t,
    ]);
  }
  const theta = Math.acos(cos);
  const s = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / s;
  const wb = Math.sin(t * theta) / s;
  return [ax * wa + bx * wb, ay * wa + by * wb, az * wa + bz * wb, aw * wa + bw * wb];
}

export const lerp3 = (a: ArrayLike<number>, b: ArrayLike<number>, t: number): Vec3 =>
  t >= 1
    ? [b[0]!, b[1]!, b[2]!]
    : [a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t, a[2]! + (b[2]! - a[2]!) * t];
