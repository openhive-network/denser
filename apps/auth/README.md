Oauth server for authenticating Hive users and making operations on Hive
blockchain.

## Integration with other Denser application

1. Implement `@tanstack/react-query` provider in your application, see
   [components/common/providers.tsx](components/common/providers.tsx).
2. Add function `setLoginChallengeCookies` to your `middleware.ts`, see
   [middleware.ts](middleware.ts).

3. Add api pages

4. Use component
   [../../packages/smart-signer/components/login-panel.tsx](../../packages/smart-signer/components/login-panel.tsx)
   to login user, on your login page on in your login dialog, see
   [pages/login.tsx](pages/login.tsx).
5.

