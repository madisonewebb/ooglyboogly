import { avatarUrl, type FlavorId, type SessionUser } from '@rollhouse/shared';
import { flavorVars } from './flavor';
import { usePrefs } from './theme/prefs';

/** An avatar ringed in the player's candy flavor, always with their initial so color isn't the only cue. */
export function Avatar({
  user,
  cdnBase,
  flavor,
}: {
  user: SessionUser;
  cdnBase: string;
  flavor?: FlavorId | undefined;
}) {
  const { theme } = usePrefs();
  const src = avatarUrl(user, cdnBase);
  const initial = user.name.slice(0, 1).toUpperCase();
  return (
    <span className="avatar" style={flavorVars(flavor, theme)} aria-hidden="true">
      {src ? <img src={src} alt="" width={40} height={40} /> : <span className="avatar-face" />}
      <span className="initial">{initial}</span>
    </span>
  );
}
