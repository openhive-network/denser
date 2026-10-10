import type { Page } from '@playwright/test';
import {
  installBroadcastInterceptor as interceptBroadcasts,
  type BroadcastInterceptor
} from '../../../../../playwright/support/broadcast/interceptor.ts';
import { FIXTURE_API_PORT } from './apiStub';

export type { BroadcastInterceptor, InterceptedBroadcast } from '../../../../../playwright/support/broadcast/interceptor.ts';

/**
 * Captures every transaction the page broadcasts to the stub node (apiStub.ts) and answers it,
 * and `verify_authority`, with a success; the stub serves every other call. Assert on the captured
 * operation with walletOperations.ts. Call before `page.goto(...)`.
 */
export const installBroadcastInterceptor = (page: Page): Promise<BroadcastInterceptor> =>
  interceptBroadcasts(page, (url) => url.hostname === '127.0.0.1' && url.port === String(FIXTURE_API_PORT));
