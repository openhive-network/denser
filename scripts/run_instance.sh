#! /bin/bash

set -e

print_help () {
    cat <<-EOF
Usage: $0 [OPTION[=VALUE]]...

Run a Denser Docker instance
OPTIONS:
  --image=IMAGE        Docker image to run (default: 'registry.gitlab.syncad.com/hive/denser:latest')
  --port=PORT          Port to be exposed (default: 3000)
  -?|--help            Display this help screen and exit
EOF
}

IMAGE=${IMAGE:-"registry.gitlab.syncad.com/hive/denser:latest"}
PORT=${PORT:-"3000"}

while [ $# -gt 0 ]; do
  case "$1" in
    --image=*)
        arg="${1#*=}"
        IMAGE="$arg"
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
  --init \
  --publish "$PORT:$PORT" \
  --env PORT="$PORT" \
  --name "$CONTAINER_NAME" \
  "$IMAGE"