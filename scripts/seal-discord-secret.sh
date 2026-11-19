#!/usr/bin/env bash
# Seals a Discord client secret into manifests/overlays/<env>/app-sealedsecret.yaml,
# next to SESSION_SECRET. The secret is read without echoing, so it never lands
# in shell history, on disk or in the process list.
#
# Usage: scripts/seal-discord-secret.sh staging|prod
set -euo pipefail

case "${1:-}" in
  staging) ns=rollhouse-staging app='Rollhouse Dev' ;;
  prod) ns=rollhouse app='Rollhouse' ;;
  *)
    echo "usage: $0 staging|prod" >&2
    exit 2
    ;;
esac
env=$1

cd "$(dirname "$0")/.."
target="manifests/overlays/$env/app-sealedsecret.yaml"
[[ -f $target ]] || { echo "missing $target" >&2; exit 1; }

read -rsp "Client secret for $app ($env): " secret
echo
[[ -n $secret ]] || { echo "no secret entered, nothing changed" >&2; exit 1; }

printf 'DISCORD_CLIENT_SECRET=%s\n' "$secret" \
  | kubectl create secret generic rollhouse-app -n "$ns" --from-env-file=/dev/stdin \
      --dry-run=client -o yaml \
  | kubeseal --kubeconfig /etc/rancher/k3s/k3s.yaml \
      --controller-namespace kube-system --controller-name sealed-secrets-controller \
      --format yaml --merge-into "$target"
unset secret

echo "Sealed DISCORD_CLIENT_SECRET into $target"
