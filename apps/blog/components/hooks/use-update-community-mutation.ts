import { ESupportedLanguages } from '@hiveio/wax';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Community } from '@transaction/lib/extended-hive.chain';
import { toast } from '@ui/components/hooks/use-toast';
import { logger } from '@ui/lib/logger';

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
      const prevCommunityData: Community | undefined = queryClient.getQueryData(['community', communityName]);
      return { ...response, ...params, prevCommunityData };
    },
    onSettled: (data) => {
      if (!data) return;
      const { communityName, prevCommunityData, title, about, lang, nsfw, description, flagText } = data;
      if (!!prevCommunityData) {
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

        queryClient.setQueryData(['community', communityName], updatedCommunity);
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
      }, 3000);
    }
  });

  return updateCommunityMutation;
}
