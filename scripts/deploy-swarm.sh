#!/bin/bash

set -e

print_help() {
    cat <<EOF
Usage: $0 VERSION [OPTIONS]

Deploy Denser services using Docker Swarm with zero downtime.

Arguments:
  VERSION                 Image version/tag to deploy (required)

Options:
  --env-file=PATH         Path to .env file (default: \$HOME/denser/.env)
  --help                  Show this help

Examples:
  $0 5e8618a0
  $0 5e8618a0 --env-file=/opt/denser/.env
EOF
}

VERSION=""
ENV_FILE=""

while [ $# -gt 0 ]; do
    case "$1" in
        --env-file=*)
            ENV_FILE="${1#*=}"
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

if [ -z "$ENV_FILE" ]; then
    if [ -z "$HOME" ]; then
        echo "ERROR: --env-file required (HOME not set)"
        exit 1
    fi
    ENV_FILE="$HOME/denser/.env"
fi

ENV_FILE="$(cd "$(dirname "$ENV_FILE")" && pwd)/$(basename "$ENV_FILE")"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: Env file not found: $ENV_FILE"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/../docker/docker-compose.yml"

echo "Deploying version: $VERSION"
echo "Using env file: $ENV_FILE"

docker pull "registry.gitlab.syncad.com/hive/denser/blog:${VERSION}"
docker pull "registry.gitlab.syncad.com/hive/denser/wallet:${VERSION}"

export VERSION
export ENV_FILE
docker stack deploy -c "$COMPOSE_FILE" denser

echo "Done. Check status: docker service ls"
