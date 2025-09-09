import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { Preferences } from '@transaction/lib/app-types';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes comment transaction.
 *
 * @export
 * @return {*}
 */
export function useCommentMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  const commentMutation = useMutation({
    mutationFn: async (params: {
      parentAuthor: string;
      parentPermlink: string;
      body: string;
      preferences: Preferences;
      discussionPermlink: string;
    }) => {
      const { parentAuthor, parentPermlink, body, preferences, discussionPermlink } = params;
      const queryKey = ['discussionData', discussionPermlink];
      const broadcastResult = await transactionService.comment(
        parentAuthor,
        parentPermlink,
        body,
        preferences,
        { observe: true }
      );
      const prevData: Record<string, Entry> | undefined = queryClient.getQueryData(queryKey);
      const response = { ...params, broadcastResult, prevData, queryKey };
      logger.info('Done comment transaction: %o', response);
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { queryKey, prevData, body, parentAuthor, parentPermlink } = data;
      if (!!prevData) {
        const list = [...Object.keys(prevData).map((key) => prevData[key])].map((post) => {
          if (post.permlink === parentPermlink && post.author === parentAuthor) {
            const newPostData = { ...post, children: 1, replies: [...(post.replies || [])] };
            return newPostData;
          }
          return post;
        });
        const parentPost = list.find(
          (post) => post.author === parentAuthor && post.permlink === parentPermlink
        );
        const newComment = {
          active_votes: [],
          author: user.username,
          author_payout_value: '0.000 HBD',
          author_reputation: 40,
          beneficiaries: [],
          blacklists: [],
          body: body,
          parent_author: parentAuthor,
          parent_permlink: parentPermlink,
          category: parentPost?.category ?? '',
          children: 0,
          created: new Date().toISOString(),
          curator_payout_value: '0.000 HBD',
          depth: (parentPost?.depth ?? 0) + 1,
          is_paidout: false,
          json_metadata: {
            images: [],
            author: user.username,
            image: ''
          },
          max_accepted_payout: '1000000.000 HBD',
          net_rshares: 0,
          payout: 0,
          payout_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          pending_payout_value: '0.000 HBD',
          percent_hbd: 10000,
          permlink: `${user.username}/re-${parentAuthor}-${parentPost?.post_id ?? 0}`,
          post_id: (parentPost?.post_id ?? 0) + 1,
          promoted: '',
          replies: [],
          title: `Re: ${parentPost?.title ?? 'No title'}`,
          updated: new Date().toISOString(),
          url: `/${parentAuthor}/${parentPermlink}/@${user.username}/${parentPermlink}`,
          _temporary: true
        };
        const newData: Record<string, Entry> = { ...prevData, [newComment.permlink]: newComment };
        queryClient.setQueryData<Record<string, Entry>>(queryKey, () => {
          return newData;
        });
      }
    },
    onSuccess: (data) => {
      const { queryKey } = data;
      logger.info('useCommentMutation onSuccess data: %o', data);
      toast({
        title: 'Comment posted successfully',
        description: 'Your comment has been posted successfully.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
      }, 4000);
    }
  });

  return commentMutation;
}

/**
 * Makes update comment transaction.
 *
 * @export
 * @return {*}
 */
export function useUpdateCommentMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const updateCommentMutation = useMutation({
    mutationFn: async (params: {
      parentAuthor: string;
      parentPermlink: string;
      permlink: string;
      body: string;
      discussionPermlink: string;
    }) => {
      const { parentAuthor, parentPermlink, permlink, body, discussionPermlink } = params;
      const broadcastResult = await transactionService.updateComment(
        parentAuthor,
        parentPermlink,
        permlink,
        body,
        {
          observe: true
        }
      );
      const prevData: Record<string, Entry> | undefined = queryClient.getQueryData([
        'discussionData',
        discussionPermlink
      ]);

      const response = { ...params, broadcastResult, prevData };

      logger.info('Done update comment transaction: %o', response);
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { permlink, discussionPermlink, prevData } = data;
      if (!!prevData) {
        const list = [...Object.keys(prevData).map((key) => prevData[key])];
        const newList = list.map((post) => {
          if (post.permlink === permlink) {
            return { ...post, body: data.body };
          }
          return post;
        });
        const newData: Record<string, Entry> = Object.fromEntries(
          newList.map((post) => [post.permlink, post])
        );
        queryClient.setQueryData<Record<string, Entry>>(['discussionData', discussionPermlink], () => {
          return newData;
        });
      }
    },
    onSuccess: (data) => {
      const { username } = user;
      const { permlink, discussionPermlink } = data;
      logger.info('useUpdateCommentMutation onSuccess data: %o', data);
      toast({
        title: 'Comment updated successfully',
        description: 'Your comment has been updated successfully.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['discussionData', discussionPermlink] });
        queryClient.invalidateQueries({ queryKey: ['postData', username, permlink] });
      }, 4000);
    }
  });

  return updateCommentMutation;
}

/**
 * Makes delete comment transaction.
 *
 * @export
 * @return {*}
 */
export function useDeleteCommentMutation() {
  const queryClient = useQueryClient();
  const deleteCommentMutation = useMutation({
    mutationFn: async (params: { permlink: string; discussionPermlink: string }) => {
      const { permlink, discussionPermlink } = params;
      const broadcastResult = await transactionService.deleteComment(permlink, { observe: true });
      const prevData: Record<string, Entry> | undefined = queryClient.getQueryData([
        'discussionData',
        discussionPermlink
      ]);
      const response = { ...params, broadcastResult, prevData };
      logger.info('Done delete comment transaction: %o', response);
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { discussionPermlink, prevData } = data;
      if (!!prevData) {
        const list = [...Object.keys(prevData).map((key) => prevData[key])];
        const newList = list.filter((post) => post.permlink !== data.permlink);
        const newData: Record<string, Entry> = Object.fromEntries(
          newList.map((post) => [post.permlink, post])
        );

        queryClient.setQueryData<Record<string, Entry>>(['discussionData', discussionPermlink], () => {
          return newData;
        });
      }
    },
    onSuccess: (data) => {
      const { discussionPermlink } = data;
      logger.info('useDeleteCommentMutation onSuccess data: %o', data);
      toast({
        title: 'Comment deleted successfully',
        description: 'Your comment has been deleted successfully.',
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['discussionData', discussionPermlink] });
      }, 4000);
    }
  });

  return deleteCommentMutation;
}
