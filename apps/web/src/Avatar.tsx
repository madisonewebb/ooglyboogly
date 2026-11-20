import { avatarUrl, type TintId, type SessionUser } from '@rollhouse/shared';
import { tintVars } from './tint';
import { usePrefs } from './theme/prefs';

/** An avatar ringed in the player's tint, always with their initial so color isn't the only cue. */
export function Avatar({
  user,
  cdnBase,
  tint,
}: {
  user: SessionUser;
  cdnBase: string;
  tint?: TintId | undefined;
}) {
  const { theme } = usePrefs();
  const src = avatarUrl(user, cdnBase);
  const initial = user.name.slice(0, 1).toUpperCase();
  return (
    <span className="avatar" style={tintVars(tint, theme)} aria-hidden="true">
      {src ? <img src={src} alt="" width={40} height={40} /> : <span className="avatar-face" />}
      <span className="initial">{initial}</span>
    </span>
  );
}
