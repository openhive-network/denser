import createHttpError from 'http-errors';
import { NextApiRequest } from 'next';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

//
// See https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#employing-custom-request-headers-for-ajaxapi
// If current implementation is not good enough, see https://github.com/amorey/edge-csrf
//
export const csrfHeaderName = `x-csrf-token`;

/**
 * Function checks if CSRF protection header exists in request
 * and throws Http Error when it doesn't exist.
 *
 * @param {NextApiRequest} req
 */
export const checkCsrfHeader = (req: NextApiRequest): boolean => {
  if (!Object.hasOwn(req.headers, csrfHeaderName)) {
    const errorMessage = `Missing ${csrfHeaderName} header`;
    logger.error(errorMessage);
    throw new createHttpError.BadRequest(errorMessage);
  }
  return true;
};
