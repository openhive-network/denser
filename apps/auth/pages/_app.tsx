import "@hive/tailwindcss-config/globals.css";
import type { AppProps } from "next/app";
import { lazy, Suspense } from "react";
import { logger, isBrowser, LoggerOutput, LoggerLogLevels } from "@hive/ui/lib/logger";
import env from "@beam-australia/react-env";

const Providers = lazy(() => import("@/auth/components/common/providers"));

export default function App({ Component, pageProps }: AppProps) {

  // Setup logger for logging to console in browser.
  if (isBrowser()) {
    logger.output =  env('LOGGER_OUTPUT') as LoggerOutput || 'noop';
    logger.level = env('LOGGER_LEVEL') as keyof LoggerLogLevels || 'error';
  }

  return (
    <Suspense fallback={<span>Loading...</span>}>
      <Providers>
        <Component {...pageProps} />
      </Providers>
    </Suspense>
  );
}
