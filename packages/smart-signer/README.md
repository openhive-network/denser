SDK for authenticating Hive users and making operations on Hive
blockchain.

## Using in your application

1. Copy file `../../node_modules/@hiveio/hb-auth/dist/worker.js` to
   `public/auth/` when your applications builds. Use webpack CopyPlugin
   to do this, see
   [../../apps/auth/next.config.js](../../apps/auth/next.config.js).
2. Implement `@tanstack/react-query` provider in your application, see
   [../../apps/auth/components/common/providers.tsx](../../apps/auth/components/common/providers.tsx).
3. Add function `setLoginChallengeCookies` to your `middleware.ts`, see
   [../../apps/auth/middleware.ts](../../apps/auth/middleware.ts).
4. When you need authentication and session on back-end side, add API
   endpoints for login, logout and user info — just copy files
   [../../apps/auth/pages/api/auth/login.ts](../../apps/auth/pages/api/auth/login.ts),
   [../../apps/auth/pages/api/auth/logout.ts](../../apps/auth/pages/api/auth/logout.ts),
   and
   [../../apps/auth/pages/api/users/me.ts](../../apps/auth/pages/api/users/me.ts)
   to the same paths in your application. Then set
   `authenticateOnBackend` option to `true` in your login logic.
5. Create your own login page or login dialog based on
   [SignInForm](../../packages/smart-signer/components/auth/form.tsx),
   for instance. Other possibilities could be
   [LoginPanel](../../packages/smart-signer/components/login-panel.tsx)
   or
   [SigninPanel](../../packages/smart-signer/components/signin-panel.tsx)
6. Use react hook function
   [../../packages/smart-signer/lib/auth/use-logout.ts](../../packages/smart-signer/lib/auth/use-logout.ts)
   to logout user, see
   [../../apps/auth/components/site-header.tsx](../../apps/auth/components/site-header.tsx).
7. To use locale stuff from
   [../../packages/smart-signer/locales](../../packages/smart-signer/locales),
   you need to import translation files to a location known to i18n
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
    [../../apps/auth/package.json](../../apps/auth/package.json) and use
    it in `start` and `build` scripts.

    e) add string `smart-signer` to the array of namespaces loaded in
    your `serverSideTranslations` handler, see
    [../../apps/auth/lib/get-translations.ts](../../apps/auth/lib/get-translations.ts).

8. Create environment variables for logger in your
   `.env.local` file, when you need to see logger messages emitted on
   lower levels during development, for instance:
   ```bash
   REACT_APP_LOGGING_BROWSER_ENABLED="true"
   REACT_APP_LOGGING_LOG_LEVEL="TRACE"
   ```
9. Copy has-client.d.ts to app [../../apps/auth/has-client.d.ts].
10. Put component
    [../../packages/smart-signer/components/modal-container.tsx](../../packages/smart-signer/components/modal-container.tsx)
    in your layout. This component should always exist in DOM. See
    [../../apps/auth/components/common/layout.tsx](../../apps/auth/components/common/layout.tsx).
    If you're already using npm package
    [react-modal-promise](https://github.com/cudr/react-modal-promise#readme)
    just ensure you have ModalContainer in your DOM.


## OAUTH server module

There is an OAUTH server module in smart-signer, implemented using
[node-oidc-provider](https://github.com/panva/node-oidc-provider)
library. You can use it in your application. Inspect [Auth
application](../../apps/auth) to learn how it could be done. Generally:

1. You need authentication and session on server side, so add API
   endpoints for login, logout and user info — just copy files
   [../../apps/auth/pages/api/auth/login.ts](../../apps/auth/pages/api/auth/login.ts),
   [../../apps/auth/pages/api/auth/logout.ts](../../apps/auth/pages/api/auth/logout.ts),
   and
   [../../apps/auth/pages/api/users/me.ts](../../apps/auth/pages/api/users/me.ts)
   to the same paths in your application. Set `authenticateOnBackend`
   option to `true` in your login logic. Set `strict` option to `true`,
   too.
2. Create API endpoint for OAUTH server module like
   [../../apps/auth/pages/api/oidc](../../apps/auth/pages/api/oidc).
3. Create pages for Oauth interactions – see
   [../../apps/auth/pages/interaction](../../apps/auth/pages/interaction).
4. Add rewrites for OAUTH server, see
   [../../apps/auth/next.config.js](../../apps/auth/next.config.js).
4. Set environment variables for Oauth flow, see [OIDC
   configuration](../../packages/smart-signer/lib/oidc.ts),
   [siteConfig](../../packages/ui/config/site.ts), and [env file for
   development](../../apps/auth/.env). Move files created in two
   preceding points, when you decide to use url paths other then
   default.
5. Use back-end side logic
   [loginPageController](../../packages/smart-signer/lib/login-page-controller.ts)
   in your login logic.

The session on OAUTH server is synced with session in your app. Any
incoming OAUTH request for login implicates logging in user in your
application as well. When user is already logged in in your application,
any incoming OAUTH login request will be handled using existing back-end
session in your application, possibly invisibly on client side. Logout
in your application implicates destroying session on OAUTH server.
Logout on OAUTH server does nothing in your application.
