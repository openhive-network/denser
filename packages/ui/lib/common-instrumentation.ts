const DUMPED_PREFIXES = ['DENSER_', 'HIVE_', 'NEXT_PUBLIC_', 'REACT_APP_'];
// These reach every visitor anyway: NEXT_PUBLIC_* is inlined into the client bundle and
// REACT_APP_* is served to the browser at runtime, so their values are safe to log.
// Every other variable (DENSER_SERVER_* holds the cookie password, OAuth and chat secrets)
// is listed by name only.
const VALUE_LOGGED_PREFIXES = ['NEXT_PUBLIC_', 'REACT_APP_'];

/**
 * The startup dump's lines for `env`: each Denser-related variable, sorted by name, with its
 * value only when the variable is browser-public, and `<set>`, `<empty>` otherwise.
 */
export function formatStartupEnvironment(env: NodeJS.ProcessEnv): string[] {
  return Object.keys(env)
    .filter((key) => DUMPED_PREFIXES.some((prefix) => key.startsWith(prefix)))
    .sort()
    .map((key) => {
      const value = env[key];
      if (!value) return `${key}: <empty>`;
      return VALUE_LOGGED_PREFIXES.some((prefix) => key.startsWith(prefix)) ? `${key}: ${value}` : `${key}: <set>`;
    });
}

const dumpStartupEnvironment = () => {
  const executionEnv = process.env.NODE_ENV ?? 'test';
  const isProduction = executionEnv === 'production';
  const doDump = (process.env.DENSER_SERVER_ENV_DUMP ?? 'false') === 'true' ;

  if (isProduction && doDump === false) {
    console.log('Missing DENSER_SERVER_ENV_DUMP variable or set to false, skipping environment dump in production mode.');
    return;
  }

  console.log('Attempting to dump Denser specific environment variables (you can skip it by unsetting DENSER_SERVER_ENV_DUMP variable or set it to false');
  formatStartupEnvironment(process.env).forEach((line) => console.log(line));
  console.log('Denser startup environment variables dump finished');
};

export async function commonRegister(appName: string): Promise<void> {
  console.log(`Starting up the '${appName}' application server...`);
  dumpStartupEnvironment();

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Once per server process, before the first request: the engine choosing a node per API set.
    const [{ installServerApiSets }, { readApiSetsCookie }] = await Promise.all([
      import('@transaction/lib/api-sets/server'),
      import('./api-sets-request-cookie')
    ]);
    installServerApiSets({ app: appName, readCookie: readApiSetsCookie });
  }
}

