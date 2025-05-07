import { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

const SITE_DESC =
  'Communities without borders. A social network owned and operated by its users, powered by Hive.';
export default function Document() {
  return (
    <Html suppressHydrationWarning={true}>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />

        {/* Basic Meta Tags */}
        <meta name="description" content={SITE_DESC} />

        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Hive" />
        <meta property="og:title" content="Hive" />
        <meta property="og:description" content={SITE_DESC} />
        <meta property="og:image" content="https://hive.blog/images/hive-blog-share.png" />

        {/* Facebook Meta Tags */}
        <meta property="fb:app_id" content="YOUR_FB_APP_ID" />

        {/* Twitter Meta Tags */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@hiveblocks" />
        <meta name="twitter:title" content="#Hive.io" />
        <meta name="twitter:description" content={SITE_DESC} />
        <meta name="twitter:image" content="https://hive.blog/images/hive-blog-twshare.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
        <Script src="/__ENV.js" strategy="beforeInteractive" />
      </body>
    </Html>
  );
}
