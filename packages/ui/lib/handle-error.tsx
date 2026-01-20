'use client';

import * as Sentry from "@sentry/nextjs";
import { transformError } from '@hive/transaction/lib/transform-error';
import ErrorToastContent from '@ui/components/error-toast-content';
import { toast, Toast } from '@ui/components/hooks/use-toast';
import env from "@beam-australia/react-env";

export function handleError<T>(error: any, ctx?: { method: string; params: T }, toastOptions?: Toast) {
  const { errorTitle, fullError, isWellKnownError } = transformError<T>(error, ctx);

  if (!!env('SENTRY_DSN') && !isWellKnownError)
    Sentry.captureException(fullError);

  toast({
    description: (
      <ErrorToastContent errorTitle={errorTitle} fullError={fullError} displayControls={!isWellKnownError} />
    ),
    variant: 'destructive',
    ...toastOptions
  });
}
