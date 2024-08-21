#!/usr/bin/env bash

set -euo pipefail

WAX_VERSION=${1} # full package name, e.g. @hiveio/wax@0.3.8-stable.240325165906
HBAUTH_VERSION=${2} # full package name, e.g. @hiveio/hb-auth@0.0.1-stable.240327151528
WORKERBEE=${3} # full package name, e.g. @hiveio/workerbee@0.4.1-240802101730

update_packages() {
  echo "Updating packages"

  pnpm update -r "${WAX_VERSION}"
  pnpm update -r "${HBAUTH_VERSION}"
  pnpm update -r "${WORKERBEE}"
}

update_packages

echo "Done"
