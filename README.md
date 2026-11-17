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
| Discord URL mapping  | Discord Developer Portal (milestone 3)             |

## Secrets

This repo is public. Never commit tokens, kubeconfigs, `.env` files or Discord secrets. Runtime
secrets will be committed only as Sealed Secrets, which only the cluster can decrypt.

## Backups

Not yet enabled. Litestream (≥ 0.5.2) will replicate SQLite to the NAS over SFTP; see the TODO in
`manifests/base/kustomization.yaml`.
