import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";
import config from "config";

const __NEXT_CONFIG__ = { ...config } as any;
// exclude server config
delete __NEXT_CONFIG__.server;

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <NextScript />
        <Script
          src="/__ENV.js"
          strategy="beforeInteractive"
        />
        <Script
          strategy="beforeInteractive"
          id="__NEXT_CONFIG__"
          type="application/json"
          // nonce={this.props.nonce}
          // crossOrigin={this.props.crossOrigin || process.crossOrigin}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(__NEXT_CONFIG__)
          }}
        />
      </body>
    </Html>
  );
}
