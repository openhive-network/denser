import "@hive/tailwindcss-config/globals.css";
import type { AppProps } from "next/app";
import { lazy, Suspense } from "react";

const Providers = lazy(() => import("@/auth/components/common/providers"));

export default function App({ Component, pageProps }: AppProps) {
  // Log Git revision details in browser's console.
  if (typeof window !== 'undefined' && window) {
    console.info('GIT VERSION', GIT_VERSION, GIT_COMMITHASH, GIT_BRANCH, GIT_LASTCOMMITDATETIME);
  }
  return (
    <Suspense fallback={<span>Loading...</span>}>
      <Providers>
        <Component {...pageProps} />
      </Providers>
    </Suspense>
  );
}
