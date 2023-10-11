import { CorsOptions } from 'cors';

const resolveOptionOrigin = (origin: string = ''): boolean | string => {
    console.log(origin);
    if (origin) {
        if (origin.toLowerCase() === "true") {
            return true;
        } else if (origin.toLowerCase() === "false") {
            return false;
        } else {
            return origin;
        }
    }
    return true;
};

//
// Default CORS options for npm package `nextjs-cors`.
// See https://github.com/yonycalsin/nextjs-cors
// See https://github.com/expressjs/cors
//
export const corsOptionsDefault: CorsOptions = {
    origin: resolveOptionOrigin(process.env.DENSER_SERVER_API_CORS_ALLOW_ORIGIN),
    methods: process.env.DENSER_SERVER_API_CORS_ALLOW_METHODS || "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: process.env.DENSER_SERVER_API_CORS_ALLOW_HEADERS || undefined,
    exposedHeaders: process.env.DENSER_SERVER_API_CORS_EXPOSE_HEADERS || undefined,
    credentials: process.env.DENSER_SERVER_API_CORS_ALLOW_CREDENTIALS == "true" || false,
    maxAge: process.env.DENSER_SERVER_API_CORS_MAX_AGE
        && parseInt(process.env.DENSER_SERVER_API_CORS_MAX_AGE) || undefined,
    preflightContinue: false,
    optionsSuccessStatus: process.env.DENSER_SERVER_API_CORS_OPTIONS_SUCCESS_STATUS
        && parseInt(process.env.DENSER_SERVER_API_CORS_OPTIONS_SUCCESS_STATUS) || 204,
};
