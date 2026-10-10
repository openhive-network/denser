import { apiHandler } from '@smart-signer/lib/api';
import { removeSessionAccount } from '@smart-signer/lib/api-handlers/auth/accounts';

export default apiHandler({
  POST: removeSessionAccount
});
