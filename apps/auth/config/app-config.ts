import { ZodTypeAny, z } from 'zod';
import { MyLoggerLogLevels } from '@ui/lib/logger';

const kwa: string[] = Object.keys(MyLoggerLogLevels);

const appConfigSchema = z.object({
    app_name: z.string().min(1),
    logging_browser_enabled: z.boolean(),
    logging_log_level: z.enum(['off', 'fatal', 'error', 'warn', 'info', 'debug', 'trace', 'all']),
    api_endpoint: z.string().url(),
});

type AppConfigSchema = z.infer<typeof appConfigSchema>;

