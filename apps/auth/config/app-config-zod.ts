import { z } from 'zod';
import config from 'config';
import 'reflect-metadata';


class Book {
    api_endpoint!: string;
}

const appConfigSchema = z.object({
    api_endpoint: z.string().url(),
    app_name: z.string().min(1),
    images_endpoint: z.string().url(),
    logging_browser_enabled: z.boolean(),
    logging_log_level: z.enum(['off', 'fatal', 'error', 'warn', 'info', 'debug', 'trace', 'all']),
    site_domain: z.string().url(),

    server: z.object({
        secret_cookie_password: z.string().min(1),
    }),
});

type AppConfigSchema = z.infer<typeof appConfigSchema>;

const Be = new Book();
config.get(Be.api_endpoint);

let Ce!: AppConfigSchema;
config.get(Ce.api_endpoint);
