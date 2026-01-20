import {commonRegister} from '@hive/ui/lib/common-instrumentation';
import * as Sentry from '@sentry/nextjs';

export async function register() {
  await commonRegister('blog');

  if (!!process.env.REACT_APP_SENTRY_DSN && process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (!!process.env.REACT_APP_SENTRY_DSN && process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = !!process.env.REACT_APP_SENTRY_DSN ? Sentry.captureRequestError : undefined;
