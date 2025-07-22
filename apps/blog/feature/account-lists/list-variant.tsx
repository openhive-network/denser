import { useTranslation } from 'next-i18next';
import ListArea from './list-area';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { FullAccount } from '@transaction/lib/app-types';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import {
  useBlacklistBlogMutation,
  useResetBlacklistBlogMutation,
  useUnblacklistBlogMutation
} from '@/blog/components/hooks/use-blacklist-mutations';
import {
  useMuteMutation,
  useResetBlogListMutation,
  useUnmuteMutation
} from '@/blog/components/hooks/use-mute-mutations';
import { handleError } from '@ui/lib/handle-error';
import {
  useFollowBlacklistBlogMutation,
  useResetFollowBlacklistBlogMutation,
  useUnfollowBlacklistBlogMutation
} from '@/blog/components/hooks/use-follow-blacklist-mutation';
import {
  useFollowMutedBlogMutation,
  useResetFollowMutedBlogMutation,
  useUnfollowMutedBlogMutation
} from '@/blog/components/hooks/use-follow-muted-list-mutation';

interface ListVariantProps {
  variant: 'blacklisted' | 'muted' | 'followedBlacklist' | 'followedMute';
  username: string;
  profileData: FullAccount;
  data: IFollowList[] | undefined;
  splitArrays: IFollowList[][];
  onSearchChange: (e: string) => void;
}

