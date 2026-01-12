import { createMiddleware } from '@hive/middleware/lib/common';

// Wallet middleware: no root redirect (stays at /)
export const middleware = createMiddleware();
