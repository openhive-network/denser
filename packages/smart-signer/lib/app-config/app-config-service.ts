import config from 'config';
import { TAppConfig } from './app-config-schema';

export class AppConfigService {
    static #appConfig: TAppConfig;

    static get config() {
        if (!AppConfigService.#appConfig) {
            AppConfigService.#appConfig = config.util.toObject();
            Object.freeze(AppConfigService.#appConfig);
        }
        return AppConfigService.#appConfig;
    }
}
