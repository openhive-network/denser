import type { ESupportedLanguages } from '@hiveio/wax';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { Community } from '@hive/common-hiveio-packages/wax';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

interface UpdateCommunityParams {
  communityName: string;
  title: string;
  about: string;
  editor: string;
  lang: ESupportedLanguages;
  nsfw: boolean;
  flagText: string;
  description: string;
}

export const useUpdateCommunityMutation = () =>
  useOperationMutation({
    name: 'useUpdateCommunityMutation',
    run: ({
      communityName,
      title,
      about,
      editor,
      lang,
      nsfw,
      flagText,
      description
    }: UpdateCommunityParams) =>
      transactionService.updateCommunityProps(
        communityName,
        title,
        about,
        nsfw,
        lang,
        flagText,
        description,
        editor,
        OBSERVE
      ),
    onSuccess: (_data, { communityName, title, about, lang, nsfw, description, flagText }, queryClient) => {
      // The community page caches under ['community', name, observer]; match by
      // prefix to find that observer-keyed entry. A bare getQueryData(['community',
      // name]) never resolves it (React Query hashes the full key), so the
      // optimistic write silently no-oped and edits weren't reflected.
      // Mirrors the lookup in use-subscribe-mutations.ts.
      const communityQueryEntry = queryClient
        .getQueriesData<Community>({ queryKey: ['community', communityName] })
        .find(([, data]) => !!data);
      if (!communityQueryEntry) return;
      const [communityQueryKey, prevCommunityData] = communityQueryEntry;
      queryClient.setQueryData(communityQueryKey, {
        ...prevCommunityData,
        title,
        about,
        lang,
        description,
        is_nsfw: nsfw,
        flag_text: flagText,
        _temporary: true
      });
    },
    successToast: (_data, { communityName }) => ({
      title: 'Community updated',
      description: `You have successfully updated the community ${communityName}.`
    }),
    invalidate: ({ communityName }) => [['community', communityName]],
    invalidateDelays: [4000]
  });
