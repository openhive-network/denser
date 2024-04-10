import config from 'config';
import { AppConfig } from './app-config-schema';
export class AppConfigService {
    static appConfig: AppConfig;

    static get config() {
        if (!AppConfigService.appConfig) {
            AppConfigService.appConfig = config.util.toObject();
            Object.freeze(AppConfigService.appConfig);
        }
        return AppConfigService.appConfig;
    }
}
