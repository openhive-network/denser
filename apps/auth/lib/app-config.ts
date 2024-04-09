import { z } from 'zod';

const appConfigSchema = z.object({
    api_endpoint: z.string().url(),
    app_name: z.string().min(1),
    images_endpoint: z.string().url(),
    logging_browser_enabled: z.boolean(),
    logging_log_level: z.enum(['off', 'fatal', 'error', 'warn', 'info', 'debug', 'trace', 'all']),
    site_domain: z.string().url(),

    server: z.object({
        secret_cookie_password: z.string().min(1),
    })
});

export type AppConfigSchema = z.infer<typeof appConfigSchema>;
