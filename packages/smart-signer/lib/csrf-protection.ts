import createHttpError from 'http-errors';
import type { NextApiRequest } from 'next';
import { getLogger } from '@ui/lib/logging';
import { isSameOriginRequest } from '@smart-signer/lib/same-origin-request';

const logger = getLogger('app');

//
// See https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#employing-custom-request-headers-for-ajaxapi
// If current implementation is not good enough, see https://github.com/amorey/edge-csrf
//
export const csrfHeaderName = `x-csrf-token`;

/**
 * Function checks if CSRF protection header exists in request
 * and throws Http Error when it doesn't exist. The custom header alone
 * protects only while CORS stays closed, so the request must also come
 * from a page of this site (`Sec-Fetch-Site` or `Origin`).
 *
 * @param {NextApiRequest} req
 * @throws BadRequest without the header, Forbidden to a cross-origin request
 */
export const checkCsrfHeader = (req: NextApiRequest): boolean => {
  if (!Object.hasOwn(req.headers, csrfHeaderName)) {
    const errorMessage = `Missing ${csrfHeaderName} header`;
    logger.error(errorMessage);
    throw new createHttpError.BadRequest(errorMessage);
  }
  if (!isSameOriginRequest(req.headers)) {
    const errorMessage = 'Cross-origin request';
    logger.error(errorMessage);
    throw new createHttpError.Forbidden(errorMessage);
  }
  return true;
};
