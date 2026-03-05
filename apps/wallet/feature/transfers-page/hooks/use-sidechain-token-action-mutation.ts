import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSignerClient } from '@smart-signer/lib/use-signer-client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { transactionService } from '@transaction/index';
import { logger } from '@ui/lib/logger';
import {
  SidechainAccountTransaction,
  SidechainWalletReward,
  getSidechainRewardsConfig,
  isSidechainRewardsConfigured
} from '@ui/lib/sidechain-rewards';

export type SidechainTokenAction = 'transfer' | 'stake' | 'unstake' | 'delegate';

type SidechainTokenActionParams =
  | {
      action: 'transfer';
      account: string;
      symbol: string;
      quantity: string;
      toAccount: string;
      memo?: string;
      customJsonId?: string;
    }
  | {
      action: 'stake';
      account: string;
      symbol: string;
      quantity: string;
      toAccount?: string;
      customJsonId?: string;
    }
  | {
      action: 'unstake';
      account: string;
      symbol: string;
      quantity: string;
      customJsonId?: string;
    }
  | {
      action: 'delegate';
      account: string;
      symbol: string;
      quantity: string;
      toAccount: string;
      customJsonId?: string;
    };

export const useSidechainTokenActionMutation = () => {
  const queryClient = useQueryClient();
  const { signerOptions } = useSignerClient();
  const { user } = useUserClient();
  const sidechainConfig = getSidechainRewardsConfig();
  const isSidechainConfigured = isSidechainRewardsConfigured(sidechainConfig);

  const toPositiveNumber = (value: string): number => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };

  return useMutation({
    mutationFn: async (params: SidechainTokenActionParams) => {
      if (!user.isLoggedIn || !signerOptions.username) {
        throw new Error('Please log in before signing a token transaction.');
      }

      if (!signerOptions.loginType) {
        throw new Error('Missing signer session. Please log in again with Hive Keychain.');
      }

      // Keep transaction service signer state in sync with the active client session.
      transactionService.setSignerOptions(signerOptions);

      let broadcastResult;

      if (params.action === 'transfer') {
        broadcastResult = await transactionService.transferSidechainToken(
          params.account,
          params.toAccount,
          params.symbol,
          params.quantity,
          params.memo || '',
          { observe: true },
          params.customJsonId
        );
      } else if (params.action === 'stake') {
        broadcastResult = await transactionService.stakeSidechainToken(
          params.account,
          params.symbol,
          params.quantity,
          params.toAccount,
          { observe: true },
          params.customJsonId
        );
      } else if (params.action === 'unstake') {
        broadcastResult = await transactionService.unstakeSidechainToken(
          params.account,
          params.symbol,
          params.quantity,
          { observe: true },
          params.customJsonId
        );
      } else {
        broadcastResult = await transactionService.delegateSidechainToken(
          params.account,
          params.toAccount,
          params.symbol,
          params.quantity,
          { observe: true },
          params.customJsonId
        );
      }

      const response = { ...params, broadcastResult };
      logger.info('Done sidechain token transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      const account = data.account;
      const normalizedAccount = account.trim().toLowerCase();

      // Instant optimistic UI update after successful broadcast.
      if (isSidechainConfigured) {
        const amountDelta = toPositiveNumber(data.quantity);
        const rewardQueryKey = [
          'sidechain-wallet-reward',
          sidechainConfig.token,
          sidechainConfig.source,
          account
        ] as const;
        const txQueryKey = [
          'sidechain-account-transactions',
          sidechainConfig.token,
          sidechainConfig.source,
          account
        ] as const;

        queryClient.setQueryData<SidechainWalletReward | null>(rewardQueryKey, (existing) => {
          if (!existing) {
            return existing;
          }

          let liquidAmount = existing.liquidAmount;
          let stakedAmount = existing.stakedAmount;
          let delegationAmount = existing.delegationAmount ?? 0;

          if (data.action === 'transfer') {
            const toAccount =
              'toAccount' in data && data.toAccount
                ? data.toAccount.trim().toLowerCase()
                : '';
            if (toAccount !== normalizedAccount) {
              liquidAmount = Math.max(0, liquidAmount - amountDelta);
            }
          } else if (data.action === 'stake') {
            liquidAmount = Math.max(0, liquidAmount - amountDelta);
            stakedAmount = Math.max(0, stakedAmount + amountDelta);
          } else if (data.action === 'unstake') {
            stakedAmount = Math.max(0, stakedAmount - amountDelta);
          } else if (data.action === 'delegate') {
            delegationAmount = Math.max(0, delegationAmount + amountDelta);
          }

          return {
            ...existing,
            liquidAmount,
            stakedAmount,
            delegationAmount,
            amount:
              existing.kind === 'balance' ? liquidAmount + stakedAmount : existing.amount
          };
        });

        queryClient.setQueryData<SidechainAccountTransaction[]>(txQueryKey, (existing) => {
          const toAccount =
            'toAccount' in data && data.toAccount ? data.toAccount : account;
          const memo = 'memo' in data && data.memo ? data.memo : '';
          const optimisticRow: SidechainAccountTransaction = {
            transactionId: data.broadcastResult.transactionId || `optimistic-${Date.now()}`,
            blockNumber: 0,
            timestamp: Date.now(),
            operation: data.action,
            from: account,
            to: toAccount,
            symbol: data.symbol,
            quantity: data.quantity,
            memo,
            account
          };

          const list = existing ?? [];
          const deduped = list.filter((row) => row.transactionId !== optimisticRow.transactionId);
          return [optimisticRow, ...deduped];
        });
      }

      // Immediate refresh of all wallet/account/token views affected by sidechain token tx.
      queryClient.invalidateQueries({ queryKey: ['accountData', account], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['profileData', account], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['Operations', account], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['accountHistory', account], refetchType: 'active' });
      // Keep optimistic sidechain values stable immediately after success.
      // Mark sidechain queries stale but skip immediate refetch to avoid stale indexer overwrite flicker.
      queryClient.invalidateQueries({ queryKey: ['sidechain-wallet-reward'], refetchType: 'none' });
      queryClient.invalidateQueries({ queryKey: ['sidechain-account-transactions'], refetchType: 'none' });

      // Force active query refetch now (not only mark stale).
      void queryClient.refetchQueries({ queryKey: ['accountData', account], type: 'active' });
      void queryClient.refetchQueries({ queryKey: ['profileData', account], type: 'active' });
      void queryClient.refetchQueries({ queryKey: ['Operations', account], type: 'active' });
      void queryClient.refetchQueries({ queryKey: ['accountHistory', account], type: 'active' });

      logger.info('useSidechainTokenActionMutation onSuccess data: %o', data);
    }
  });
};