const ListVariant = ({
  variant,
  username,
  profileData,
  data,
  splitArrays,
  onSearchChange
}: ListVariantProps) => {
  const { t } = useTranslation('common_blog');
  const { user } = useUser();
  const userOwner = user.username === username && user.isLoggedIn;

  switch (variant) {
    case 'blacklisted':
      const blacklistBlogMutation = useBlacklistBlogMutation();
      const resetBlacklistBlogMutation = useResetBlacklistBlogMutation();
      const unblacklistBlogMutation = useUnblacklistBlogMutation();
      return (
        <ListArea
          titleBy={t('user_profile.lists.list.accounts_blacklisted_by', { username: username })}
          listTitle={t('user_profile.lists.list.unblacklist')}
          resetTitle={t('user_profile.lists.list.reset_blacklist')}
          listDescription={profileData?.profile?.blacklist_description}
          data={data}
          splitArrays={splitArrays}
          isLoading={blacklistBlogMutation.isLoading}
          deleteIsLoading={unblacklistBlogMutation.isLoading}
          currentItem={unblacklistBlogMutation.variables?.blog}
          resetListIsLoading={resetBlacklistBlogMutation.isLoading}
          accountOwner={userOwner}
          onSearchChange={onSearchChange}
          handleDetete={async (name: string) => {
            try {
              await unblacklistBlogMutation.mutateAsync({ blog: name });
            } catch (error) {
              handleError(error, { method: 'unblacklistBlog', params: { blog: name } });
            }
          }}
          handleAdd={async (name: string) => {
            try {
              await blacklistBlogMutation.mutateAsync({ otherBlogs: name });
            } catch (error) {
              handleError(error, { method: 'blacklistBlog', params: { otherBlogs: name } });
            }
          }}
          handleReset={async () => {
            try {
              await resetBlacklistBlogMutation.mutateAsync();
            } catch (error) {
              handleError(error, { method: 'resetBlacklistBlog', params: {} });
            }
          }}
        />
      );
    case 'muted':
      const muteMutation = useMuteMutation();
      const unmuteMutation = useUnmuteMutation();
      const resetBlogListMutation = useResetBlogListMutation();
      return (
        <ListArea
          titleBy={t('user_profile.lists.list.accounts_muted_by', { username: username })}
          listTitle={t('user_profile.lists.list.unmute')}
          resetTitle={t('user_profile.lists.list.reset_muted_list')}
          listDescription={profileData?.profile?.muted_list_description}
          data={data}
          splitArrays={splitArrays}
          isLoading={muteMutation.isLoading}
          deleteIsLoading={unmuteMutation.isLoading}
          currentItem={unmuteMutation.variables?.username}
          resetListIsLoading={resetBlogListMutation.isLoading}
          accountOwner={userOwner}
          onSearchChange={onSearchChange}
          handleDetete={async (name: string) => {
            try {
              await unmuteMutation.mutateAsync({ username: name });
            } catch (error) {
              handleError(error, { method: 'unmute', params: { username: name } });
            }
          }}
          handleAdd={async (name: string) => {
            try {
              await muteMutation.mutateAsync({ username: name });
            } catch (error) {
              handleError(error, { method: 'mute', params: { username: name } });
            }
          }}
          handleReset={async () => {
            try {
              await resetBlogListMutation.mutateAsync();
            } catch (error) {
              handleError(error, { method: 'resetBlogList', params: {} });
            }
          }}
        />
      );
    case 'followedBlacklist':
      const followBlacklistBlogMutation = useFollowBlacklistBlogMutation();
      const unfollowBlacklistBlogMutation = useUnfollowBlacklistBlogMutation();
      const resetFollowBlacklistBlogMutation = useResetFollowBlacklistBlogMutation();
      return (
        <ListArea
          titleBy={t('user_profile.lists.followed_blacklists', { username: username })}
          listTitle={t('user_profile.lists.list.unfollow_blacklist')}
          resetTitle={t('user_profile.lists.list.reset_followed_blacklists')}
          data={data}
          splitArrays={splitArrays}
          isLoading={followBlacklistBlogMutation.isLoading}
          deleteIsLoading={unfollowBlacklistBlogMutation.isLoading}
          currentItem={unfollowBlacklistBlogMutation.variables?.blog}
          resetListIsLoading={resetFollowBlacklistBlogMutation.isLoading}
          accountOwner={userOwner}
          onSearchChange={onSearchChange}
          handleDetete={async (name: string) => {
            try {
              await unfollowBlacklistBlogMutation.mutateAsync({ blog: name });
            } catch (error) {
              handleError(error, { method: 'unfollowBlacklistBlog', params: { blog: name } });
            }
          }}
          handleAdd={async (name: string) => {
            try {
              await followBlacklistBlogMutation.mutateAsync({ otherBlogs: name });
            } catch (error) {
              handleError(error, { method: 'followBlacklistBlog', params: { otherBlogs: name } });
            }
          }}
          handleReset={async () => {
            try {
              await resetFollowBlacklistBlogMutation.mutateAsync();
            } catch (error) {
              handleError(error, { method: 'resetFollowBlacklistBlog', params: {} });
            }
          }}
        />
      );
    case 'followedMute':
      const followMutedBlogMutation = useFollowMutedBlogMutation();
      const unfollowMutedBlogMutation = useUnfollowMutedBlogMutation();
      const resetFollowMutedBlogMutation = useResetFollowMutedBlogMutation();
      return (
        <ListArea
          titleBy={t('user_profile.lists.followed_muted_lists', { username: username })}
          listTitle={t('user_profile.lists.list.unfollow_muted_list')}
          resetTitle={t('user_profile.lists.list.reset_followed_muted_list')}
          data={data}
          splitArrays={splitArrays}
          isLoading={followMutedBlogMutation.isLoading}
          deleteIsLoading={unfollowMutedBlogMutation.isLoading}
          currentItem={unfollowMutedBlogMutation.variables?.blog}
          resetListIsLoading={resetFollowMutedBlogMutation.isLoading}
          accountOwner={userOwner}
          onSearchChange={onSearchChange}
          handleDetete={async (name: string) => {
            try {
              await unfollowMutedBlogMutation.mutateAsync({ blog: name });
            } catch (error) {
              handleError(error, { method: 'unfollowMutedBlog', params: { blog: name } });
            }
          }}
          handleAdd={async (name: string) => {
            try {
              await followMutedBlogMutation.mutateAsync({ otherBlogs: name });
            } catch (error) {
              handleError(error, { method: 'followMutedBlog', params: { otherBlogs: name } });
            }
          }}
          handleReset={async () => {
            try {
              await resetFollowMutedBlogMutation.mutateAsync();
            } catch (error) {
              handleError(error, { method: 'resetFollowMutedBlog', params: {} });
            }
          }}
        />
      );
    default:
      return null;
  }
};

export default ListVariant;
