import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { QueryKey, UseInfiniteQueryResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { IFollow, IFollowList, FullAccount } from '@hive/common-hiveio-packages/wax';
import { toast } from '@ui/components/hooks/use-toast';
import { handleError } from '@ui/lib/handle-error';
import { scheduleInvalidations } from '@/blog/lib/react-query';

type InfiniteFollowData = UseInfiniteQueryResult<IFollow[]>['data'];

/** Filter a user from all pages of an infinite follow query. */
function filterFromAllPages(
  data: InfiniteFollowData,
  username: string,
  field: 'following' | 'follower' = 'following'
): InfiniteFollowData {
  if (!data) return undefined;
  return {
    ...data,
    pages: data.pages.map((page) => page.filter((e) => e[field] !== username))
  };
}

/** Prepend an item to the first page of an infinite follow query. */
function prependToFirstPage(data: InfiniteFollowData, item: IFollow): InfiniteFollowData {
  if (!data) return undefined;
  return {
    ...data,
    pages: [[item, ...data.pages[0]], ...data.pages.slice(1)]
  };
}

/** Optimistically update follow_stats count on a cached profile. */
function updateProfileFollowCount(
  profile: FullAccount | undefined,
  field: 'follower_count' | 'following_count',
  delta: number
): FullAccount | undefined {
  if (!profile?.follow_stats) return undefined;
  return {
    ...profile,
    follow_stats: {
      ...profile.follow_stats,
      [field]: Math.max(0, (profile.follow_stats[field] ?? 0) + delta)
    }
  };
}

/**
 * Get all cached followingData queries for a user, grouped by type.
 * Uses getQueriesData for dynamic discovery of all cache variants.
 */
function getFollowingQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  username: string
) {
  const all = queryClient.getQueriesData<InfiniteFollowData>({
    queryKey: ['followingData', username]
  });
  const ignore: [QueryKey, InfiniteFollowData][] = [];
  const blog: [QueryKey, InfiniteFollowData][] = [];
  for (const [key, data] of all) {
    if (key[2] === 'ignore') {
      ignore.push([key, data]);
    } else {
      blog.push([key, data]);
    }
  }
  return { all, ignore, blog };
}

/**
 * Makes follow transaction.
 *
 * @export
 * @return {*}
 */
export function useFollowMutation() {
  const { user } = useUserClient();
  const queryClient = useQueryClient();
  const followMutation = useMutation({
    mutationKey: ['follow'],
    onMutate: async (params: { username: string }) => {
      const { username: otherUsername } = params;
      const { username } = user;

      // Cancel in-flight queries to prevent overwriting optimistic data
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['followingData', username] }),
        queryClient.cancelQueries({ queryKey: ['followersData', otherUsername] }),
        queryClient.cancelQueries({ queryKey: ['profileData', username] }),
        queryClient.cancelQueries({ queryKey: ['profileData', otherUsername] })
      ]);

      // Save ALL followingData queries for rollback (dynamic discovery)
      const followingQueries = getFollowingQueries(queryClient, username);
      const prevFollowers: InfiniteFollowData = queryClient.getQueryData(['followersData', otherUsername]);
      const prevMuteData: IFollowList[] | undefined = queryClient.getQueryData(['muted', otherUsername]);
      const prevProfileSelf: FullAccount | undefined = queryClient.getQueryData(['profileData', username]);
      const prevProfileOther: FullAccount | undefined = queryClient.getQueryData([
        'profileData',
        otherUsername
      ]);

      const newItem: IFollow = {
        follower: username,
        following: otherUsername,
        what: ['blog'],
        _temporary: true
      };

      // Remove from all ignore-type queries
      for (const [key, data] of followingQueries.ignore) {
        if (!data) continue;
        queryClient.setQueryData(key, filterFromAllPages(data, otherUsername));
      }

      // Add to all blog/base-type following queries
      for (const [key, data] of followingQueries.blog) {
        if (!data) continue;
        queryClient.setQueryData(key, prependToFirstPage(data, newItem));
      }

      // Add to target's followers
      if (prevFollowers) {
        queryClient.setQueryData(
          ['followersData', otherUsername],
          prependToFirstPage(prevFollowers, newItem)
        );
      }

      // Remove from muted list
      if (prevMuteData) {
        queryClient.setQueryData(
          ['muted', otherUsername],
          prevMuteData.filter((e) => e.name !== otherUsername)
        );
      }

      // Optimistically increment profile counts
      const updatedSelf = updateProfileFollowCount(prevProfileSelf, 'following_count', 1);
      if (updatedSelf) {
        queryClient.setQueryData(['profileData', username], updatedSelf);
      }
      const updatedOther = updateProfileFollowCount(prevProfileOther, 'follower_count', 1);
      if (updatedOther) {
        queryClient.setQueryData(['profileData', otherUsername], updatedOther);
      }

      return {
        prevFollowingAll: followingQueries.all,
        prevFollowers,
        prevMuteData,
        prevProfileSelf,
        prevProfileOther,
        otherUsername
      };
    },
    mutationFn: async (params: { username: string }) => {
      await transactionService.follow(params.username, { observe: true });
      return params;
    },
    onSuccess: (_data, variables) => {
      const { username } = user;
      const { username: otherUsername } = variables;
      toast({
        title: 'Followed',
        description: `You are now following ${otherUsername}.`,
        variant: 'success'
      });
      scheduleInvalidations(queryClient, [
        ['followingData', otherUsername],
        ['followingData', username],
        ['muted', username],
        ['followersData', otherUsername],
        ['profileData', username],
        ['profileData', otherUsername]
      ]);
    },
    onError: (error: unknown, variables, context) => {
      if (context) {
        const { username } = user;
        const { otherUsername } = context;
        // Rollback all followingData queries
        for (const [key, data] of context.prevFollowingAll) {
          queryClient.setQueryData(key, data);
        }
        if (context.prevFollowers !== undefined) {
          queryClient.setQueryData(['followersData', otherUsername], context.prevFollowers);
        }
        if (context.prevMuteData !== undefined) {
          queryClient.setQueryData(['muted', otherUsername], context.prevMuteData);
        }
        if (context.prevProfileSelf !== undefined) {
          queryClient.setQueryData(['profileData', username], context.prevProfileSelf);
        }
        if (context.prevProfileOther !== undefined) {
          queryClient.setQueryData(['profileData', otherUsername], context.prevProfileOther);
        }
      }
      handleError(error, {
        method: 'useFollowMutation',
        params: variables
      });
    }
  });

  return followMutation;
}

