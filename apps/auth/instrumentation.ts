import {
    validate,
    validateSync,
    validateOrReject,
    ValidationError,
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
import { plainToClass } from 'class-transformer';
import config from 'config';
import { AppConfig } from '@/auth/config/app-config';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

export function register() {
    const appConfig = plainToClass(AppConfig, config.util.toObject());
    const result: ValidationError[] = validateSync(appConfig, { validationError: { target: false } });
    if (result.length > 0) {
        logger.error('Validation result: %o', result);
        throw new Error("Invalid Application Config");
    } else {
        logger.info("Application Config is OK");
    }
}
