import { apiHandler } from "@smart-signer/lib/api";
import { getUser } from "@smart-signer/lib/api-handlers/users/me";

export default apiHandler({
  GET: getUser,
});
