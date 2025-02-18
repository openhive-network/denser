import { transformError } from '@hive/transaction/lib/transform-error';
import ErrorToastContent from '@ui/components/error-toast-content';
import { toast, Toast } from '@ui/components/hooks/use-toast';

export function handleError<T>(error: any, ctx?: { method: string; params: T }, toastOptions?: Toast) {
  const { errorTitle, fullError, isWellKnownError } = transformError<T>(error, ctx);
  toast({
    description: (
      <ErrorToastContent errorTitle={errorTitle} fullError={fullError} displayControls={!isWellKnownError} />
    ),
    variant: 'destructive',
    ...toastOptions
  });
}
