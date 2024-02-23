import {AbstractUniverseLog} from 'universe-log';

export class Log extends AbstractUniverseLog {
    public static log(): Log {
        return Log.INSTANCE;
    }
    private static INSTANCE: Log = new Log();

    private constructor() {
        super({
            levelEnvs: ['HIVE_CONTENT_RENDERER_LOG_LEVEL', 'ENGRAVE_LOG_LEVEL'],
            metadata: {
                library: '@hiveio/content-renderer'
            }
        });
    }
}
