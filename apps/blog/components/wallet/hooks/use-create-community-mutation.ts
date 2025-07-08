import { ESupportedLanguages } from '@hiveio/wax';
import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { toast } from '@ui/components/hooks/use-toast';
import { logger } from '@ui/lib/logger';

interface CreateCommunityMutationParams {
  memoKey: string;
  communityTag: string;
  title: string;
  about: string;
  creator: string;
  lang: ESupportedLanguages;
  nsfw: boolean;
  flagText: string;
  description: string;
  claimed: 'claimed' | 'hive';
}

export function useCreateCommunityMutation() {
  const createCommunityMutation = useMutation({
    mutationFn: async ({
      memoKey,
      communityTag,
      title,
      about,
      creator,
      lang,
      nsfw,
      flagText,
      description,
      claimed
    }: CreateCommunityMutationParams) => {
      const jsonMetadata = '';
      const activeAuthority = {
        weight_threshold: 1,
        key_auths: {},
        account_auths: { [creator]: 1 }
      };

      const ownerAuthority = {
        weight_threshold: 1,
        key_auths: {},
        account_auths: { [creator]: 1 }
      };

      const postingAuthority = {
        weight_threshold: 1,
        key_auths: {},
        account_auths: { [creator]: 1 }
      };
      let createAccountResult;
      switch (claimed) {
        case 'claimed': {
          createAccountResult = await transactionService.createClaimedAccount(
            creator,
            memoKey,
            communityTag,
            jsonMetadata,
            activeAuthority,
            ownerAuthority,
            postingAuthority,
            { observe: true }
          );
          break;
        }
        case 'hive': {
          createAccountResult = await transactionService.accountCreate(
            memoKey,
            communityTag,
            creator,
            jsonMetadata,
            activeAuthority,
            ownerAuthority,
            postingAuthority,
            { observe: true }
          );
          break;
        }
      }

      const communityActions = await transactionService.newCommunityUpdate(
        communityTag,
        title,
        about,
        creator,
        lang,
        nsfw,
        flagText,
        description,
        {
          observe: true,
          requiredKeyType: 'posting'
        }
      );

      const response = { createAccountResult, communityActions };
      logger.info('Done create community transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: 'Community created',
        variant: 'success',
        duration: 5000
      });
      logger.info('useCreateCommunityMutation onSuccess data: %o', data);
    }
  });

  return createCommunityMutation;
}
