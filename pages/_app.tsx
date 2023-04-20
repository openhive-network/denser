import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { lazy, Suspense } from 'react';
import Loading from '@/components/loading';

const Providers = lazy(() => import('@/components/common/providers'));

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Suspense fallback={<Loading />}>
      <Providers>
        <Component {...pageProps} />
      </Providers>
    </Suspense>
  );
}
