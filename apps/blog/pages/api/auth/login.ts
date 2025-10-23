import { apiHandler } from "@smart-signer/lib/api";
import { loginUser } from "@smart-signer/lib/api-handlers/auth/login";

export default apiHandler({
  POST: loginUser,
});
