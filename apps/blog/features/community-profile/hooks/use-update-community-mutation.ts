import { ESupportedLanguages } from '@hiveio/wax';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Community } from '@hive/common-hiveio-packages/wax';
import { toast } from '@ui/components/hooks/use-toast';
import { handleError } from '@ui/lib/handle-error';

interface UpdateCommunityMutationParams {
  communityName: string;
  title: string;
  about: string;
  editor: string;
  lang: ESupportedLanguages;
  nsfw: boolean;
  flagText: string;
  description: string;
}

export function useUpdateCommunityMutation() {
  const queryClient = useQueryClient();

  const updateCommunityMutation = useMutation({
    mutationFn: async (params: UpdateCommunityMutationParams) => {
      const { communityName, title, about, editor, lang, nsfw, flagText, description } = params;
      const response = await transactionService.updateCommunityProps(
        communityName,
        title,
        about,
        nsfw,
        lang,
        flagText,
        description,
        editor,
        { observe: true }
      );
      // The community page caches under ['community', name, observer]; match by
      // prefix to find that observer-keyed entry. A bare getQueryData(['community',
      // name]) never resolves it (React Query hashes the full key), so the
      // optimistic write below silently no-oped and edits weren't reflected.
      // Mirrors the lookup in use-subscribe-mutations.ts.
      const communityQueryEntry = queryClient
        .getQueriesData<Community>({ queryKey: ['community', communityName] })
        .find(([, data]) => !!data);
      const prevCommunityData = communityQueryEntry?.[1];
      const communityQueryKey = communityQueryEntry?.[0];
      return { ...response, ...params, prevCommunityData, communityQueryKey };
    },
    onSettled: (data) => {
      if (!data) return;
      const { prevCommunityData, communityQueryKey, title, about, lang, nsfw, description, flagText } = data;
      if (!!prevCommunityData && communityQueryKey) {
        const updatedCommunity = {
          ...prevCommunityData,
          title,
          about,
          lang,
          description,
          is_nsfw: nsfw,
          flag_text: flagText,
          _temporary: true
        };

        queryClient.setQueryData(communityQueryKey, updatedCommunity);
      }
    },
    onSuccess: (data) => {
      const { communityName } = data;
      toast({
        title: 'Community updated',
        description: `You have successfully updated the community ${communityName}.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['community', communityName] });
      }, 4000);
    },
    onError: (error: any, variables) => {
      handleError(error, {
        method: 'useUpdateCommunityMutation',
        params: variables
      });
    }
  });

  return updateCommunityMutation;
}
