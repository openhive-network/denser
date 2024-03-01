#! /bin/bash

set -e

print_help () {
    cat <<-EOF
Usage: $0 <source directory> [OPTION[=VALUE]]...

Build a Denser Docker image
by default tagged as 'registry.gitlab.syncad.com/hive/denser:latest'
OPTIONS:
  --registry=URL        Docker registry to assign the image to (default: 'registry.gitlab.syncad.com/hive/denser')
  --tag=TAG             Docker tag to be build (default: 'latest')
  --progress=TYPE       Determines how to display build progress (default: 'auto')
  --app-scope=SCOPE     App scope (eg. '@hive/auth')
  --app-path=PATH       App path (eg. '/apps/auth)
  --app-name=NAME       App name (eg. 'auth')
  --help|-h|-?          Display this help screen and exit
EOF
}

export CI_REGISTRY_IMAGE=${CI_REGISTRY_IMAGE:-"registry.gitlab.syncad.com/hive/denser"}
export TAG=${TAG:-"latest"}
export TURBO_APP_SCOPE=${TURBO_APP_SCOPE:-}
export TURBO_APP_PATH=${TURBO_APP_PATH:-}
export TURBO_APP_NAME=${TURBO_APP_NAME:-}
PROGRESS_DISPLAY=${PROGRESS_DISPLAY:-"auto"}

while [ $# -gt 0 ]; do
  case "$1" in
    --registry=*)
        arg="${1#*=}"
        export CI_REGISTRY_IMAGE="$arg"
        ;;
    --tag=*)
        arg="${1#*=}"
        export TAG="$arg"
        ;;
    --progress=*)
        arg="${1#*=}"
        PROGRESS_DISPLAY="$arg"
        ;;
    --app-scope=*)
        arg="${1#*=}"
        TURBO_APP_SCOPE="$arg"
        ;;
    --app-path=*)
        arg="${1#*=}"
        TURBO_APP_PATH="$arg"
        ;;
    --app-name=*)
        arg="${1#*=}"
        TURBO_APP_NAME="$arg"
        ;;
    --help|-h|-?)
        print_help
        exit 0
        ;;
    *)
        if [ -z "$SRCROOTDIR" ];
        then
          SRCROOTDIR="${1}"
        else
          echo "ERROR: '$1' is not a valid option/positional argument"
          echo
          print_help
          exit 2
        fi
        ;;
    esac
    shift
done

TARGET="local-build"
if [ -n "${CI:-}" ];
then
    TARGET="ci-build"
fi

pushd "$SRCROOTDIR"

# All the variables below must be declared and assigned separately
# for 'set -e' to work correctly. See https://www.shellcheck.net/wiki/SC2155
# for an explanation

BUILD_TIME="$(date -uIseconds)"
export BUILD_TIME

GIT_COMMIT_SHA="$(git rev-parse HEAD || true)"
if [ -z "$GIT_COMMIT_SHA" ]; then
  GIT_COMMIT_SHA="[unknown]"
fi
export GIT_COMMIT_SHA

GIT_CURRENT_BRANCH="$(git branch --show-current || true)"
if [ -z "$GIT_CURRENT_BRANCH" ]; then
  GIT_CURRENT_BRANCH="$(git describe --abbrev=0 --all | sed 's/^.*\///' || true)"
  if [ -z "$GIT_CURRENT_BRANCH" ]; then
    GIT_CURRENT_BRANCH="[unknown]"
  fi
fi
export GIT_CURRENT_BRANCH

GIT_LAST_LOG_MESSAGE="$(git log -1 --pretty=%B || true)"
if [ -z "$GIT_LAST_LOG_MESSAGE" ]; then
  GIT_LAST_LOG_MESSAGE="[unknown]"
fi
export GIT_LAST_LOG_MESSAGE

GIT_LAST_COMMITTER="$(git log -1 --pretty="%an <%ae>" || true)"
if [ -z "$GIT_LAST_COMMITTER" ]; then
  GIT_LAST_COMMITTER="[unknown]"
fi
export GIT_LAST_COMMITTER

GIT_LAST_COMMIT_DATE="$(git log -1 --pretty="%aI" || true)"
if [ -z "$GIT_LAST_COMMIT_DATE" ]; then
  GIT_LAST_COMMIT_DATE="[unknown]"
fi
export GIT_LAST_COMMIT_DATE

./scripts/write-version.sh ".${TURBO_APP_PATH}/version.json"
docker buildx bake --provenance=false --progress="$PROGRESS_DISPLAY" "$TARGET"

popd