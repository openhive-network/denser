/**
 * React 19 compatibility shim for libraries that access the removed
 * __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED property.
 *
 * React 19 renamed this to __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
 * and removed ReactCurrentOwner / ReactCurrentDispatcher.
 *
 * @hiveio/healthchecker-component bundles an inline React 18 JSX runtime
 * that crashes without this shim. Remove once the library supports React 19.
 */
import React from "react";

type ReactWithLegacyInternals = typeof React & {
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: {
    ReactCurrentOwner: { current: null };
    ReactCurrentDispatcher: { current: null };
  };
};

const reactModule = React as ReactWithLegacyInternals;

if (!reactModule.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  reactModule.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
    ReactCurrentOwner: { current: null },
    ReactCurrentDispatcher: { current: null },
  };
}
