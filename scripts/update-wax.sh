#!/usr/bin/env bash

set -euo pipefail

WAX_VERSION=${1} # full package name, e.g. @hiveio/wax@0.3.8-stable.240325165906
HBAUTH_VERSION=${2} # full package name, e.g. @hiveio/hb-auth@0.0.1-stable.240327151528

uninstall_packages() {
  echo "Uninstalling packages"

  pnpm remove --save @hiveio/hb-auth --workspace=packages/smart-signer

  pnpm remove --save @hiveio/wax --workspace=packages/smart-signer
}

install_packages() {
  echo "Installing packages"

  pnpm update --save "${WAX_VERSION}" --workspace=apps/auth

  pnpm update --save "${HBAUTH_VERSION}" --workspace=packages/smart-signer
}

uninstall_packages
install_packages

echo "Done"
