import env from "@beam-australia/react-env";
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const corsOptions: {
  allowCredentials: boolean;
  allowedHeaders: string[];
  allowedMethods: string[];
  allowedOrigins: string[];
  exposedHeaders: string[];
  maxAge?: number;
} = {
  allowCredentials: env('DENSER_SERVER_API_CORS_ALLOW_CREDENTIALS') == "true",
  allowedHeaders: (env('DENSER_SERVER_API_CORS_ALLOW_HEADERS') || "")
      .trim().split(/[\s,]+/),
  allowedMethods: (env('DENSER_SERVER_API_CORS_ALLOW_METHODS') || "")
      .trim().split(/[\s,]+/),
  allowedOrigins: (env('DENSER_SERVER_API_CORS_ALLOW_ORIGIN') || "")
      .trim().split(/[\s,]+/),
  exposedHeaders: (env('DENSER_SERVER_API_CORS_EXPOSE_HEADERS') || "")
      .trim().split(/[\s,]+/),
  maxAge: env('DENSER_SERVER_API_CORS_MAX_AGE')
      && parseInt(env('DENSER_SERVER_API_CORS_MAX_AGE')) || undefined
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (request.nextUrl.pathname.startsWith('/disable/api')) {
    if (env('DENSER_SERVER_API_CORS_DISABLE') !== "true") {
      // Check allowed origins and set header.
      const origin = request.headers.get('origin') ?? '';
      if (corsOptions.allowedOrigins.includes('*')
          || corsOptions.allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      }
      // Set other CORS headers.
      if (corsOptions.allowCredentials) {
        response.headers.set("Access-Control-Allow-Credentials",
            corsOptions.allowCredentials.toString());
      }
      if (corsOptions.allowedHeaders.length > 0) {
        response.headers.set("Access-Control-Allow-Headers",
            corsOptions.allowedHeaders.join(","));
      }
      response.headers.set("Access-Control-Allow-Methods",
          corsOptions.allowedMethods.join(","));
      if (corsOptions.exposedHeaders.length > 0) {
        response.headers.set("Access-Control-Expose-Headers",
            corsOptions.exposedHeaders.join(","));
      }
      if (corsOptions.maxAge !== undefined) {
        response.headers.set("Access-Control-Max-Age",
            corsOptions.maxAge?.toString() ?? "");
      }
    }
  }

  return response;
};

export const config = {
  matcher: "/disable/api/:path*",
};
