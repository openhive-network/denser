import '@hive/tailwindcss-config/globals.css';
import * as Sentry from '@sentry/nextjs';
import { ReactNode } from 'react';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import Script from 'next/script';
import { Providers } from './providers';
import ClientEffects from './client-effects';
import ServiceWorkerUpdate from '../components/service-worker-update';
import CondenserMigration from '../components/condenser-migration';
import { getEnvVersion } from '../lib/env-version';

// Get basePath from build-time environment
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const SITE_DESC = 'Hive Wallet is an online wallet for managing Hive accounts.';

const BOOLEAN_TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const INVALID_TOKEN_VALUES = new Set(['NULL', 'UNDEFINED', 'NONE', 'N/A', 'NA', 'FALSE', '0']);

const parseBoolean = (value: string): boolean =>
  BOOLEAN_TRUE_VALUES.has(value.trim().toLowerCase());

const normalizeToken = (value: string): string => {
  const normalized = value.trim().toUpperCase();
  if (normalized.length === 0 || INVALID_TOKEN_VALUES.has(normalized)) {
    return '';
  }
  return /^[A-Z0-9.-]{1,32}$/.test(normalized) ? normalized : '';
};

const readEnv = (...keys: string[]): string => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
};

const resolveFaviconFromEnv = (): string => {
  const heRewardsEnabled = parseBoolean(
    readEnv('HE_REWARDS_ENABLED', 'REACT_APP_HE_REWARDS_ENABLED')
  );
  const heRewardsToken = normalizeToken(
    readEnv('HE_REWARDS_TOKEN', 'REACT_APP_HE_REWARDS_TOKEN')
  );
  const heBrandingEnabled = heRewardsEnabled && heRewardsToken.length > 0;
  const logoFromEnv =
    readEnv('SITE_LOGO_URL', 'REACT_APP_SITE_LOGO_URL') ||
    readEnv('HE_REWARDS_LOGO_URL', 'REACT_APP_HE_REWARDS_LOGO_URL');

  return heBrandingEnabled && logoFromEnv ? logoFromEnv : '/favicon.ico';
};

const faviconIcon = resolveFaviconFromEnv();

const metadata = {
  metadataBase: new URL(process.env.REACT_APP_SITE_DOMAIN || 'https://wallet.hive.blog'),
  title: {
    default: 'Hive Wallet',
    template: '%s - Hive Wallet'
  },
  description: SITE_DESC,
  icons: {
    icon: faviconIcon
  },
  openGraph: {
    type: 'website',
    siteName: 'Hive Wallet',
    title: 'Hive Wallet',
    description: SITE_DESC,
    images: ['https://hive.blog/images/hive-blog-share.png']
  },
  twitter: {
    card: 'summary',
    site: '@hiveblocks',
    title: '#Hive',
    description: SITE_DESC,
    images: ['https://hive.blog/images/hive-blog-share.png']
  },
  other: {
    'fb:app_id': 'YOUR_FB_APP_ID'
  }
} as const satisfies Metadata;

export function generateMetadata(): Metadata {
  if (!process.env.REACT_APP_SENTRY_DSN) {
    return metadata;
  }

  return {
    ...metadata,
    other: {
      ...metadata.other,
      ...Sentry.getTraceData()
    }
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Server-side locale and language handling
  const cookieStore = cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';
  const isRTL = locale === 'ar';

  // Generate stable version hash for __ENV.js cache-busting
  // Only changes when REACT_APP_* env variables change
  const envVersion = getEnvVersion();

  return (
    // suppressHydrationWarning needed because browser extensions (like Hive Keychain)
    // inject scripts into the DOM, causing hydration mismatches
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        {/* Use plain script tag for guaranteed synchronous loading of env globals */}
        <script src={`${basePath}/__ENV.js?v=${envVersion}`} />
      </head>
      <body className="bg-background-secondary" suppressHydrationWarning>
        {/* Google Sign-In - loaded lazily, CSP needs to allow accounts.google.com */}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="lazyOnload"
        />
        <Providers>
          <ServiceWorkerUpdate />
          <CondenserMigration />
          <>{children}</>
        </Providers>
        <ClientEffects />
      </body>
    </html>
  );
}
