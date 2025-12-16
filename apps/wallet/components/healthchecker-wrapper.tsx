'use client';
import { ApiChecker, HealthCheckerComponent } from '@hiveio/healthchecker-component'
import { FullAccount } from '@transaction/lib/app-types';
import { HiveOpTypeSchema, IGetOperationsByAccountResponse, SavingsWithdrawals } from '@transaction/lib/extended-hive.chain';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { useHealthChecker } from '@ui/hooks/useHealthChecker';
import { CircleCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getChain } from '@transaction/lib/chain';

type NodeApiCheckers = [
  ApiChecker<FullAccount[]>,
  ApiChecker<SavingsWithdrawals>,
  ApiChecker<IGetOperationsByAccountResponse>,
  ApiChecker<HiveOpTypeSchema[]>
];

const HealthCheckerWrapper = () => {

    const [walletApiCheckers, setWalletApiCheckers] = useState<NodeApiCheckers | undefined>(undefined);

    const createApiCheckers = async () => {
      const hiveChain = await getChain();
      const apiCheckers: NodeApiCheckers = [
        {
          title: "Condenser - Get accounts",
          method: hiveChain.api.condenser_api.get_accounts,
          params: [["guest4test"]],
        validatorFunction: (data) =>
          Array.isArray(data) &&
          data[0] &&
          typeof data[0] === 'object' &&
          'name' in data[0] &&
          data[0].name === 'guest4test'
            ? true
            : 'Get accounts error'
        },
        {
          title: "Database - saving withdrawals",
          method: hiveChain.api.database_api.find_savings_withdrawals,
          params: {account: "guest4test"},
          validatorFunction: data => !!data.withdrawals ? true : "Get saving withdrawals error",
        },
        {
          title: "Hivemind API",
          method: hiveChain.restApi['hivemind-api'].accountsOperations,
          params: {'account-name': "gtg", 'page-size': 10, 'observer-name': "gtg", 'data-size-limit': 200000},
          validatorFunction: data => !!data.total_operations ? true : "Get saving withdrawals error",
        },
        {
          title: "HAFAH API",
          method: hiveChain.restApi["hafah-api"]['operation-types'],
          params: {},
          validatorFunction: data => data.length > 0 ? true : "Get saving withdrawals error",
        },
     ]
      setWalletApiCheckers(apiCheckers);
    }
  const healthCheckerService = useHealthChecker("wallet-api", walletApiCheckers, "node-endpoint", hiveChainService.setHiveChainEndpoint );
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
      {!!healthCheckerService && (
        <HealthCheckerComponent className='m-4' healthCheckerService={healthCheckerService} />
      )}
    </div>
  )
}

export default HealthCheckerWrapper
