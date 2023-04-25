#! /bin/bash

set -e

print_help () {
    cat <<-EOF
Usage: $0 [OPTION[=VALUE]]...

Run a Denser Docker instance
OPTIONS:
  --image=IAMGE        Docker image to run (default: 'registry.gitlab.syncad.com/hive/denser:latest')
  --api-endpoint=URL   API endpoint to be used by the new instance (default: 'api.hive.blog')
  --port=PORT          Port to be exposed (default: 3000)
  -?|--help            Display this help screen and exit
EOF
}

IMAGE=${IMAGE:-"registry.gitlab.syncad.com/hive/denser:latest"}
API_ENDPOINT=${API_ENDPOINT:-"api.hive.blog"}
PORT=${PORT:-"3000"}

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

CONTAINER_NAME="denser"

(docker ps -q --filter "name=$CONTAINER_NAME" | grep -q . && docker stop $CONTAINER_NAME) || true

docker run --detach \
  --rm \
  --publish "$PORT:$PORT" \
  --env PORT="$PORT" \
  --env API_NODE_ENDPOINT="$API_ENDPOINT" \
  --name "$CONTAINER_NAME" \
  "$IMAGE"