#!/bin/bash

set -e

print_help() {
    cat <<EOF
Usage: $0 VERSION [OPTIONS]

Deploy Denser services using Docker Swarm with zero downtime.

Arguments:
  VERSION                   Image version/tag to deploy (required)

Options:
  --blog-env=PATH           Path to blog .env file (default: \$HOME/denser/.env.blog)
  --wallet-env=PATH         Path to wallet .env file (default: \$HOME/denser/.env.wallet)
  --help                    Show this help

Examples:
  $0 5e8618a0
  $0 5e8618a0 --blog-env=/opt/denser/.env.blog --wallet-env=/opt/denser/.env.wallet
EOF
}

VERSION=""
BLOG_ENV_FILE=""
WALLET_ENV_FILE=""

while [ $# -gt 0 ]; do
    case "$1" in
        --blog-env=*)
            BLOG_ENV_FILE="${1#*=}"
            ;;
        --wallet-env=*)
            WALLET_ENV_FILE="${1#*=}"
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
COMPOSE_FILE="$SCRIPT_DIR/../docker/docker-compose.yml"

# Initialize swarm if not already active (single-node, localhost only)
SWARM_STATE=$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo "unknown")
if [ "$SWARM_STATE" != "active" ]; then
    echo "Initializing Docker Swarm (single-node, localhost only)..."
    docker swarm init --advertise-addr 127.0.0.1 --listen-addr 127.0.0.1:2377
fi

echo "Deploying version: $VERSION"
echo "Blog env: $BLOG_ENV_FILE"
echo "Wallet env: $WALLET_ENV_FILE"

docker pull "registry.gitlab.syncad.com/hive/denser/blog:${VERSION}"
docker pull "registry.gitlab.syncad.com/hive/denser/wallet:${VERSION}"

export VERSION
export BLOG_ENV_FILE
export WALLET_ENV_FILE
docker stack deploy -c "$COMPOSE_FILE" denser

echo ""
echo "Deployment initiated. Services will update in the background."
echo "Check status with: docker service ls"
echo "Check logs with: docker service logs denser_denser-blog"
