import { z } from 'zod';

const appConfigSchema = z.object({
    app_name: z.string().min(1),
    logging_browser_enabled: z.boolean(),
    logging_log_level: z.enum(['off', 'fatal', 'error', 'warn', 'info', 'debug', 'trace', 'all']),
    api_endpoint: z.string().url(),
});

const myObject = {
    app_name: 'yogi',
    logging_browser_enabled: true,
    logging_log_level: 'info',
    api_endpoint: "http://api.hive.blog??s=2"
}


try {
    const result = appConfigSchema.parse(myObject);
    console.log('result: %o', result);
} catch (error) {
    console.log(error.errors);
}

