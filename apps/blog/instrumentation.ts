import {commonRegister} from '@hive/ui/lib/common-instrumentation';
import * as Sentry from '@sentry/nextjs';
import type { Instrumentation } from 'next';
import { installServiceUnavailableStatus, markServiceUnavailableRequest } from './lib/service-unavailable';

export async function register() {
  await commonRegister('blog');

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ServerResponse } = await import('node:http');
    installServiceUnavailableStatus(ServerResponse);
  }

  if (!!process.env.REACT_APP_SENTRY_DSN && process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (!!process.env.REACT_APP_SENTRY_DSN && process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  markServiceUnavailableRequest(error, request);
  if (process.env.REACT_APP_SENTRY_DSN) await Sentry.captureRequestError(error, request, context);
};
