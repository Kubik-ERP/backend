#!/bin/sh
set -eu

# ===== GIT TAG =====
echo "=== Creating git tag v$VERSION ==="
git tag -a "v$VERSION" -m "Release version $VERSION"
git push origin "v$VERSION"
