import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { MoonIcon, SlidersIcon, SoundIcon, SunIcon } from './icons';
import { setVolume } from './sound';
import { POP_IN } from './theme/motion';
import { type TextSize, usePrefs } from './theme/prefs';

const SIZES: { value: TextSize; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'large', label: 'Large' },
  { value: 'xl', label: 'Extra large' },
];

/** The corner controls on every screen: Light/Dark, sound, and a small settings panel. */
export function Corner() {
  const { prefs, set, theme } = usePrefs();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const lastVolume = useRef(prefs.volume > 0 ? prefs.volume : 0.8);

  useEffect(() => setVolume(prefs.volume), [prefs.volume]);
  useEffect(() => {
    if (prefs.volume > 0) lastVolume.current = prefs.volume;
  }, [prefs.volume]);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggle.current?.focus();
    };
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !toggle.current?.contains(t)) setOpen(false);
    };
    addEventListener('keydown', close);
    addEventListener('pointerdown', outside);
    panel.current?.querySelector('button')?.focus();
    return () => {
      removeEventListener('keydown', close);
      removeEventListener('pointerdown', outside);
    };
  }, [open]);

  const next = theme === 'dark' ? 'light' : 'dark';
  const muted = prefs.volume === 0;
  return (
    <div className="corner">
      <button
        type="button"
        className="icon"
        aria-label={`Switch to ${next} mode`}
        title={`Switch to ${next} mode`}
        onClick={() => set({ theme: next })}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>
      <button
        type="button"
        className="icon"
        aria-label={muted ? 'Turn sound on' : 'Mute sound'}
        title={muted ? 'Turn sound on' : 'Mute sound'}
        aria-pressed={muted}
        onClick={() => set({ volume: muted ? lastVolume.current : 0 })}
      >
        <SoundIcon muted={muted} />
      </button>
      <button
        ref={toggle}
        type="button"
        className="icon"
        aria-label="Settings"
        title="Settings"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <SlidersIcon />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            key="settings"
            className="settings panel"
            ref={panel}
            role="dialog"
            aria-label="Settings"
            style={{ transformOrigin: 'top right' }}
            {...POP_IN}
          >
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
            <label className="slider">
              <span>Volume</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(prefs.volume * 100)}
                onChange={(e) => set({ volume: Number(e.target.value) / 100 })}
              />
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={prefs.fastRolls}
                onChange={(e) => set({ fastRolls: e.target.checked })}
              />
              Fast rolls
            </label>
            <p className="quiet small">
              Click the tray to skip a roll. Keys: Space rolls, 1 to 5 hold dice, Enter writes in.
              Reduced motion follows your device.
            </p>
            <button type="button" onClick={() => setOpen(false)}>
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
