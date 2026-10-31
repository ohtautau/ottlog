#!/usr/bin/env bash
# Install Ubuntu-maintained Docker packages from signed distribution repositories.
set -euo pipefail
. /etc/os-release
if [[ "$ID" != ubuntu || "$VERSION_ID" != 24.04 || "$(dpkg --print-architecture)" != amd64 ]]; then
  printf '%s\n' 'Expected Ubuntu 24.04 amd64; inspect this host before provisioning.' >&2
  exit 1
fi
if command -v docker >/dev/null 2>&1; then
  docker version
  docker compose version
  exit 0
fi
# The upstream Docker apt endpoint fails TLS from this host. Preserve the source
# file prepared by this task, but keep it out of apt's active source list.
if [[ -f /etc/apt/sources.list.d/docker.sources ]] && grep -q '^URIs: https://download.docker.com/linux/ubuntu$' /etc/apt/sources.list.d/docker.sources; then
  mv /etc/apt/sources.list.d/docker.sources /etc/apt/sources.list.d/docker.sources.unavailable
fi
apt-get update -o Acquire::Retries=3
DEBIAN_FRONTEND=noninteractive apt-get install -y -o DPkg::Lock::Timeout=120 ca-certificates curl git python3 openssl docker.io docker-compose-v2 docker-buildx
systemctl enable --now docker
docker version
docker compose version
