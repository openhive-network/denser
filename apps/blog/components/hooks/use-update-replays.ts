import { useQueryClient, useMutation } from '@tanstack/react-query';

export const useUpdateReplaysData = (username: string, permlink: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reply) => {
      return reply;
    },
    // When mutate is called:
    onMutate: async (reply) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['discussionData', username, permlink] });

      // Snapshot the previous value
      const previousReplys = queryClient.getQueryData(['discussionData', username, permlink]);

      // Optimistically update to the new value
      queryClient.setQueryData(['discussionData', username, permlink], (old) => {
        console.log('old', old);
        console.log('reply', reply);
        console.log('unify', { ...old, ...reply });
        return { ...old, ...reply };
      });

      // Return a context object with the snapshotted value
      return { previousReplys };
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: (err, reply, context) => {
      queryClient.setQueryData(['discussionData', username, permlink], context?.previousReplys);
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['discussionData', username, permlink] });
    }
  });
};
