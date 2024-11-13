'use client';
import { useParams } from 'next/navigation';
import Content from './content';
import { Entry, getCommunity, getDiscussion, getListCommunityRoles, getPost } from '@transaction/lib/bridge';
import { useQuery } from '@tanstack/react-query';
import LoadingClient from '@ui/components/loading';
import { useFollowListQuery } from '@/blog/components/hooks/use-follow-list';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { sorter, SortOrder } from '@/blog/lib/utils-app';

const PostPage = () => {
  const { user } = useUserClient();
  const { community, tag, username } = useParams() as {
    community: string;
    tag: string;
    username: string;
  };
  const sort = useSearchParams()?.get('sort');
  const cleaned_username = username.replace('%40', '');
  const { isLoading: entryIsLoading, data: entryData } = useQuery(
    ['postData', cleaned_username, tag],
    () => getPost(cleaned_username, String(tag)),
    {
      enabled: !!cleaned_username && !!tag
    }
  );
  const { data: communityData } = useQuery(['communityData', community], () => getCommunity(community), {
    enabled: !!cleaned_username && !!community && community.startsWith('hive-')
  });
  const { isLoading: discussionIsLoading, data: discussionData } = useQuery(
    ['discussionData', username, tag],
    () => getDiscussion(username, String(tag)),
    {
      enabled: !!username && !!tag
    }
  );
  const { data: rolesData } = useQuery(['rolesList', community], () => getListCommunityRoles(community), {
    enabled: Boolean(community)
  });
  const [discussionState, setDiscussionState] = useState<Entry[]>();

  const userRole = rolesData?.find((e) => e[0] === user.username);
  const userCanModerate = userRole
    ? userRole[1] === 'mod' || userRole[1] === 'admin' || userRole[1] === 'owner'
    : false;

  const { data: mutedListData } = useFollowListQuery(user.username, 'muted');
  useEffect(() => {
    if (sort === 'trending' && discussionData) {
      const list = [...Object.keys(discussionData).map((key) => discussionData[key])];
      sorter(list, SortOrder[sort]);
      setDiscussionState(list);
    }
    if (sort === 'votes' && discussionData) {
      const list = [...Object.keys(discussionData).map((key) => discussionData[key])];
      sorter(list, SortOrder[sort]);
      setDiscussionState(list);
    }
    if (sort === 'new' && discussionData) {
      const list = [...Object.keys(discussionData).map((key) => discussionData[key])];
      sorter(list, SortOrder[sort]);
      setDiscussionState(list);
    }
  }, [discussionData, sort]);

  const generateUrls = () => {
    if (!discussionState || discussionState.length === 0) return null;

    const highest_item = discussionState.reduce(
      (smallest, current) => (current.depth < smallest.depth ? current : smallest),
      discussionState[0]
    );

    const postUrl = highest_item.url.startsWith('/') ? highest_item.url : `/${highest_item.url}`;
    const parentUrl = `${highest_item.category}/@${highest_item.parent_author}/${highest_item.parent_permlink}`;

    return { postUrl, parentUrl };
  };
  const { postUrl, parentUrl } = generateUrls() || {};

  if (entryIsLoading) return <LoadingClient loading={entryIsLoading} />;
  if (!entryData) return <div>Post not found</div>;

  return (
    <Content
      postUrl={postUrl}
      parentUrl={parentUrl}
      mutedListData={mutedListData || []}
      entryData={entryData}
      communityData={communityData}
      discussion={{ discussionIsLoading, discussionState }}
      userCanModerate={userCanModerate}
      params={{ community, tag, username }}
    />
  );
};

export default PostPage;
