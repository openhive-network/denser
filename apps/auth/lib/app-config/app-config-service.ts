import config from 'config';
import { IAppConfig } from './app-config-schema';
export class AppConfigService {
    static appConfig: IAppConfig;

    static get config() {
        if (!AppConfigService.appConfig) {
            AppConfigService.appConfig = config.util.toObject();
            Object.freeze(AppConfigService.appConfig);
        }
        return AppConfigService.appConfig;
    }
}
