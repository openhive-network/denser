//
// Inspired by [Next.js API routes - Global Error Handling and Clean
// Code Practices](https://dev.to/sneakysensei/nextjs-api-routes-global-error-handling-and-clean-code-practices-3g9p).
//

import createHttpError from 'http-errors';
import { ZodError } from 'zod';
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { getLogger } from '@ui/lib/logging';
import { runMiddleware } from '@smart-signer/lib/run-middleware';
import Cors, { CorsOptions } from 'cors';
import { corsOptionsDefault } from '@smart-signer/lib/cors-options';

const logger = getLogger('api');

export type Method =
  | 'GET'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'PURGE'
  | 'LINK'
  | 'UNLINK';

// Shape of the response when an error is thrown
export interface ErrorResponse {
  error: {
    message: string;
    err?: any; // Sent for unhandled errors reulting in 500.
  };
  status?: number; // Sent for unhandled errors reulting in 500.
}

type ApiMethodHandlers = {
  [key in Uppercase<Method>]?: NextApiHandler;
};

function errorHandler(err: unknown, res: NextApiResponse<ErrorResponse>) {
  if (createHttpError.isHttpError(err) && err.expose) {
    // Handle all errors thrown by http-errors module, except errors
    // with statusCode >= 500 (these should not be exposed).
    return res.status(err.statusCode).json({ error: { message: err.message } });
  } else if (err instanceof ZodError) {
    // Handle zod validation errors.
    const message = err.issues.map((issue) => issue.message).join(', ');
    return res.status(400).json({ error: { message } });
  } else {
    // Default to 500 server error.
    logger.error(err);
    const body = {
      error: { message: 'Internal Server Error' },
      status: createHttpError.isHttpError(err) ? err.statusCode : 500
    };
    return res.status(500).json(body);
  }
}

/**
 * Initializing the cors middleware. You can read more about the
 * available options here:
 * https://github.com/expressjs/cors#configuration-options.
 *
 * @param {ApiMethodHandlers} handler
 * @returns
 */
const getCors = (handler: ApiMethodHandlers) => {
  const corsOptions: CorsOptions = {
    methods: Object.keys(handler)
  };
  const cors = Cors({
    ...corsOptionsDefault,
    ...corsOptions
  });
  return cors;
};

export function apiHandler(handler: ApiMethodHandlers) {
  return async (req: NextApiRequest, res: NextApiResponse<ErrorResponse>) => {
    await runMiddleware(req, res, getCors(handler));
    try {
      const method = req.method ? (req.method.toUpperCase() as keyof ApiMethodHandlers) : undefined;

      if (!method) {
        throw new createHttpError.MethodNotAllowed(`No method specified on path ${req.url}!`);
      }

      // Check if handler supports current HTTP method.
      const methodHandler = handler[method];
      if (!methodHandler) {
        // Respond to HEAD request anyway.
        if (method === 'HEAD') {
          res.status(200).end();
        }
        // Else throw error.
        throw new createHttpError.MethodNotAllowed(`Method ${req.method} Not Allowed on path ${req.url}`);
      }

      // Call method handler.
      await methodHandler(req, res);
    } catch (err) {
      // Global error handler.
      errorHandler(err, res);
    }
  };
}
