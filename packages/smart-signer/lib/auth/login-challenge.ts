import { fetchJson } from '@smart-signer/lib/fetch-json';
import { appApiPath } from '@ui/lib/app-api-path';

export interface LoginChallengeResponse {
  loginChallenge: string;
}

/**
 * Asks the app's API for the challenge a login transaction signs (the server keeps it in an HttpOnly
 * cookie and checks it at login). Rejects as `fetchJson` does, or when the answer holds no challenge.
 */
export async function fetchLoginChallenge(): Promise<string> {
  const { loginChallenge } = await fetchJson<Partial<LoginChallengeResponse>>(appApiPath('/api/auth/challenge'), {
    method: 'GET',
    cache: 'no-store'
  });
  if (typeof loginChallenge !== 'string' || !loginChallenge) {
    throw new Error('The login challenge response holds no challenge');
  }
  return loginChallenge;
}
