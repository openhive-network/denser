import { apiHandler } from "@smart-signer/lib/api";
import { registerConsent } from "@smart-signer/lib/api-handlers/auth/consent";

export default apiHandler({
  POST: registerConsent,
});
