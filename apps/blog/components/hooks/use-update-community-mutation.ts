import { ESupportedLanguages } from '@hiveio/wax';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
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

      logger.info('Done update community transaction: %o', response);
      return { ...response, ...params };
    },
    onSuccess: (data) => {
      const { communityName } = data;
      queryClient.invalidateQueries({ queryKey: ['community', communityName] });
      queryClient.invalidateQueries({ queryKey: ['communityData', communityName] });
      toast({
        title: 'Community updated',
        variant: 'success',
        duration: 5000
      });

      logger.info('useUpdateCommunityMutation onSuccess data: %o', data);
    }
  });

  return updateCommunityMutation;
}
