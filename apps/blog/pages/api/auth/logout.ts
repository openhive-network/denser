import { apiHandler } from "@smart-signer/lib/api";
import { logoutUser } from "@smart-signer/lib/api-handlers/auth/logout";

export default apiHandler({
  POST: logoutUser,
});
