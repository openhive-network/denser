#! /bin/bash

SCRIPT_DIR="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 || exit 1; pwd -P )"
SRC_DIR="$SCRIPT_DIR/.."

COMPOSE_PROFILES="${COMPOSE_PROFILES:-}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-}"
COMPOSE_ENV_FILES="${COMPOSE_ENV_FILES:-}"
WAIT_FOR_SYNC="${WAIT_FOR_SYNC:-"false"}"


print_help () {
cat <<EOF
Usage: $0 OPTION[=VALUE]...

Script for waiting for API stack to be ready
OPTIONS:
  --profiles=P1,P2,P3                       Profile(s) to use, must be the same as when the stack was started
  --project-name=NAME                               Name of the Compose project, must be the same as when the stack was started
                                            (default: defined at the top of stack/compose.yml)
  --env-files=1.env,2.env                   Specify a file to use to start the stack, uses ${SRC_DIR}/stack/.env 
                                            when empty, must be the same as when the stack was started (default: empty)
  --wait-for-sync=true/false                Wait for HAF replay and Hivemind sync or just for stack startup (default: false)

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
    --wait-for-sync=*)
        arg="${1#*=}"
        WAIT_FOR_SYNC="$arg"
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

pushd "$SRC_DIR"
export COMPOSE_PROFILES
export COMPOSE_PROJECT_NAME
export COMPOSE_ENV_FILES

if [[ "$WAIT_FOR_SYNC" == "true" ]]
then
    until ./scripts/get-stack-logs.sh --service=haf --tail=1 | grep "No P2P data (block/transaction) received in last 30 seconds..."
    do
        echo "Waiting for HAF replay to finish..."
        sleep 60
    done
    until ./scripts/get-stack-logs.sh --service=hivemind-block-processing --tail=3 | grep "Next block range from hive.app_next_block is: <None:None>"
    do
        echo "Waiting for Hivemind sync to finish..."
        sleep 60
    done
else
    until ./scripts/get-stack-logs.sh --service=haf --tail=5 | grep "Broadcasting block"
    do
        echo "Waiting for HAF to start producing blocks"
        sleep 60
    done
fi


echo "HAF API stack is ready!"
popd
