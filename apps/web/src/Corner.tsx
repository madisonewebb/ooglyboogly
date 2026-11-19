import { useEffect, useRef, useState } from 'react';
import { setSoundEnabled } from './sound';
import { type TextSize, usePrefs } from './theme/prefs';

const SIZES: { value: TextSize; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'large', label: 'Large' },
  { value: 'xl', label: 'Extra large' },
];

/** The corner controls on every screen: Light/Dark, and a small settings panel. */
export function Corner() {
  const { prefs, set, theme } = usePrefs();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => setSoundEnabled(prefs.sound), [prefs.sound]);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('keydown', close);
    panel.current?.querySelector('button')?.focus();
    return () => removeEventListener('keydown', close);
  }, [open]);

  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <div className="corner">
      <button
        type="button"
        className="icon"
        aria-label={`Switch to ${next} mode`}
        title={`Switch to ${next} mode`}
        onClick={() => set({ theme: next })}
      >
        <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
      </button>
      <button
        type="button"
        className="icon"
        aria-label="Settings"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">⚙</span>
      </button>
      {open && (
        <div className="settings panel" ref={panel} role="dialog" aria-label="Settings">
          <fieldset className="choice">
            <legend>Text size</legend>
            <div className="segmented">
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={prefs.textSize === s.value}
                  onClick={() => set({ textSize: s.value })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="toggle">
            <input
              type="checkbox"
              checked={prefs.fastRolls}
              onChange={(e) => set({ fastRolls: e.target.checked })}
            />
            Fast rolls
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={prefs.sound}
              onChange={(e) => set({ sound: e.target.checked })}
            />
            Sound
          </label>
          <p className="quiet small">
            Tap the tray to skip a roll. Reduced motion follows your device.
          </p>
          <button type="button" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}
