#! /bin/bash

set -e

print_help () {
    cat <<-EOF
Usage: $0 [OPTION[=VALUE]]...

Run a Denser Docker instance
OPTIONS:
  --image=IMAGE         Docker image to run (default: 'registry.gitlab.syncad.com/hive/denser:latest')
  --api-endpoint=URL    API endpoint to be used by the new instance (default: 'https://api.hive.blog')
  --port=PORT           Port to be exposed (default: 3000)
  --container-name=NAME Container name to be used (default: denser)
  -?|--help             Display this help screen and exit
EOF
}

IMAGE=${IMAGE:-"registry.gitlab.syncad.com/hive/denser:latest"}
PORT=${PORT:-"3000"}
API_ENDPOINT=${API_ENDPOINT:-"https://api.hive.blog"}
CONTAINER_NAME=${CONTAINER_NAME:-"denser"}

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
    --port=*)
        arg="${1#*=}"
        PORT="$arg"
        ;;
    --container-name=*)
        arg="${1#*=}"
        CONTAINER_NAME="$arg"
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

(docker ps -q --filter "name=$CONTAINER_NAME" | grep -q . && docker stop $CONTAINER_NAME) || true

docker run --detach \
  --rm \
  --publish "$PORT:$PORT" \
  --env PORT="$PORT" \
  --env REACT_APP_API_ENDPOINT="$API_ENDPOINT" \
  --name "$CONTAINER_NAME" \
  "$IMAGE"