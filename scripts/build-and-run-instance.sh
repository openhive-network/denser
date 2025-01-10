#! /bin/bash

#
# Build docker image and run instance of application.
#

set -e


APP="${1:-$DENSER_APP_NAME}" # auth | blog | wallet
PORT="${2:-$DENSER_APP_PORT}"


build_instance() {
  echo "Building docker image registry.gitlab.syncad.com/hive/denser/${APP}:latest for application ${APP}"

  ./scripts/build_instance.sh \
    --app-scope="@hive/${APP}" \
    --app-path="/apps/${APP}" \
    --app-name="${APP}" \
    "$(pwd)"

  echo "Docker image registry.gitlab.syncad.com/hive/denser/${APP}:latest for application ${APP} has been built"
}


run_instance() {
  echo "Starting application ${APP} in docker container denser-${APP}, published on port ${PORT} on localhost"

  ./scripts/run_instance.sh \
    --image="registry.gitlab.syncad.com/hive/denser/${APP}:latest" \
    --app-scope="@hive/${APP}" \
    --app-path="/apps/${APP}" \
    --api-endpoint="https://api.hive.blog" \
    --chain-id="${CHAIN_ID}" \
    --images-endpoint="https://images.hive.blog/" \
    --name="denser-${APP}" \
    --port="${PORT}" \
    --detach

  echo "Application ${APP} is running in docker container denser-${APP}."
  echo "Go to http://localhost:${PORT} to see it."
}


run() {
  local help="
Build docker image and run instance of application.

Positional arguments (or env variables instead):

1. DENSER_APP_NAME < auth | blog | wallet >
2. DENSER_APP_PORT default <8080>

Example commands:

./scripts/build-and-run-instance.sh \"blog\"
./scripts/build-and-run-instance.sh \"blog\" \"8090\"
DENSER_APP_NAME=\"blog\" ./scripts/build-and-run-instance.sh
export DENSER_APP_NAME=\"blog\" ; ./scripts/build-and-run-instance.sh
"

  if [ "${PORT:-}not-set" == "not-set" ]; then
      PORT="8080"
  fi

  if [ "${APP}" == "help" ]; then
      echo "$help"
      exit
  fi
}


run
build_instance
run_instance
