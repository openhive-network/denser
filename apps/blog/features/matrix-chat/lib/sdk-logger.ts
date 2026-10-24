import type { MatrixSdkLogger } from '@/blog/features/matrix-chat/lib/sdk-logger-type';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');
const ignore = () => undefined;

/**
 * The Matrix client's logger: its errors go to denser's log as errors, its warnings and info at
 * debug (the SDK warns about routine things, such as the push rules it adds), the rest is dropped.
 */
export const matrixSdkLogger: MatrixSdkLogger = {
  trace: ignore,
  debug: ignore,
  info: (...message: unknown[]) => logger.debug('Matrix chat: %o', message),
  warn: (...message: unknown[]) => logger.debug('Matrix chat: %o', message),
  error: (...message: unknown[]) => logger.error('Matrix chat: %o', message),
  getChild: () => matrixSdkLogger
};
