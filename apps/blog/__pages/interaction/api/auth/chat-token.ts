import { apiHandler } from "@smart-signer/lib/api";
import { getChatToken } from "@smart-signer/lib/api-handlers/auth/chat-token";

export default apiHandler({
  POST: getChatToken,
});
