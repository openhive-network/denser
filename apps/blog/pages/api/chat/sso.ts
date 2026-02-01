import { apiHandler } from "@smart-signer/lib/api";
import { chatSso } from "@smart-signer/lib/api-handlers/chat/sso";

export default apiHandler({
  GET: chatSso,
  POST: chatSso,
});
