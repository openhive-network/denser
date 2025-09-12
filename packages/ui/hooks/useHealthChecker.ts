
import {HealthCheckerService, ApiChecker } from "@hiveio/healthchecker-component";
import { useEffect, useState } from "react";
import { hiveChainService} from "@transaction/lib/hive-chain-service"
import { hbauthService } from '@smart-signer/lib/hbauth-service';
import { useLocalStorage } from 'usehooks-ts';
import { siteConfig } from "@ui/config/site";

const DEFAULTS_ENDPOINTS = [
  "https://api.hive.blog",
  "https://api.openhive.network",
  "https://anyx.io",
  "https://techcoderx.com",
  "https://hive.roelandp.nl",
  "https://api.deathwing.me",
  "https://api.c0ff33a.uk",
  "https://hive-api.arcange.eu",
  "https://hive-api.3speak.tv",
  "https://hiveapi.actifit.io",
];

/**
 * React hook to prepare everything to call and get HC service. Put necessary params there and create HC for component.
 * @param key identificator of HC instance
 * @param apiCheckers list of checkers for HC
 * @param endpointKey where your endpoint is stored in localstorage
 * @param hiveChainServiceMethod name of hive chain service method to handle data change in Wax
 * @param defaultEndpoints write this for custom list of default API providers
 * @param enableLogs true for HC messages
 * @returns
 */
export const useHealthChecker = (
  key: string,
  apiCheckers: ApiChecker[] | undefined,
  endpointKey: string,
  hiveChainServiceMethod: (newEndpoint: string) => Promise<void>,
  defaultEndpoints: string[] = DEFAULTS_ENDPOINTS,
  enableLogs: boolean = false
) => {
  const [healthCheckerService, setHealthCheckerService] = useState<HealthCheckerService | undefined>(undefined);
  const [endpoint] = useLocalStorage(endpointKey, siteConfig.endpoint);

  const changeEndpoint = async (newEndpoint: string | null) => {
    if (newEndpoint) {
      const bindedHiveChainServiceMethod = hiveChainServiceMethod.bind(hiveChainService);
      await bindedHiveChainServiceMethod(newEndpoint);
    }
  }

  const startHealthCheckerService = async () => {
    if (apiCheckers) {
      const hcService = new HealthCheckerService(
        key,
        apiCheckers,
        defaultEndpoints,
        endpoint,
        changeEndpoint,
        enableLogs
      );
      setHealthCheckerService(hcService);
    }
  }

  useEffect(()=> {
    startHealthCheckerService();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiCheckers])

  return healthCheckerService;
}
