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

  # Use .env.${APP} if it exists, otherwise create a minimal temp file
  local ENV_FILE=".env.${APP}"
  if [ ! -f "${ENV_FILE}" ]; then
    echo "Warning: ${ENV_FILE} not found, creating temporary env file"
    ENV_FILE="${TMPDIR:-/tmp}/denser-${APP}-local.env"
    cat > "${ENV_FILE}" << EOF
PORT=${PORT}
REACT_APP_API_ENDPOINT=${REACT_APP_API_ENDPOINT:-https://api.hive.blog}
REACT_APP_IMAGES_ENDPOINT=${REACT_APP_IMAGES_ENDPOINT:-https://images.hive.blog/}
EOF
  fi

  ./scripts/run_instance.sh \
    --image="registry.gitlab.syncad.com/hive/denser/${APP}:latest" \
    --name="denser-${APP}" \
    --port="${PORT}" \
    --env-file="${ENV_FILE}" \
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
