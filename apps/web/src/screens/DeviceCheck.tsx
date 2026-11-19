import { useState } from 'react';

type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };

/**
 * The M3 early check: does vibration and device motion work inside Discord
 * on each phone? Shake-to-roll ships only if motion does.
 */
export function DeviceCheck() {
  const [vibration, setVibration] = useState('not tried');
  const [motion, setMotion] = useState('not tried');

  const testVibration = () => {
    if (typeof navigator.vibrate !== 'function') return setVibration('not supported here');
    const ok = navigator.vibrate([80, 60, 80]);
    setVibration(ok ? 'sent: did you feel it?' : 'blocked');
  };

  const testMotion = async () => {
    if (typeof DeviceMotionEvent === 'undefined') return setMotion('not supported here');
    const ctor = DeviceMotionEvent as unknown as MotionPermission;
    if (typeof ctor.requestPermission === 'function') {
      try {
        if ((await ctor.requestPermission()) !== 'granted') return setMotion('permission denied');
      } catch (err) {
        return setMotion(`permission request failed: ${String(err)}`);
      }
    }
    setMotion('listening: shake the phone…');
    let peak = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      peak = Math.max(peak, Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0));
    };
    window.addEventListener('devicemotion', onMotion);
    setTimeout(() => {
      window.removeEventListener('devicemotion', onMotion);
      setMotion(peak === 0 ? 'no motion events arrived' : `works: peak ${peak.toFixed(1)} m/s²`);
    }, 4000);
  };

  return (
    <details className="panel">
      <summary>Device check</summary>
      <p className="quiet">Try these inside Discord on each phone and tell Madi what they say.</p>
      <div className="row">
        <button type="button" onClick={testVibration}>
          Test vibration
        </button>
        <span data-testid="vibration-result">{vibration}</span>
      </div>
      <div className="row">
        <button type="button" onClick={() => void testMotion()}>
          Test motion
        </button>
        <span data-testid="motion-result">{motion}</span>
      </div>
      <p className="quiet">Version {__APP_VERSION__}</p>
    </details>
  );
}
