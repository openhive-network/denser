#! /bin/bash

set -e

print_help () {
    cat <<-EOF
Usage: $0 [OPTION[=VALUE]]...

Run a Denser Docker instance
OPTIONS:
  --image=IMAGE         Docker image to run (default: 'registry.gitlab.syncad.com/hive/denser:latest')
  --api-endpoint=URL    API endpoint to be used by the new instance (default: 'https://api.hive.blog')
  --images-endpoint=URL IMAGES endpoint to be used by the new instance (default: 'https://api.hive.blog')
  --port=PORT           Port to be exposed (default: 3000)
  --name=NAME           Container name to be used (default: denser)
  --detach              Run in detached mode 
  -?|--help             Display this help screen and exit
EOF
}

IMAGE=${IMAGE:-"registry.gitlab.syncad.com/hive/denser:latest"}
PORT=${PORT:-"3000"}
API_ENDPOINT=${API_ENDPOINT:-"https://api.hive.blog"}
IMAGES_ENDPOINT=${IMAGES_ENDPOINT:="https://images.hive.blog/"}
CONTAINER_NAME=${CONTAINER_NAME:-"denser"}
DETACH=${DETACH:-false}

while [ $# -gt 0 ]; do
  case "$1" in
    --image=*)
        arg="${1#*=}"
        IMAGE="$arg"
        ;;
    --api-endpoint=*)
        arg="${1#*=}"
        API_ENDPOINT="$arg"
        ;;
    --images-endpoint=*)
        arg="${1#*=}"
        IMAGES_ENDPOINT="$arg"
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
    "--env" "REACT_APP_IMAGES_ENDPOINT=$IMAGES_ENDPOINT"
    "--name" "$CONTAINER_NAME"
)

if [[ "$DETACH" == "true" ]]; then
    RUN_OPTIONS+=("--detach")
fi

docker run "${RUN_OPTIONS[@]}" "$IMAGE"
# docker run --detach \
#   --rm \
#   --publish "$PORT:$PORT" \
#   --env PORT="$PORT" \
#   --env REACT_APP_API_ENDPOINT="$API_ENDPOINT" \
#   --name "$CONTAINER_NAME" \
#   "$IMAGE"