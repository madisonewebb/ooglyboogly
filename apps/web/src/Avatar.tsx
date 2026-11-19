import { avatarUrl, type SessionUser } from '@rollhouse/shared';

export function Avatar({ user, cdnBase }: { user: SessionUser; cdnBase: string }) {
  const src = avatarUrl(user, cdnBase);
  return src ? (
    <img className="avatar" src={src} alt="" width={40} height={40} />
  ) : (
    <span className="avatar avatar-initial" aria-hidden="true">
      {user.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
