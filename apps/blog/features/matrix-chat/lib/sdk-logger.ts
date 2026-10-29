import { createMatrixSdkLogger } from '@/blog/features/matrix-chat/lib/sdk-log-routing';
import { getLogger } from '@ui/lib/logging';

/** The Matrix client's logger, into denser's log (see `createMatrixSdkLogger`) */
export const matrixSdkLogger = createMatrixSdkLogger(
  getLogger('app'),
  typeof window === 'undefined' ? undefined : window
);
