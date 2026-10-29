import { apiHandler } from "@smart-signer/lib/api";
import { issueLoginChallenge } from "@smart-signer/lib/api-handlers/auth/challenge";

export default apiHandler({
  GET: issueLoginChallenge,
});
