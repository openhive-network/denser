import { apiHandler } from '@smart-signer/lib/api';
import { switchAccount } from '@smart-signer/lib/api-handlers/auth/accounts';

export default apiHandler({
  POST: switchAccount
});
