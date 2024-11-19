#! /bin/bash

SCRIPT_DIR="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 || exit 1; pwd -P )"
SRC_DIR="$SCRIPT_DIR/.."

COMPOSE_PROFILES="${COMPOSE_PROFILES:-}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-}"
COMPOSE_ENV_FILES="${COMPOSE_ENV_FILES:-}"

print_help () {
cat <<EOF
Usage: $0 OPTION[=VALUE]...

Script for stopping an API stack for Denser
OPTIONS:
  --profiles=P1,P2,P3                       Profile(s) to use, must be the same as when the stack was started
  --project-name=NAME                               Name of the Compose project, must be the same as when the stack was started
                                            (default: defined at the top of stack/compose.yml)
  --env-files=1.env,2.env                   Specify a file to use to start the stack, uses ${SRC_DIR}/stack/.env 
                                            when empty, must be the same as when the stack was started (default: empty)

  --help,-h,-?                              Display this help screen and exit

Available profiles:
  - denser - starts auth, blog and wallet services in addition to the API stack 
EOF
}

set -e

while [ $# -gt 0 ]; do
  case "$1" in
    --profiles=*)
        arg="${1#*=}"
        COMPOSE_PROFILES="$arg"
        ;;
    --project-name=*)
        arg="${1#*=}"
        COMPOSE_PROJECT_NAME="$arg"
        ;;
    --env-files=*)
        arg="${1#*=}"
        COMPOSE_ENV_FILES="$arg"
        ;;
    --help|-h|-\?)
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

pushd "$SRC_DIR/stack"
export COMPOSE_PROFILES
export COMPOSE_PROJECT_NAME
export COMPOSE_ENV_FILES
docker compose down
popd
