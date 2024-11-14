import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';
import env from '@beam-australia/react-env';

export const envData = createEnv({
  server: {
    APP_NAME: z.string(),
    API_ENDPOINT: z.string().url(),
    REACT_APP_CHAIN_ID: z.string(),
    IMAGES_ENDPOINT: z.string().url(),
    LOGGING_BROWSER_ENABLED: z.boolean(),
    LOGGING_LOG_LEVEL: z.string(),
    WALLET_ENDPOINT: z.string().url(),
    SITE_DOMAIN: z.string().url()
  },
  client: {
    NEXT_PUBLIC_WALLET_DOMAIN: z.string(),
    NEXT_PUBLIC_SITE_DOMAIN: z.string(),
    NEXT_PUBLIC_IMAGES_ENDPOINT: z.string()
  },
  runtimeEnv: {
    APP_NAME: process.env.APP_NAME || env('APP_NAME'),
    API_ENDPOINT: process.env.API_ENDPOINT || env('API_ENDPOINT'),
    REACT_APP_CHAIN_ID: process.env.REACT_APP_CHAIN_ID || env('REACT_APP_CHAIN_ID'),
    IMAGES_ENDPOINT: process.env.IMAGES_ENDPOINT || env('IMAGES_ENDPOINT'),
    LOGGING_BROWSER_ENABLED: process.env.LOGGING_BROWSER_ENABLED === 'true',
    LOGGING_LOG_LEVEL: process.env.LOGGING_LOG_LEVEL || env('LOGGING_LOG_LEVEL'),
    WALLET_ENDPOINT: process.env.WALLET_ENDPOINT || env('WALLET_ENDPOINT'),
    SITE_DOMAIN: process.env.SITE_DOMAIN || env('SITE_DOMAIN'),
    NEXT_PUBLIC_WALLET_DOMAIN: process.env.NEXT_PUBLIC_WALLET_DOMAIN || env('WALLET_DOMAIN'),
    NEXT_PUBLIC_SITE_DOMAIN: process.env.NEXT_PUBLIC_SITE_DOMAIN || env('SITE_DOMAIN'),
    NEXT_PUBLIC_IMAGES_ENDPOINT: process.env.NEXT_PUBLIC_IMAGES_ENDPOINT || env('IMAGES_ENDPOINT')
  }
});
