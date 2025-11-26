import { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

// Get basePath from build-time environment
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const SITE_DESC = 'Hive Wallet is an online wallet for managing Hive accounts.';

export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />

        {/* Basic Meta Tags */}
        <meta name="description" content={SITE_DESC} />

        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Hive Wallet" />
        <meta property="og:title" content="Hive Wallet" />
        <meta property="og:description" content={SITE_DESC} />
        <meta property="og:image" content="https://hive.blog/images/hive-blog-share.png" />

        {/* Facebook Meta Tags */}
        <meta property="fb:app_id" content="YOUR_FB_APP_ID" />

        {/* Twitter Meta Tags */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@hiveblocks" />
        <meta name="twitter:title" content="#Hive" />
        <meta name="twitter:description" content={SITE_DESC} />
        <meta name="twitter:image" content="https://hive.blog/images/hive-blog-share.png" />
      </Head>
      <body className="bg-background-secondary">
        <Main />
        <NextScript />
        <Script src={`${basePath}/__ENV.js`} strategy="beforeInteractive" />
      </body>
    </Html>
  );
}
