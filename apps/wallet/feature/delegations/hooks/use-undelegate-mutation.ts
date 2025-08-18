import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { toast } from '@ui/components/hooks/use-toast';

export const useUndelegateMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useUser();

  const undelegateMutation = useMutation({
    mutationFn: async (toAccount: string) => {
      const broadcastResult = await transactionService.undelegateRC(user.username, toAccount, {
        observe: true,
        requiredKeyType: 'posting'
      });
      const response = { toAccount, broadcastResult };
      return response;
    },
    onSuccess: (data) => {
      const { toAccount } = data;
      queryClient.invalidateQueries({
        queryKey: ['resourceCredits', user.username]
      });
      toast({
        variant: 'success',
        description: `Successfully undelegated RC from ${toAccount}`
      });
    }
  });

  return undelegateMutation;
};
