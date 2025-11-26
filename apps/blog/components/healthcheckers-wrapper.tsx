'use client';
import { ApiChecker, HealthCheckerComponent } from '@hiveio/healthchecker-component'
import { FullAccount } from '@transaction/lib/app-types';
import { Community, Entry, MixedPostsResponse } from '@transaction/lib/extended-hive.chain';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components'
import { useHealthChecker } from '@ui/hooks/useHealthChecker';
import { CircleCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

type NodeApiCheckers = [
  ApiChecker<FullAccount[]>,
  ApiChecker<Entry | null>,
  ApiChecker<Community[] | null>,
  ApiChecker<Entry[] | null>
];

type AiSearchApiCheckers = [ApiChecker<MixedPostsResponse>, ApiChecker<Entry[]>];

const HealthCheckersWrapper = () => {
  const [nodeApiCheckers, setNodeApiCheckers] = useState<NodeApiCheckers | undefined>(undefined);
  const [aiSearchApiCheckers, setAiSearchApiCheckers] = useState<AiSearchApiCheckers | undefined>(undefined);

  const DEFAULT_AI_ENDPOINTS = [
    'https://api.hive.blog',
    'https://api.syncad.com',
    'https://api.openhive.network',
    'https://api.dev.openhive.network'
  ];

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
    const nodeApiCheckers: NodeApiCheckers = [
      {
        title: 'Condenser - Get accounts',
        method: hiveChain.api.condenser_api.get_accounts,
        params: [['guest4test']],
        validatorFunction: (data: FullAccount[]) =>
          Array.isArray(data) &&
          data[0] &&
          typeof data[0] === 'object' &&
          'name' in data[0] &&
          data[0].name === 'guest4test'
            ? true
            : 'Get account error'
      },
      {
        title: 'Bridge - Get post',
        method: hiveChain.api.bridge.get_post,
        params: { author: 'guest4test', permlink: '6wpmjy-test', observer: '' },
        validatorFunction: (data) => (data?.author === 'guest4test' ? true : 'Bridge API get post error')
      },
      {
        title: 'Bridge - List Communities',
        method: hiveChain.api.bridge.list_communities,
        params: {query: null, sort: 'rank', observer: 'hive.blog' },
        validatorFunction: (data) => (data?.length && data.length > 0 ? true : 'Bridge API get community list error')
      },
      {
        title: 'Bridge - Get Ranked Posts',
        method: hiveChain.api.bridge.get_ranked_posts,
        params: {observer: 'hive.blog', tag: '', limit: 10, sort: 'trending'},
        validatorFunction: (data) => (data?.length && data.length > 0 ? true : 'Bridge API get ranked posts error')
      }
    ];
    const aiSearchApiCheckers: AiSearchApiCheckers = [
      {
        title: 'AI search',
        method: hiveChain.restApi['hivesense-api'].posts.search,
        params: {
          q: 'test',
          truncate: 100,
          result_limit: 10,
          full_posts: 10,
        },
        validatorFunction: (data) => (!!data[0] ? true : 'AI search error')
      },
      {
        title: 'AI similar posts',
        method: hiveChain.restApi['hivesense-api'].posts.author.permlink.similar,
        params: {
          author: 'thebeedevs',
          permlink: 'clive-updates-clive-in-spring-colors',
          truncate: 100,
          result_limit: 1

        },
        validatorFunction: (data) => (!!data[0] ? true : 'AI similar posts error')
      }
    ];
    setNodeApiCheckers(nodeApiCheckers);
    setAiSearchApiCheckers(aiSearchApiCheckers);
  };

  useEffect(() => {
    createApiCheckers();
  }, []);

  return (
    <div className='p4  lg:px-48'>
      <div className='mx-auto flex flex-col items-center py-8'>
        <h3 className='py-4 text-lg'>API switch and HealthChecker</h3>
        <p className='mb-4 text-center text-muted-foreground'>You can switch your provider here. Use &quot;Continuos Check&quot; to start evaluating them.</p>
        <p className=' mb-4 text-center text-muted-foreground'>
          For the best experience run HealthChecker use only providers with <CircleCheck className='inline-block w-4 h-4 text-green-600' /> icon.
        </p>
        <p className='text-center text-muted-foreground'>
          Click &quot;Switch to Best&quot; button for Healthchecker to automatically select the best possible API.
        </p>
      </div>
      <Accordion type='single' collapsible defaultValue='main-hc'>
        <AccordionItem value='main-hc'>
          <AccordionTrigger>API Endpoint</AccordionTrigger>
          <AccordionContent>
            {!!nodeHcService && (
              <HealthCheckerComponent className='m-4' healthCheckerService={nodeHcService} />
            )}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value='search-hc'>
          <AccordionTrigger>Endpoint for AI search</AccordionTrigger>
          <AccordionContent>
            {!!aiSearchHcService && (
              <HealthCheckerComponent className='m-4' healthCheckerService={aiSearchHcService} />
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

export default HealthCheckersWrapper
