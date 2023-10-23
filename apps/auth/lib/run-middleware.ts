import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Helper method to wait for a middleware to execute before continuing,
 * and to throw an error when an error happens in a middleware.
 * See https://github.com/vercel/next.js/blob/canary/examples/api-routes-cors/pages/api/cors.ts
 *
 * @param {NextApiRequest} req
 * @param {NextApiResponse} res
 * @param {Function} fn
 * @returns
 */
export function runMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    fn: Function
) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result: any) => {
            if (result instanceof Error) {
                return reject(result)
            }

            return resolve(result)
        })
    })
}
