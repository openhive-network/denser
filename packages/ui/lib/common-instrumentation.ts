const dumpStartupEnvironment = () => {
  const executionEnv = process.env.NODE_ENV ?? 'test';
  const isProduction = executionEnv === 'production';
  const doDump = (process.env.DENSER_SERVER_ENV_DUMP ?? 'false') === 'true' ;

  if (isProduction && doDump === false) {
    console.log('Missing DENSER_SERVER_ENV_DUMP variable or set to false, skipping environment dump in production mode.');
    return;
  }

  console.log('Attempting to dump Denser specific environment variables (you can skip it by unsetting DENSER_SERVER_ENV_DUMP variable or set it to false');

  const vars = Object.keys(process.env);
  const filteredVars = vars.filter((key) => {
    return key.startsWith('DENSER_') || key.startsWith('HIVE_') || key.startsWith('NEXT_PUBLIC_') || key.startsWith('REACT_APP_');
  });

  const env = filteredVars.sort().forEach((key) => {
    const value = process.env[key];
    if (value) {
      console.log(`${key}: ${value}`);
    } else {
      console.log(`Variable ${key} is <undefined> !!!`);
    }
  });

  console.log('Denser startup environment variables dump finsihed');
};

export async function commonRegister(appName: string): Promise<void> {
  console.log(`Starting up the '${appName}' application server...`);
  dumpStartupEnvironment();
}

