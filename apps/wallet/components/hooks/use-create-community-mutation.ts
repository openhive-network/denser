import { ESupportedLanguages } from '@hiveio/wax';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

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

/** Creates the community account, with the creator holding every authority. */
function createCommunityAccount({ memoKey, communityTag, creator, claimed }: CreateCommunityMutationParams) {
  const jsonMetadata = '';
  const authority = () => ({ weight_threshold: 1, key_auths: {}, account_auths: { [creator]: 1 } });
  const [active, owner, posting] = [authority(), authority(), authority()];
  return claimed === 'claimed'
    ? transactionService.createClaimedAccount(
        creator,
        memoKey,
        communityTag,
        jsonMetadata,
        active,
        owner,
        posting,
        OBSERVE
      )
    : transactionService.accountCreate(
        memoKey,
        communityTag,
        creator,
        jsonMetadata,
        active,
        owner,
        posting,
        OBSERVE
      );
}

export const useCreateCommunityMutation = () =>
  useOperationMutation({
    name: 'useCreateCommunityMutation',
    run: async (params: CreateCommunityMutationParams) => {
      const { communityTag, title, about, creator, lang, nsfw, flagText, description } = params;
      const createAccountResult = await createCommunityAccount(params);
      const communityActions = await transactionService.newCommunityUpdate(
        communityTag,
        title,
        about,
        creator,
        lang,
        nsfw,
        flagText,
        description,
        { observe: true, requiredKeyType: 'posting' }
      );
      return { createAccountResult, communityActions };
    },
    successToast: () => ({ title: 'Community created', duration: 5000 }),
    reportErrors: false
  });
