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

### TODO

1. Manage Hbauth stuff in a better way.
2. Enable signing operations.
3. Fix issue with translations for stuff coming from internal package.
