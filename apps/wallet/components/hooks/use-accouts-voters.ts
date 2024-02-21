import { convertStringToBig } from '@ui/lib/helpers';
import { useQuery } from '@tanstack/react-query';
import { getAccounts } from '@transaction/lib/hive';
import Big from 'big.js';
import { FullAccount } from '@transaction/lib/app-types';

export const useAccountQuery = (username: string[], totalShares: Big, totalVestingFund: Big) => {
  const calculateProxyHp = (account: FullAccount) => {
    for (let i = 0; i < account.proxied_vsf_votes.length; i++) {
      const vesting_hivef = totalShares.times(Big(account.proxied_vsf_votes[i]).div(totalVestingFund));
      return vesting_hivef.times(0.000001);
    }
  };
  return useQuery(['accountData', username], () => getAccounts(username), {
    enabled: Boolean(username),
    select: (users) => {
      return users.map((user) => ({
        name: user.name,
        hp: parseFloat(
          totalShares.times(convertStringToBig(user.vesting_shares.amount).div(totalVestingFund)).toFixed(2)
        ),
        proxy: calculateProxyHp(user)?.toFixed(2)
      }));
    }
  });
};
