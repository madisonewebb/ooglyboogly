# Rollhouse

A private five-dice game for the family, played as a Discord Activity. Each player fills 1 to 5
scorecards at once. The server rolls every die (`crypto.randomInt`), and clients only send
intents.

> Status: milestone 1 (repo and pipeline). The app is a hello-world server and a placeholder page.

## Quick start

Requires Node (see `.nvmrc`), [pnpm](https://pnpm.io) (version pinned in `package.json`), and
[Task](https://taskfile.dev).

```sh
task install       # pnpm install for the whole workspace
task setup-hooks   # pre-commit runs `task lint` before each commit
task dev           # Tilt + docker-compose: server :8080, client :5173, live reload
```

Locally there's no Discord: open <http://localhost:5173/?table=test> in two browsers and sit down
with a name (`GUEST_LOGIN=true`, never set in staging or prod). The same `?table=` puts you at the
same table.

| Task             | Does                                                    |
| ---------------- | ------------------------------------------------------- |
| `task lint`      | ESLint and Prettier check                               |
| `task format`    | Auto-fix lint and formatting                            |
| `task typecheck` | `tsc` across all packages                               |
| `task test`      | Vitest, with coverage on the rules engine               |
| `task build`     | Production build of client and server                   |
| `task e2e`       | Playwright (Chromium + mobile WebKit) against the build |
| `task smoke`     | Post-deploy check: `/health` SHA, then a game WebSocket |
| `task manifests` | Render the kustomize overlays                           |

## Layout

```
apps/server      Node + Colyseus: /health, game rooms, serves the built client
apps/web         React + Vite client
packages/rules   Pure rules reducer (milestone 2)
packages/shared  Brand name, protocol names, shared types
e2e/             Playwright tests and the deploy smoke test
docker/          The single production image (server + client), uid/gid 1000
manifests/       kustomize base + staging/prod overlays
```

Fair dice: ESLint bans `Math.random` in `apps/server` and `packages/rules`.

## Branches and releases

- Feature branches open PRs into `develop`. `main` only receives merges from `develop`.
- Conventional commits (`feat:`, `fix:`, `ci:`, `chore:` …). release-please on `main` opens the
  release PR, bumps the version and writes `CHANGELOG.md`.
- After a release lands on `main`, `back-merge.yml` opens a `back-merge/main-<sha>` → `develop`
  PR so the branches don't drift. Merge it with a merge commit, not squash.
- Dependabot opens weekly PRs (npm, GitHub Actions, Docker) against `develop`.

## Deployment (GitOps)

| Branch    | Environment | Namespace           | URL                                          |
| --------- | ----------- | ------------------- | -------------------------------------------- |
| `develop` | staging     | `rollhouse-staging` | https://rollhouse-staging.castillocurios.com |
| `main`    | prod        | `rollhouse`         | https://rollhouse.castillocurios.com         |

On every push to `develop` or `main`, `.github/workflows/deploy.yml`:

1. Builds `ghcr.io/madisonewebb/rollhouse:<sha>` (linux/amd64) with the registry build cache.
2. Commits that tag to the private `home-lab` repo, in
   `argocd/applications/rollhouse-staging.yaml` or `rollhouse.yaml`
   (`spec.source.kustomize.images`). CI never commits to this repo.
3. ArgoCD syncs the overlay from this repo (public, over HTTPS) with that image.
4. Polls `/health` until it reports the new SHA (10-minute limit), then joins a game room over
   WebSocket.

The pod is pinned to `k3s-control-plane`. Its SQLite volume (`local-path`, 1Gi) is annotated so
ArgoCD never prunes or deletes it.

### Required GitHub secrets

| Secret           | What                                                                  |
| ---------------- | --------------------------------------------------------------------- |
| `HOME_LAB_TOKEN` | Fine-grained PAT, Contents read/write on `madisonewebb/home-lab` only |

The image is pushed with the workflow's `GITHUB_TOKEN`. The GHCR package must be public.

### Configured outside Git

Nginx Proxy Manager proxy hosts (both with Websockets Support on and a Let's Encrypt cert):

| Host                                   | Forward to                                                |
| -------------------------------------- | --------------------------------------------------------- |
| `rollhouse.castillocurios.com`         | `http://rollhouse.rollhouse.svc.cluster.local:80`         |
| `rollhouse-staging.castillocurios.com` | `http://rollhouse.rollhouse-staging.svc.cluster.local:80` |

Advanced config on both, so idle game connections stay open:

```nginx
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```

DNS: A records for `rollhouse` and `rollhouse-staging` at Namecheap.

## Renaming

The name and domain are each set in one place:

| What                 | Where                                              |
| -------------------- | -------------------------------------------------- |
| Brand name           | `packages/shared/src/brand.ts`                     |
| Public URL (per env) | `manifests/overlays/<env>/config.env` (`BASE_URL`) |
| Proxy hosts, DNS     | Nginx Proxy Manager and Namecheap (see above)      |
| Discord URL mapping  | Discord Developer Portal (see Discord below)       |

## Discord

Each environment has its own Discord app, owned by a Developer Team: **Rollhouse** (prod) and
**Rollhouse Dev** (staging). Until the Activity is released, only team members can launch it, so family
players join the team as read-only members (Discord requires 2FA for that). Every player also
needs **Developer Mode** on (User Settings → Advanced) to see the unreleased Activity in the App
Launcher.

Per app, in the [Developer Portal](https://discord.com/developers/applications):

- **Installation:** User Install and Guild Install.
- **OAuth2 → Redirects:** `https://127.0.0.1` (a placeholder; Activities don't redirect).
- **Activities → Settings:** Enable Activities.
- **Activities → URL Mappings** (required before Activities can be enabled): `/discord-cdn` → `cdn.discordapp.com` (avatars), then `/` → the
  environment's host (`rollhouse-staging.castillocurios.com` or `rollhouse.castillocurios.com`).
  Everything else (page, `/api`, the game WebSocket) is same-origin under `/`.

The client ID is public and lives in `manifests/overlays/<env>/config.env` (`DISCORD_CLIENT_ID`).
The client secret is sealed into `manifests/overlays/<env>/app-sealedsecret.yaml` next to
`SESSION_SECRET`. To set or rotate it, run this from the repo root. It asks for the secret without
echoing it, so it never lands in your shell history or on disk:

```sh
scripts/seal-discord-secret.sh staging   # or prod
```

## Secrets

This repo is public. Never commit tokens, kubeconfigs, `.env` files or Discord secrets. Runtime
secrets are committed only as Sealed Secrets, which only the cluster can decrypt.

## Backups

Litestream 0.5.18 runs as a native sidecar and copies every change to `/data/rollhouse.db` to
castillo-nas over SFTP within about a second, keeping 14 days (`manifests/base/litestream.yml`).
An init container restores from the NAS when the volume has no database and a backup exists.

| Environment | Replica on the NAS                        |
| ----------- | ----------------------------------------- |
| staging     | `/volume1/backups/rollhouse/data/staging` |
| prod        | `/volume1/backups/rollhouse/data/prod`    |

The SSH private key is committed only as a SealedSecret per namespace
(`manifests/overlays/<env>/litestream-sealedsecret.yaml`). The NAS host key is pinned in
`litestream.yml`. It has to be the ECDSA key, because Litestream's SSH client always negotiates
ECDSA first.

### NAS side (set up by hand, outside Git)

- System user `rollhouse-backup` (UID below 1000, so it can't collide with UGOS users), shell
  `nologin`, no password.
- `/volume1/backups/rollhouse` is owned by root (the chroot), and `data/{prod,staging}` is owned by
  the user.
- `/etc/ssh/rollhouse-backup/authorized_keys`: the key, limited to `from="10.0.0.3,10.42.0.0/16"`
  with `restrict`.
- `/etc/ssh/sshd_config.d/rollhouse-sftp.conf`: `Match User rollhouse-backup` → chroot,
  `ForceCommand internal-sftp`, no passwords or forwarding.

**UGOS may delete that drop-in when SSH settings change in its UI.** If that happens, the
`litestream` container logs SFTP errors and backups stop; the live database is unaffected. Restore
the file and run `systemctl reload ssh`.

### Rotating the key

Generate a new ed25519 key and put the public half in `authorized_keys`. Then re-seal it for both
namespaces:

```sh
kubectl create secret generic rollhouse-litestream -n <namespace> \
  --from-file=id_ed25519=<key> --dry-run=client -o yaml \
  | kubeseal --kubeconfig /etc/rancher/k3s/k3s.yaml \
      --controller-namespace kube-system --controller-name sealed-secrets-controller \
      --format yaml > manifests/overlays/<env>/litestream-sealedsecret.yaml
```

## License

[MIT](LICENSE)
