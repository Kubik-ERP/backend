#!/bin/sh
set -eu

APP_NAME="pos-backend"
VERSION="${1:-}"
USERNAME="abdurrahimi"
REGISTRY="ghcr.io"
IMAGE="$REGISTRY/$USERNAME/$APP_NAME"

# VALIDASI
if [ -z "$VERSION" ]; then
  echo "Usage: sh deploy.sh <version>"
  exit 1
fi
if [ -z "${GHCR_TOKEN:-}" ]; then
  echo "Error: GHCR_TOKEN environment variable is not set."
  exit 1
fi

# BUILD & PUSH
docker build -t "$IMAGE:$VERSION" -t "$IMAGE:latest" .
echo "$GHCR_TOKEN" | docker login "$REGISTRY" -u "$USERNAME" --password-stdin
docker push "$IMAGE:$VERSION"
docker push "$IMAGE:latest"

# GIT TAG
git tag -a "v$VERSION" -m "Release $VERSION"
git push origin "v$VERSION"

echo "=== Release $VERSION done ==="
