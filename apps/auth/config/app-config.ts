import 'reflect-metadata';
import {
    validate,
    validateSync,
    validateOrReject,
    Contains,
    IsInt,
    Length,
    IsEmail,
    IsFQDN,
    IsDate,
    Min,
    Max,
    IsUrl,
    IsNotEmpty,
    IsEnum,
    ValidateNested
} from 'class-validator';
import { Type, plainToClass } from 'class-transformer';
import config from 'config';

enum LogLevel {
    'off',
    'fatal',
    'error',
    'warn',
    'info',
    'debug',
    'trace',
    'all'
}

class ServerConfig {
    @IsNotEmpty()
    secret_cookie_password: string;
}

export class AppConfig {
    @IsUrl()
    @IsNotEmpty()
    api_endpoint: string;

    @IsNotEmpty()
    app_name: string;

    @IsUrl()
    @IsNotEmpty()
    images_endpoint: string;

    logging_browser_enabled!: boolean

    @IsEnum(LogLevel)
    logging_log_level: LogLevel;

    @IsUrl()
    @IsNotEmpty()
    site_domain: string;

    @ValidateNested()
    @Type(() => ServerConfig)
    server: ServerConfig;
}


const appConfig = new AppConfig();
appConfig.api_endpoint;

