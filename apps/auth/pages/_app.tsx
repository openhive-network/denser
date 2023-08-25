import "@hive/tailwindcss-config/globals.css";
import type { AppProps } from "next/app";
import { lazy, Suspense } from "react";

const Providers = lazy(() => import("@/auth/components/common/providers"));

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Suspense fallback={<span>Loading...</span>}>
      <Providers>
        <Component {...pageProps} />
      </Providers>
    </Suspense>
  );
}
