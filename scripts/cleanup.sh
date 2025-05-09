#! /bin/bash
set -euo pipefail

SCRIPTPATH="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
SCRIPTSDIR="$SCRIPTPATH"

ROOT_PATH=$(realpath --relative-base=$(pwd) "${SCRIPTSDIR}/..")

echo "Entering root denser directory... ${ROOT_PATH}"

pushd "${ROOT_PATH}"

DIRECTORIES_TO_CLEAN=(
  "node_modules"
  "dist"
  ".next"
  ".turbo"
)

for d in "${DIRECTORIES_TO_CLEAN[@]}"; do
    echo "Recursively removing $d directory..."
    find ${ROOT_PATH} -name "$d" -type d -prune -exec rm -rvf '{}' +
done

popd
