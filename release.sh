#!/bin/bash
set -euo pipefail

# ===== CONFIG =====
APP_NAME="pos-backend" # nama aplikasi (docker service)
VERSION=${1:-}        # versi image (misal 1.0.0)
USERNAME="abdurrahimi"
SERVER="deploy@srv944722.hstgr.cloud" # SSH ke server lu
STACK_NAME="kubik"
SERVICE_NAME="${STACK_NAME}_${APP_NAME}"
REGISTRY="ghcr.io"
IMAGE="$REGISTRY/$USERNAME/$APP_NAME"

# ===== VALIDASI =====
if [[ -z "$VERSION" ]]; then
    echo "Usage: ./release.sh <version>"
    exit 1
fi
if [[ -z "${GHCR_TOKEN:-}" ]]; then
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

# ===== DEPLOY KE SERVER =====
echo "=== Updating service on server: $SERVICE_NAME ==="
ssh "$SERVER" "
    echo \"$GHCR_TOKEN\" | docker login $REGISTRY -u $USERNAME --password-stdin &&
    docker service update --image $IMAGE:$VERSION --with-registry-auth $SERVICE_NAME
"

echo "=== Done ==="