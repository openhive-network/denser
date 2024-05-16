#!/usr/bin/env bash

set -euo pipefail

WAX_VERSION=${1} # full package name, e.g. @hiveio/wax@0.3.8-stable.240325165906
HBAUTH_VERSION=${2} # full package name, e.g. @hiveio/hb-auth@0.0.1-stable.240327151528

uninstall_packages() {
  echo "Uninstalling packages"

  npm uninstall --save @hiveio/hb-auth --workspace=packages/smart-signer

  npm uninstall --save @hiveio/wax --workspace=packages/smart-signer
  npm uninstall --save @hiveio/wax --workspace=packages/transaction
  npm uninstall --save @hiveio/wax --workspace=packages/ui

  npm uninstall --save @hiveio/wax --workspace=apps/auth
  npm uninstall --save @hiveio/wax --workspace=apps/blog
  npm uninstall --save @hiveio/wax --workspace=apps/wallet
}

install_packages() {
  echo "Installing packages"

  npm install --save "${WAX_VERSION}" --workspace=apps/auth
  npm install --save "${WAX_VERSION}" --workspace=apps/blog
  npm install --save "${WAX_VERSION}" --workspace=apps/wallet

  npm install --save "${WAX_VERSION}" --workspace=packages/smart-signer
  npm install --save "${WAX_VERSION}" --workspace=packages/transaction
  npm install --save "${WAX_VERSION}" --workspace=packages/ui

  npm install --save "${HBAUTH_VERSION}" --workspace=packages/smart-signer
}

uninstall_packages
install_packages

echo "Done"
