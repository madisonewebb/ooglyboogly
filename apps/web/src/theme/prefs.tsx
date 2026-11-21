import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { type ThemeName, themeCss } from './palette';

export type ThemePref = 'system' | ThemeName;
export type TextSize = 'regular' | 'large' | 'xl';

export interface Prefs {
  theme: ThemePref;
  textSize: TextSize;
  /** Rolls play at about half length. */
  fastRolls: boolean;
  /** 0 (muted) to 1. */
  volume: number;
}

export const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  textSize: 'regular',
  fastRolls: false,
  volume: 0.8,
};

/** Root font size per text size; everything is sized in rem from here. */
export const TEXT_SCALE: Record<TextSize, string> = {
  regular: '100%',
  large: '118%',
  xl: '136%',
};

const KEY = 'rollhouse:prefs';

/** Preferences live on this device. localStorage can throw in a locked-down frame. */
export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Prefs> & { sound?: boolean };
      // Before the volume slider, sound was on or off.
      if (saved.volume === undefined && saved.sound === false) saved.volume = 0;
      delete saved.sound;
      return { ...DEFAULT_PREFS, ...saved };
    }
  } catch {
    /* fall through to the defaults */
  }
  return DEFAULT_PREFS;
}

function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* the setting still applies until reload */
  }
}

const darkQuery = () =>
  typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
const motionQuery = () =>
  typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

function useMedia(query: () => MediaQueryList | null): boolean {
  const [match, setMatch] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const q = query();
    if (!q) return;
    const on = () => setMatch(q.matches);
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** Puts the generated theme variables in the page once. */
export function installThemeCss() {
  const style = document.createElement('style');
  style.dataset['rollhouse'] = 'theme';
  style.textContent = themeCss();
  document.head.prepend(style);
}

interface PrefsContext {
  prefs: Prefs;
  set(change: Partial<Prefs>): void;
  /** The theme actually shown. */
  theme: ThemeName;
  reducedMotion: boolean;
}

const Ctx = createContext<PrefsContext | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState(loadPrefs);
  const systemDark = useMedia(darkQuery);
  const reducedMotion = useMedia(motionQuery);
  const theme: ThemeName = prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme;

  useEffect(() => {
    const html = document.documentElement;
    html.dataset['theme'] = theme;
    html.style.fontSize = TEXT_SCALE[prefs.textSize];
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        'content',
        getComputedStyle(html).getPropertyValue('--band').trim() || '#2A2440',
      );
  }, [theme, prefs.textSize]);

  const value = useMemo<PrefsContext>(
    () => ({
      prefs,
      theme,
      reducedMotion,
      set: (change) =>
        setPrefs((p) => {
          const next = { ...p, ...change };
          savePrefs(next);
          return next;
        }),
    }),
    [prefs, theme, reducedMotion],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): PrefsContext {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePrefs outside PrefsProvider');
  return c;
}
