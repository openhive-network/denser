import { ApiChecker, HealthCheckerComponent } from '@hiveio/healthchecker-component';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components/accordion';
import { useHealthChecker } from '@ui/hooks/useHealthChecker';
import { useEffect, useState } from 'react';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { DEFAULT_AI_ENDPOINTS } from './lib/utils';

const HealthChecker = () => {
  const [nodeApiCheckers, setNodeApiCheckers] = useState<ApiChecker[] | undefined>(undefined);
  const [aiSearchApiCheckers, setAiSearchApiCheckers] = useState<ApiChecker[] | undefined>(undefined);

  const nodeHcService = useHealthChecker(
    'node-api',
    nodeApiCheckers,
    'node-endpoint',
    hiveChainService.setHiveChainEndpoint
  );
  const aiSearchHcService = useHealthChecker(
    'ai-search',
    aiSearchApiCheckers,
    'ai-search-endpoint',
    hiveChainService.setAiSearchEndpoint,
    DEFAULT_AI_ENDPOINTS
  );

  const createApiCheckers = async () => {
    const hiveChain = await hiveChainService.getHiveChain();
    const nodeApiCheckers: ApiChecker[] = [
      {
        title: 'Condenser - Get accounts',
        method: hiveChain.api.condenser_api.get_accounts,
        params: [['guest4test']],
        validatorFunction: (data) => (data[0].name === 'guest4test' ? true : 'Get block error')
      },
      {
        title: 'Bridge - Get post',
        method: hiveChain.api.bridge.get_post,
        params: { author: 'guest4test', permlink: '6wpmjy-test', observer: '' },
        validatorFunction: (data) => (data.author === 'guest4test' ? true : 'Get post error')
      }
    ];
    const aiSearchApiCheckers: ApiChecker[] = [
      {
        title: 'AI search',
        method: hiveChain.restApi['hivesense-api'].similarposts,
        params: {
          pattern: 'test',
          tr_body: 100,
          posts_limit: 20
        },
        validatorFunction: (data) => (data[0] ? true : 'AI search error')
      }
    ];
    setNodeApiCheckers(nodeApiCheckers);
    setAiSearchApiCheckers(aiSearchApiCheckers);
  };

  useEffect(() => {
    createApiCheckers();
  }, []);
  return (
    <div className="p-8">
      <Accordion type="single" collapsible defaultValue="main-hc">
        <AccordionItem value="main-hc">
          <AccordionTrigger>API Endpoint</AccordionTrigger>
          <AccordionContent>
            {!!nodeHcService && (
              <HealthCheckerComponent className="m-4" healthCheckerService={nodeHcService} />
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="search-hc">
          <AccordionTrigger>Endpoint for AI search</AccordionTrigger>
          <AccordionContent>
            {!!aiSearchHcService && (
              <HealthCheckerComponent className="m-4" healthCheckerService={aiSearchHcService} />
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default HealthChecker;
