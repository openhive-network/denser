import { getLogger } from '@ui/lib/logging';

const logger = getLogger('api-calls');

const isServer = typeof window === 'undefined';

// Only read env vars on server side
const DEBUG_API_CALLS = isServer ? process.env.DEBUG_API_CALLS === 'true' : false;
const DEBUG_API_LEVEL = isServer ? process.env.DEBUG_API_LEVEL || 'all' : 'all';
const DEBUG_API_SLOW_THRESHOLD = isServer
  ? parseInt(process.env.DEBUG_API_SLOW_THRESHOLD || '1000', 10)
  : 1000;

export interface ApiCallLog {
  api: string;
  params: unknown;
  status: 'success' | 'error';
  duration_ms: number;
  error?: string;
}

export function isApiLoggingEnabled(): boolean {
  return DEBUG_API_CALLS;
}

export function logApiCall(log: ApiCallLog): void {
  if (!DEBUG_API_CALLS) return;

  const shouldLog =
    DEBUG_API_LEVEL === 'all' ||
    (DEBUG_API_LEVEL === 'slow' && log.duration_ms >= DEBUG_API_SLOW_THRESHOLD) ||
    (DEBUG_API_LEVEL === 'errors' && log.status === 'error');

  if (!shouldLog) return;

  const logData = {
    api: log.api,
    params: log.params,
    status: log.status,
    duration_ms: log.duration_ms,
    ...(log.error && { error: log.error })
  };

  if (log.status === 'error') {
    logger.error(logData, 'API call failed');
  } else if (log.duration_ms >= DEBUG_API_SLOW_THRESHOLD) {
    logger.warn(logData, 'Slow API call');
  } else {
    logger.info(logData, 'API call');
  }
}
