import { createHiveChain, ESupportedLanguages } from '@hiveio/wax';
import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { toast } from '@ui/components/hooks/use-toast';
import { logger } from '@ui/lib/logger';
import { PublicKey } from '@hiveio/dhive';

interface CreateCommunityMutationParams {
  memoKey: string;
  communityTag: string;
  active: [string | PublicKey, number][];
  owner: [string | PublicKey, number][];
  posting: [string | PublicKey, number][];
  title: string;
  about: string;
  creator: string;
  lang: ESupportedLanguages;
  nsfw: boolean;
  flagText: string;
  description: string;
}

export function useCreateCommunityMutation() {
  const createCommunityMutation = useMutation({
    mutationFn: async ({
      memoKey,
      communityTag,
      active,
      owner,
      posting,
      title,
      about,
      creator,
      lang,
      nsfw,
      flagText,
      description
    }: CreateCommunityMutationParams) => {
      const fee = (await createHiveChain()).hive(3000);
      const jsonMetadata = '';
      const activeAuthority = {
        weight_threshold: 1,
        key_auths: Object.fromEntries(active.map((key) => [String(key[0]), key[1]])),
        account_auths: {}
      };

      const ownerAuthority = {
        weight_threshold: 1,
        key_auths: Object.fromEntries(owner.map((key) => [String(key[0]), key[1]])),
        account_auths: {}
      };

      const postingAuthority = {
        weight_threshold: 1,
        key_auths: Object.fromEntries(posting.map((key) => [String(key[0]), key[1]])),
        account_auths: {}
      };
      console.log(activeAuthority, ownerAuthority, postingAuthority);
      const createAccountResult = await transactionService.accountCreate(
        fee,
        memoKey,
        communityTag,
        creator,
        jsonMetadata,
        activeAuthority,
        ownerAuthority,
        postingAuthority,
        { observe: true }
      );
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
