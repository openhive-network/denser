
import {HealthCheckerService, ApiChecker, HealthCheckerComponent } from "@hiveio/healthchecker-component";
import { HealthChecker } from "@hiveio/wax";
import { useEffect, useState } from "react";
import {hiveChainService} from "@transaction/lib/hive-chain-service"
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

export const useHealthChecker = (key: string, apiCheckers: ApiChecker[] | undefined, endpointKey: string, shouldSetOnlineClient: boolean, enableLogs: boolean | undefined) => {
  const [healthCheckerService, setHealthCheckerService] = useState<HealthCheckerService | undefined>(undefined);
  const [endpoint] = useLocalStorage(endpointKey, siteConfig.endpoint);

  const changeEndpoint = async (newEndpoint: string | null) => {
  if (newEndpoint) {
    await hiveChainService.setHiveChainEndpoint(newEndpoint);
    if (shouldSetOnlineClient) await hbauthService.setOnlineClient({ node: newEndpoint });
  }
  }

  const startHealthCheckerService = async () => {
    if (apiCheckers) {
      const healthChecker = new HealthChecker();
      const hcService = new HealthCheckerService(
        key,
        apiCheckers,
        DEFAULTS_ENDPOINTS,
        healthChecker,
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
