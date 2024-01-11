Oauth server for authenticating Hive users and making operations on Hive
blockchain.

## Integration with other Denser application

1. Implement `@tanstack/react-query` provider in your application, see
   [components/common/providers.tsx](components/common/providers.tsx).
2. Add function `setLoginChallengeCookies` to your `middleware.ts`, see
   [middleware.ts](middleware.ts).
3. Add api endpoints for login, logout and user info — just copy files
   [pages/api/auth/login.ts](pages/api/auth/login.ts),
   [pages/api/auth/logout.ts](pages/api/auth/logout.ts), and
   [pages/api/users/me.ts](pages/api/users/me.ts) to the same paths in
   your application.
4. Use component
   [../../packages/smart-signer/components/login-panel.tsx](../../packages/smart-signer/components/login-panel.tsx)
   to login user, on your login page on in your login dialog, see
   [pages/login.tsx](pages/login.tsx).
5. Use react hook function
   [../../packages/smart-signer/lib/auth/use-logout.ts](../../packages/smart-signer/lib/auth/use-logout.ts)
   to logout user, see [components/site-header.tsx](components/site-header.tsx).

### TODO

1. Manage Hbauth stuff in a better way.
2. Fix issue with translations for stuff coming from internal package.
