import { apiSetsOfApp, resolveApiSetsConfig, type IApiSetsConfig } from '@ui/config/api-sets';
import {
  configuredAIDomain,
  configuredAllowedApiNodes,
  configuredApiEndpoint,
  configuredApiSetPreferences,
  configuredFypApiUrl,
  configuredHivemindRestNodes,
  configuredImagesEndpoint,
  configuredRestApiEndpoint
} from '@ui/config/public-vars';

let config: IApiSetsConfig | undefined;

/** The API sets config of the browser's app, from the same `REACT_APP_*` settings the server reads. */
export const getBrowserApiSetsConfig = (): IApiSetsConfig => {
  config ??= resolveApiSetsConfig(
    {
      apiEndpoint: configuredApiEndpoint,
      allowedNodes: configuredAllowedApiNodes,
      restApiEndpoint: configuredRestApiEndpoint,
      hivemindRestNodes: configuredHivemindRestNodes,
      aiDomain: configuredAIDomain,
      fypApiUrl: configuredFypApiUrl,
      setPreferences: configuredApiSetPreferences,
      excluded: [configuredImagesEndpoint]
    },
    apiSetsOfApp(process.env.DENSER_APP)
  );
  return config;
};
