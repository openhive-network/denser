import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { toast } from '@ui/components/hooks/use-toast';

export const useDelegateRCMutation = () => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const delegateMutation = useMutation({
    mutationFn: async (params: { toAccount: string; amount: string }) => {
      const { toAccount, amount } = params;
      const broadcastResult = await transactionService.delegateRC(user.username, amount, toAccount, {
        observe: true,
        requiredKeyType: 'posting'
      });
      const response = { ...params, broadcastResult };
      return response;
    },
    onSuccess: (data) => {
      const { amount, toAccount } = data;
      queryClient.invalidateQueries(['manabar', user.username]);
      toast({
        variant: 'success',
        description: `Successfully delegated ${amount} RC to ${toAccount}`
      });
    }
  });

  return delegateMutation;
};
