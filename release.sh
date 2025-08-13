#!/bin/sh
set -eu

# ===== CONFIG =====
APP_NAME="pos-backend" # nama aplikasi (docker service)
VERSION="${1:-}"       # versi image (misal 1.0.0)
USERNAME="abdurrahimi"
REGISTRY="ghcr.io"
IMAGE="$REGISTRY/$USERNAME/$APP_NAME"

# ===== VALIDASI =====
if [ -z "$VERSION" ]; then
    echo "Usage: sh release.sh <version>"
    exit 1
fi
if [ -z "${GHCR_TOKEN:-}" ]; then
    echo "Error: GHCR_TOKEN environment variable is not set."
    exit 1
fi

# ===== GIT TAG =====
echo "=== Creating git tag v$VERSION ==="
git tag -a "v$VERSION" -m "Release version $VERSION"
git push origin "v$VERSION"

# ===== BUILD & PUSH =====
echo "=== Login to GHCR ==="
echo "$GHCR_TOKEN" | docker login "$REGISTRY" -u "$USERNAME" --password-stdin

echo "=== Build Docker Image ($IMAGE:$VERSION) ==="
docker build -t "$IMAGE:$VERSION" -t "$IMAGE:latest" .

echo "=== Push to GHCR ==="
docker push "$IMAGE:$VERSION"
docker push "$IMAGE:latest"

echo "=== Done ==="