/**
 * Makes unfollow transaction.
 *
 * @export
 * @return {*}
 */
export function useUnfollowMutation() {
  const { user } = useUserClient();
  const queryClient = useQueryClient();
  const unfollowMutation = useMutation({
    mutationKey: ['unfollow'],
    onMutate: async (params: { username: string }) => {
      const { username: otherUsername } = params;
      const { username } = user;

      // Cancel in-flight queries to prevent overwriting optimistic data
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['followingData', username] }),
        queryClient.cancelQueries({ queryKey: ['followersData', otherUsername] }),
        queryClient.cancelQueries({ queryKey: ['profileData', username] }),
        queryClient.cancelQueries({ queryKey: ['profileData', otherUsername] })
      ]);

      // Save ALL followingData queries for rollback (dynamic discovery)
      const followingQueries = getFollowingQueries(queryClient, username);
      const prevFollowers: InfiniteFollowData = queryClient.getQueryData(['followersData', otherUsername]);
      const prevProfileSelf: FullAccount | undefined = queryClient.getQueryData(['profileData', username]);
      const prevProfileOther: FullAccount | undefined = queryClient.getQueryData([
        'profileData',
        otherUsername
      ]);

      // Remove from ALL non-ignore followingData queries (all pages)
      for (const [key, data] of followingQueries.blog) {
        if (!data) continue;
        queryClient.setQueryData(key, filterFromAllPages(data, otherUsername));
      }

      // Remove from target's followers list (all pages)
      if (prevFollowers) {
        queryClient.setQueryData(
          ['followersData', otherUsername],
          filterFromAllPages(prevFollowers, username, 'follower')
        );
      }

      // Optimistically decrement profile counts
      const updatedSelf = updateProfileFollowCount(prevProfileSelf, 'following_count', -1);
      if (updatedSelf) {
        queryClient.setQueryData(['profileData', username], updatedSelf);
      }
      const updatedOther = updateProfileFollowCount(prevProfileOther, 'follower_count', -1);
      if (updatedOther) {
        queryClient.setQueryData(['profileData', otherUsername], updatedOther);
      }

      return {
        prevFollowingAll: followingQueries.all,
        prevFollowers,
        prevProfileSelf,
        prevProfileOther,
        otherUsername
      };
    },
    mutationFn: async (params: { username: string }) => {
      await transactionService.unfollow(params.username, { observe: true });
      return params;
    },
    onSuccess: (_data, variables) => {
      const { username } = user;
      const { username: otherUsername } = variables;
      toast({
        title: 'Unfollowed',
        description: `You have unfollowed ${otherUsername}.`,
        variant: 'success'
      });
      scheduleInvalidations(queryClient, [
        ['followingData', otherUsername],
        ['followingData', username],
        ['followersData', otherUsername],
        ['profileData', username],
        ['profileData', otherUsername]
      ]);
    },
    onError: (error: unknown, variables, context) => {
      if (context) {
        const { username } = user;
        const { otherUsername } = context;
        // Rollback all followingData queries
        for (const [key, data] of context.prevFollowingAll) {
          queryClient.setQueryData(key, data);
        }
        if (context.prevFollowers !== undefined) {
          queryClient.setQueryData(['followersData', otherUsername], context.prevFollowers);
        }
        if (context.prevProfileSelf !== undefined) {
          queryClient.setQueryData(['profileData', username], context.prevProfileSelf);
        }
        if (context.prevProfileOther !== undefined) {
          queryClient.setQueryData(['profileData', otherUsername], context.prevProfileOther);
        }
      }
      handleError(error, {
        method: 'useUnfollowMutation',
        params: variables
      });
    }
  });

  return unfollowMutation;
}
