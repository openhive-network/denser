#!/usr/bin/env bash

set -euo pipefail

WAX_VERSION=${1} # prefixed with @
HBAUTH_VERSION=${2} # prefixed with @

uninstall_packages() {
  echo "Uninstalling packages"

  npm uninstall --save @hive/hb-auth --workspace=packages/smart-signer

  npm uninstall --save @hive/wax --workspace=packages/smart-signer
  npm uninstall --save @hive/wax --workspace=packages/transaction
  npm uninstall --save @hive/wax --workspace=packages/ui

  npm uninstall --save @hive/wax --workspace=apps/auth
  npm uninstall --save @hive/wax --workspace=apps/blog
  npm uninstall --save @hive/wax --workspace=apps/wallet
}

install_packages() {
  echo "Installing packages"

  npm install --save "@hive/wax${WAX_VERSION}" --workspace=apps/auth
  npm install --save "@hive/wax${WAX_VERSION}" --workspace=apps/blog
  npm install --save "@hive/wax${WAX_VERSION}" --workspace=apps/wallet

  npm install --save "@hive/wax${WAX_VERSION}" --workspace=packages/smart-signer
  npm install --save "@hive/wax${WAX_VERSION}" --workspace=packages/transaction
  npm install --save "@hive/wax${WAX_VERSION}" --workspace=packages/ui

  npm install --save "@hive/hb-auth${HBAUTH_VERSION}" --workspace=packages/smart-signer
}

uninstall_packages
install_packages
