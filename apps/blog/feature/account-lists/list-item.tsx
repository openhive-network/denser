import { useUnblacklistBlogMutation } from '@/blog/components/hooks/use-blacklist-mutations';
import { useUnfollowBlacklistBlogMutation } from '@/blog/components/hooks/use-follow-blacklist-mutation';
import { useUnfollowMutedBlogMutation } from '@/blog/components/hooks/use-follow-muted-list-mutation';
import { useUnmuteMutation } from '@/blog/components/hooks/use-mute-mutations';
import { IFollowList } from '@transaction/lib/extended-hive.chain';
import { Button } from '@ui/components';
import { handleError } from '@ui/lib/handle-error';
import Link from 'next/link';
import { CircleSpinner } from 'react-spinners-kit';

const ListItem = ({
  item,
  loading,
  accountOwner,
  listTitle,
  variant
}: {
  item: IFollowList;
  loading: boolean;
  accountOwner: boolean;
  listTitle: string;
  variant: 'blacklisted' | 'muted' | 'followBlacklist' | 'followMutedList';
}) => {
  const unblacklistBlogMutation = useUnblacklistBlogMutation();
  const unmuteMutation = useUnmuteMutation();
  const unfollowBlacklistBlogMutation = useUnfollowBlacklistBlogMutation();
  const unfollowMutedBlogMutation = useUnfollowMutedBlogMutation();

  const handleDelete = async (name: string) => {
    try {
      switch (variant) {
        case 'blacklisted':
          await unblacklistBlogMutation.mutateAsync({ blog: name });
          break;
        case 'followBlacklist':
          await unfollowBlacklistBlogMutation.mutateAsync({ blog: name });
          break;
        case 'muted':
          await unmuteMutation.mutateAsync({ username: name });
          break;
        case 'followMutedList':
          await unfollowMutedBlogMutation.mutateAsync({ blog: name });
          break;
      }
    } catch (error) {
      handleError(error, { method: variant, params: { blog: name } });
    }
  };
  const currentItem =
    unblacklistBlogMutation.variables?.blog ||
    unfollowBlacklistBlogMutation.variables?.blog ||
    unmuteMutation.variables?.username ||
    unfollowMutedBlogMutation.variables?.blog;

  const deleteIsLoading =
    unblacklistBlogMutation.isLoading ||
    unfollowBlacklistBlogMutation.isLoading ||
    unmuteMutation.isLoading ||
    unfollowMutedBlogMutation.isLoading;
  return (
    <li className="flex w-72 items-center justify-between bg-background p-1 font-semibold odd:bg-background-tertiary">
      {!item._temporary ? (
        <span className="px-2">
          <Link className="text-destructive" href={`/@${item.name}`}>
            {item.name}
          </Link>
          {' ' + item.blacklist_description}
        </span>
      ) : (
        <span className="px-2">
          {item.name}
          {' ' + item.blacklist_description}
        </span>
      )}
      {accountOwner ? (
        <Button
          variant="outlineRed"
          className="whitespace-nowrap p-1"
          size="xs"
          onClick={() => handleDelete(item.name)}
          disabled={(deleteIsLoading && currentItem === item.name) || loading || item._temporary}
        >
          {(deleteIsLoading && currentItem === item.name) || loading ? (
            <span className="flex h-5 w-20 items-center justify-center">
              <CircleSpinner
                loading={(deleteIsLoading && currentItem === item.name) || loading}
                size={18}
                color="#dc2626"
              />
            </span>
          ) : (
            listTitle
          )}
        </Button>
      ) : null}
    </li>
  );
};

export default ListItem;
