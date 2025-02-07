#! /bin/bash

set -e

print_help () {
    cat <<-EOF
Usage: $0 [OPTION[=VALUE]]...

Run a Denser Docker instance
OPTIONS:
  --image=IMAGE                         Docker image to run (default: 'registry.gitlab.syncad.com/hive/denser:latest')
  --api-endpoint=URL                    API endpoint to be used by the new instance (default: 'https://api.hive.blog')
  --wallet-endpoint=WALLET_ENDPOINT     Wallet endpoint to be used by the new instance (default: 'https://wallet.hive.blog')
  --site-domain=SITE_DOMAIN             Site domain to be used by the new instance (default: 'https://blog.hive.blog')
  --blog-domain=BLOG_DOMAIN             Blog domain to be used by the new instance (default: 'https://blog.hive.blog')
  --explorer-domain=EXPLORER_DOMAIN     Explorer domain to be used by the new instance (default: 'https://explore.hive.blog')
  --chain-id=CHAIN_ID                   Chain ID to be used by the new instance (default: 'beeab0de00000000000000000000000000000000000000000000000000000000')
  --images-endpoint=URL                 IMAGES endpoint to be used by the new instance (default: 'https://images.hive.blog/')
  --app-scope=SCOPE                     App scope (eg. '@hive/auth')
  --app-path=PATH                       App path (eg. '/apps/auth)
  --port=PORT                           Port to be exposed (default: 3000)
  --name=NAME                           Container name to be used (default: denser)
  --detach                              Run in detached mode 
  --help|-h|-?                          Display this help screen and exit
EOF
}

IMAGE_NAME=${IMAGE_NAME:-"registry.gitlab.syncad.com/hive/denser:latest"}
API_ENDPOINT=${API_ENDPOINT:-"https://api.hive.blog"}
WALLET_ENDPOINT=${WALLET_ENDPOINT:-"https://wallet.hive.blog"}
SITE_DOMAIN=${SITE_DOMAIN:-"https://blog.hive.blog"}
BLOG_DOMAIN=${BLOG_DOMAIN:-"https://blog.hive.blog"}
EXPLORER_DOMAIN=${EXPLORER_DOMAIN:-"https://explore.openhive.network"}
CHAIN_ID=${CHAIN_ID:-"beeab0de00000000000000000000000000000000000000000000000000000000"}
IMAGES_ENDPOINT=${IMAGES_ENDPOINT:="https://images.hive.blog/"}
TURBO_APP_SCOPE=${TURBO_APP_SCOPE:-}
TURBO_APP_PATH=${TURBO_APP_PATH:-}
PORT=${PORT:-"3000"}
CONTAINER_NAME=${CONTAINER_NAME:-"denser"}
DETACH=${DETACH:-false}

while [ $# -gt 0 ]; do
  case "$1" in
    --image=*)
        arg="${1#*=}"
        IMAGE_NAME="$arg"
        ;;
    --api-endpoint=*)
        arg="${1#*=}"
        API_ENDPOINT="$arg"
        ;;
    --wallet-endpoint=*)
        arg="${1#*=}"
        WALLET_ENDPOINT="$arg"
        ;;
    --site-domain=*)
        arg="${1#*=}"
        SITE_DOMAIN="$arg"
        ;;
    --blog-domain=*)
        arg="${1#*=}"
        BLOG_DOMAIN="$arg"
        ;;
    --explorer-domain=*)
        arg="${1#*=}"
        EXPLORER_DOMAIN="$arg"
        ;;
    --chain-id=*)
        arg="${1#*=}"
        CHAIN_ID="$arg"
        ;;
    --images-endpoint=*)
        arg="${1#*=}"
        IMAGES_ENDPOINT="$arg"
        ;;
    --app-scope=*)
        arg="${1#*=}"
        TURBO_APP_SCOPE="$arg"
        ;;
    --app-path=*)
        arg="${1#*=}"
        TURBO_APP_PATH="$arg"
        ;;
    --port=*)
        arg="${1#*=}"
        PORT="$arg"
        ;;
    --name=*)
        arg="${1#*=}"
        CONTAINER_NAME="$arg"
        ;;
    --detach)
        DETACH=true
        ;;    
    --help|-?)
        print_help
        exit 0
        ;;
    *)
        echo "ERROR: '$1' is not a valid option/positional argument"
        echo
        print_help
        exit 2
        ;;
    esac
    shift
done

(docker ps -q --filter "name=$CONTAINER_NAME" | grep -q . && docker stop "$CONTAINER_NAME") || true

RUN_OPTIONS=(
    "--rm"
    "--publish" "$PORT:$PORT"
    "--env" "PORT=$PORT"
    "--env" "REACT_APP_API_ENDPOINT=$API_ENDPOINT"
    "--env" "REACT_APP_BLOG_DOMAIN=$BLOG_DOMAIN"
    "--env" "REACT_APP_IMAGES_ENDPOINT=$IMAGES_ENDPOINT"
    "--env" "REACT_APP_WALLET_ENDPOINT=$WALLET_ENDPOINT"
    "--env" "REACT_APP_EXPLORER_DOMAIN=$EXPLORER_DOMAIN"
    "--env" "REACT_APP_SITE_DOMAIN=$SITE_DOMAIN"
    "--env" "REACT_APP_CHAIN_ID=$CHAIN_ID"
    "--env" "TURBO_APP_SCOPE=$TURBO_APP_SCOPE"
    "--env" "TURBO_APP_PATH=$TURBO_APP_PATH"
    "--name" "$CONTAINER_NAME"
)

if [[ "$DETACH" == "true" ]]; then
    RUN_OPTIONS+=("--detach")
fi

docker run "${RUN_OPTIONS[@]}" "$IMAGE_NAME"