import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

export function useResetAllListsMutation() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const resetAllListsMutation = useMutation({
    mutationFn: async () => {
      const broadcastResult = await transactionService.resetAllBlog({ observe: true });
      const response = { broadcastResult };
      logger.info('Done reset all lists transaction: %o', response);
      return response;
    },
    onSettled: () => {
      queryClient.setQueryData(['blacklisted', user.username], []);
      queryClient.setQueryData(['muted', user.username], []);
      queryClient.setQueryData(['follow_blacklist', user.username], []);
      queryClient.setQueryData(['follow_muted', user.username], []);
    },
    onSuccess: (data) => {
      toast({
        title: 'All lists reset successfully',
        description: 'Your all lists have been cleared.',
        variant: 'success'
      });
      const { username } = user;
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['muted', username]
        });
        queryClient.invalidateQueries({
          queryKey: ['blacklisted', username]
        });
        queryClient.invalidateQueries({
          queryKey: ['follow_muted', username]
        });
        queryClient.invalidateQueries({
          queryKey: ['follow_blacklist', username]
        });
        logger.info('useResetAllListsMutation onSuccess: %o', data);
      }, 3000);
    }
  });

  return resetAllListsMutation;
}
