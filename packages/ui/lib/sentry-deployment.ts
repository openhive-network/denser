export interface SentryDeploymentOptions {
  environment?: string;
  release?: string;
}

/**
 * The `environment` and `release` options for `Sentry.init`, from the deployment's settings
 * (REACT_APP_SENTRY_ENVIRONMENT and REACT_APP_GIT_COMMIT_SHA). An unset or empty value is left out
 * rather than passed as `undefined`, which would override the SDK's own default.
 */
export function sentryDeploymentOptions(
  environment: string | undefined,
  release: string | undefined
): SentryDeploymentOptions {
  return {
    ...(environment ? { environment } : {}),
    ...(release ? { release } : {})
  };
}
