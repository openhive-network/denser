#! /bin/bash

SCRIPT_DIR="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 || exit 1; pwd -P )"
SRC_DIR="$SCRIPT_DIR/.."

SERVICE="${SERVICE:-}"
TAIL="${TAIL:-}"
SINCE="${SINCE:-}"
UNTIL="${UNTIL:-}"
TIMESTAMPS="${TIMESTAMPS:-}"
NO_COLOR="${NO_COLOR:-}"
COMPOSE_PROFILES="${COMPOSE_PROFILES:-}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-}"
COMPOSE_ENV_FILES="${COMPOSE_ENV_FILES:-}"

print_help () {
cat <<EOF
Usage: $0 OPTION[=VALUE]...

Script for retrieving API stack logs
OPTIONS:
  --service=NAME                            Name of the service for which to print logs, eg. haf, hivemind-server,
                                            hafah-postgrest-1; if empty print logs for all the services (default: empty string)
  --tail=NUMBER                             Number of last lines of the log to print per service, if empty print all (default: empty string)
  --since=TIMESTAMP or RELATIVE             Show logs since timestamp  (e.g. 2013-01-02T13:23:37Z) or relative (e.g. 42m for
                                            42 minutes) (default: empty string)
  --until=TIMESTAMP or RELATIVE             Show logs before a timestamp (e.g. 2013-01-02T13:23:37Z) or relative (e.g. 42m for
                                            42 minutes) (default: empty string)
  --timestamps                              Show timestamps
  --no-color                                Print logs without color (useful if redirecting to file)
  --profiles=P1,P2,P3                       Profile(s) to use, must be the same as when the stack was started
  --project-name=NAME                       Name of the Compose project, must be the same as when the stack was started
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
    --service=*)
        arg="${1#*=}"
        SERVICE="$arg"
        ;;
    --tail=*)
        arg="${1#*=}"
        TAIL="$arg"
        ;;
    --since=*)
        arg="${1#*=}"
        SINCE="$arg"
        ;;
    --until=*)
        arg="${1#*=}"
        UNTIL="$arg"
        ;;
    --timestamps)
        TIMESTAMPS="true"
        ;;
    --no-color)
        NO_COLOR="true"
        ;;
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

OPTIONS=()
if [[ -n "${TAIL:-}" ]]; then
  OPTIONS+=("--tail")
  OPTIONS+=("${TAIL}")
fi
if [[ -n "${SINCE:-}" ]]; then
  OPTIONS+=("--since")
  OPTIONS+=("${SINCE}")
fi
if [[ -n "${UNTIL:-}" ]]; then
  OPTIONS+=("--until")
  OPTIONS+=("${UNTIL}")
fi
if [[ -n "${NO_COLOR:-}" ]]; then
  OPTIONS+=("--no-color")
fi
if [[ -n "${TIMESTAMPS:-}" ]]; then
  OPTIONS+=("--timestamps")
fi
if [[ -n "${SERVICE:-}" ]]; then
  OPTIONS+=("${SERVICE}")
fi

docker compose exec -it compose docker-entrypoint.sh docker compose logs "${OPTIONS[@]}"
popd
