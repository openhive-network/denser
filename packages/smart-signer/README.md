SDK for authenticating Hive users and making operations on Hive
blockchain.

## Using in Denser application

1. Copy file `../../node_modules/@hive/hb-auth/dist/worker.js` to
   `public/auth/` when your applications builds. Use webpack CopyPlugin
   to do this, see
   [../../apps/auth/next.config.js](../../apps/auth/next.config.js).
2. Implement `@tanstack/react-query` provider in your application, see
   [../../apps/auth/components/common/providers.tsx](../../apps/auth/components/common/providers.tsx).
3. Add function `setLoginChallengeCookies` to your `middleware.ts`, see
   [../../apps/auth/middleware.ts](../../apps/auth/middleware.ts).
4. Add api endpoints for login, logout and user info — just copy files
   [../../apps/auth/pages/api/auth/login.ts](../../apps/auth/pages/api/auth/login.ts),
   [../../apps/auth/pages/api/auth/logout.ts](../../apps/auth/pages/api/auth/logout.ts),
   and
   [../../apps/auth/pages/api/users/me.ts](../../apps/auth/pages/api/users/me.ts)
   to the same paths in your application.
5. Use component
   [../../packages/smart-signer/components/login-panel.tsx](../../packages/smart-signer/components/login-panel.tsx)
   to login user, on your login page on in your login dialog, see
   [../../apps/auth/pages/login.tsx](../../apps/auth/pages/login.tsx).
6. Use react hook function
   [../../packages/smart-signer/lib/auth/use-logout.ts](../../packages/smart-signer/lib/auth/use-logout.ts)
   to logout user, see
   [../../apps/auth/components/site-header.tsx](../../apps/auth/components/site-header.tsx).
7. To use locale stuff from
   [../../packages/smart-signer/locales](../../packages/smart-signer/locales),
   you need to import translations's files to a location known to i18n
   engine used in your application:

    a) set `localePath: path.resolve('./public/locales')` in your
    `next-i18next.config.js`, see
    [../../apps/auth/next-i18next.config.js](../../apps/auth/next-i18next.config.js]),

    b) use WebpackCopyPlugin to copy locale files, both for your
    application and for package `smart-signer`, to your `./public/locales`,
    see
    [../../apps/auth/next.config.js](../../apps/auth/next.config.js),

    c) gitignore your `./public/locales`, see
    [../../apps/auth/.gitignore](../../apps/auth/.gitignore),

    d) add script `clean` to your `package.json`, see
    [../../apps/auth/package.json](../../apps/auth/package.json).

    e) add string `smart-signer` to the array of namespaces loaded in
    your `serverSideTranslations` handler, see
    [../../apps/auth/lib/get-translations.ts](../../apps/auth/lib/get-translations.ts).

8. Optionally create environment variables for logger in your
   `.env.local` file, when you need to see logger messages emitted on
   lower levels during development, for instance:
   ```bash
   REACT_APP_LOGGING_BROWSER_ENABLED="true"
   REACT_APP_LOGGING_LOG_LEVEL="TRACE"
   ```
9. Copy has-client.d.ts to app [../../apps/auth/has-client.d.ts]



### TODO

1. Manage Hbauth stuff in better way.
2. Enable signing operations.
