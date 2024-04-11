import config from 'config';
import { TAppConfig, appConfigSchema } from './app-config-schema';
import { isBrowser } from '@ui/lib/logger';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

export class AppConfigService {
    static #appConfig: TAppConfig;

    static #validate(configObject: any) {
        // Don't validate in browser. We assume that validation was done
        // on server.
        if (isBrowser()) return;

        try {
            appConfigSchema.parse(configObject);
            logger.info("Application Config is OK");
          } catch (error) {
            const parts = [
              'Application has been stopped,',
              'because validation of configuration failed.',
              'Error is: %o'
            ];
            logger.error(parts.join(' '), error);
            // TODO Is exiting process a good idea here?
            // Exit application, means shut down server process.
            process.exit(1)
          }
    }

    static init() {
        if (!AppConfigService.#appConfig) {
            const configObject = config.util.toObject();
            AppConfigService.#validate(configObject)
            AppConfigService.#appConfig = configObject;
            Object.freeze(AppConfigService.#appConfig);
        }
    }

    static get config() {
        AppConfigService.init();
        return AppConfigService.#appConfig;
    }
}
