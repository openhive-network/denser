import type { MatrixSdkLogger } from '@/blog/features/matrix-chat/lib/sdk-logger-type';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');
const ignore = () => undefined;

/** The Matrix client's logger: its warnings and errors go to denser's log, the rest is dropped. */
export const matrixSdkLogger: MatrixSdkLogger = {
  trace: ignore,
  debug: ignore,
  info: ignore,
  warn: (...message: unknown[]) => logger.warn('Matrix chat: %o', message),
  error: (...message: unknown[]) => logger.error('Matrix chat: %o', message),
  getChild: () => matrixSdkLogger
};
