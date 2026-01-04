#!/bin/bash

set -e

print_help() {
    cat <<EOF
Usage: $0 VERSION [OPTIONS]

Deploy Denser services using Docker Compose.

Arguments:
  VERSION                   Image version/tag to deploy (required)

Options:
  --blog-env=PATH           Path to blog .env file (default: \$HOME/denser/.env.blog)
  --wallet-env=PATH         Path to wallet .env file (default: \$HOME/denser/.env.wallet)
  --pull                    Force pull images from registry (default: use local if available)
  --help                    Show this help

Examples:
  $0 5e8618a0                    # Uses local images if available
  $0 5e8618a0 --pull             # Force pull from registry
EOF
}

VERSION=""
BLOG_ENV_FILE=""
WALLET_ENV_FILE=""
FORCE_PULL=false

while [ $# -gt 0 ]; do
    case "$1" in
        --blog-env=*)
            BLOG_ENV_FILE="${1#*=}"
            ;;
        --wallet-env=*)
            WALLET_ENV_FILE="${1#*=}"
            ;;
        --pull)
            FORCE_PULL=true
            ;;
        --help|-h)
            print_help
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            print_help
            exit 1
            ;;
        *)
            if [ -z "$VERSION" ]; then
                VERSION="$1"
            else
                echo "Unexpected argument: $1"
                print_help
                exit 1
            fi
            ;;
    esac
    shift
done

if [ -z "$VERSION" ]; then
    echo "ERROR: VERSION is required"
    print_help
    exit 1
fi

if [ -z "$HOME" ]; then
    echo "ERROR: HOME not set, use --blog-env and --wallet-env explicitly"
    exit 1
fi

BLOG_ENV_FILE="${BLOG_ENV_FILE:-$HOME/denser/.env.blog}"
WALLET_ENV_FILE="${WALLET_ENV_FILE:-$HOME/denser/.env.wallet}"

# Resolve to absolute paths
BLOG_ENV_FILE="$(cd "$(dirname "$BLOG_ENV_FILE")" && pwd)/$(basename "$BLOG_ENV_FILE")"
WALLET_ENV_FILE="$(cd "$(dirname "$WALLET_ENV_FILE")" && pwd)/$(basename "$WALLET_ENV_FILE")"

if [ ! -f "$BLOG_ENV_FILE" ]; then
    echo "ERROR: Blog env file not found: $BLOG_ENV_FILE"
    exit 1
fi

if [ ! -f "$WALLET_ENV_FILE" ]; then
    echo "ERROR: Wallet env file not found: $WALLET_ENV_FILE"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_DIR="$SCRIPT_DIR/../docker"

echo "Deploying version: $VERSION"
echo "Blog env: $BLOG_ENV_FILE"
echo "Wallet env: $WALLET_ENV_FILE"

BLOG_IMAGE="registry.gitlab.syncad.com/hive/denser/blog:${VERSION}"
WALLET_IMAGE="registry.gitlab.syncad.com/hive/denser/wallet:${VERSION}"

# Check for local images and pull only if needed
pull_if_needed() {
    local image="$1"
    local name="$2"

    if [ "$FORCE_PULL" = "true" ]; then
        echo "Pulling $name (--pull specified)..."
        docker pull "$image"
    elif docker image inspect "$image" >/dev/null 2>&1; then
        echo "Using local $name image"
    else
        echo "Local $name image not found, pulling from registry..."
        docker pull "$image"
    fi
}

pull_if_needed "$BLOG_IMAGE" "blog"
pull_if_needed "$WALLET_IMAGE" "wallet"

export VERSION
export BLOG_ENV_FILE
export WALLET_ENV_FILE

cd "$COMPOSE_DIR"

# Write .env for subsequent docker compose commands (ps, logs, etc.)
cat > .env <<ENVEOF
VERSION=$VERSION
BLOG_ENV_FILE=$BLOG_ENV_FILE
WALLET_ENV_FILE=$WALLET_ENV_FILE
ENVEOF

docker compose up -d --wait --wait-timeout 120

echo ""
echo "Deployment complete. All services healthy."
echo "Check status with: docker compose ps  (or: docker ps)"
echo "Check logs with:   docker compose logs  (or: docker logs docker-denser-blog-1)"
