import {AbstractUniverseLog} from 'universe-log';
export class Log extends AbstractUniverseLog {
    public static log(): Log {
        return Log.INSTANCE;
    }
    private static INSTANCE: Log = new Log();

    private constructor() {
        super({
            levelEnvs: ['REACT_APP_LOGGING_LOG_LEVEL'],
            metadata: {
                library: '@hiveio/content-renderer'
            }
        });
    }
}
