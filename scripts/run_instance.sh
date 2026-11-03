#! /bin/bash

set -e

print_help () {
    cat <<-EOF
Usage: $0 [OPTION[=VALUE]]...

Run a Denser Docker instance
OPTIONS:
  --image=IMAGE                         Docker image to run (default: 'registry.gitlab.syncad.com/hive/denser:latest')
  --port=PORT                           Port to be exposed (default: 3000)
  --name=NAME                           Container name to be used (default: denser)
  --env-file=deployment.env             Obligatory path to a file containing environment variables to override i.e. deployment secrets
  --detach                              Run in detached mode 
  --help|-h|-?                          Display this help screen and exit
EOF
}

IMAGE_NAME=${IMAGE_NAME:-"registry.gitlab.syncad.com/hive/denser:latest"}
PORT=${PORT:-"3000"}
CONTAINER_NAME=${CONTAINER_NAME:-"denser"}
DETACH=${DETACH:-false}

CUSTOM_ENV_FILE=''

while [ $# -gt 0 ]; do
  case "$1" in
    --image=*)
        arg="${1#*=}"
        IMAGE_NAME="$arg"
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
    --env-file=*)
        arg="${1#*=}"
        if [ -f "${arg}" ]; then
            CUSTOM_ENV_FILE="${arg}"
        else
            echo "ERROR: File '${arg}' not found"
            exit 2
        fi
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

# Pull the image BEFORE stopping the old container to minimize downtime
# This way, layer downloads happen while the old container is still serving traffic
echo "Pulling image: $IMAGE_NAME"
docker pull "$IMAGE_NAME"

CONTAINER_REMOVAL_TIMEOUT=${CONTAINER_REMOVAL_TIMEOUT:-60}

container_exists () {
    docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1
}

# A container started with --rm is removed by the daemon asynchronously once it
# stops, so `docker stop`/`docker rm` can return (or fail with "removal ... already
# in progress") while the name is still taken. The name being free is the only
# reliable signal that `docker run --name` will succeed.
remove_old_container () {
    container_exists || return 0

    echo "Removing existing container: $CONTAINER_NAME"
    docker stop "$CONTAINER_NAME" >/dev/null || echo "WARNING: 'docker stop $CONTAINER_NAME' failed; waiting for its removal anyway"
    if container_exists; then
        docker container rm --force "$CONTAINER_NAME" >/dev/null || echo "WARNING: 'docker container rm --force $CONTAINER_NAME' failed; waiting for its removal anyway"
    fi

    local waited=0
    while container_exists; do
        if [ "$waited" -ge "$CONTAINER_REMOVAL_TIMEOUT" ]; then
            echo "ERROR: Container '$CONTAINER_NAME' still exists ${CONTAINER_REMOVAL_TIMEOUT}s after stop/remove; refusing to start a new one"
            exit 1
        fi
        sleep 1
        waited=$((waited + 1))
    done
}

remove_old_container

RUN_OPTIONS=(
    "--rm"
    "--publish" "$PORT:$PORT"
    "--env" "PORT=$PORT"
    "--name" "$CONTAINER_NAME"
)

if [ -n "${CUSTOM_ENV_FILE}" ]; then
    RUN_OPTIONS+=("-v" "${CUSTOM_ENV_FILE}:/app/apps/.env")
else
    echo "ERROR: Env file must be specified at command line using option: --env-file"
    exit 2
fi

if [[ "$DETACH" == "true" ]]; then
    RUN_OPTIONS+=("--detach")
fi

docker run "${RUN_OPTIONS[@]}" "$IMAGE_NAME"
