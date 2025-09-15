'use client';

import { GetServerSideProps } from 'next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import PostForm from '../feature/post-editor/post-form';
import { useState, useEffect } from 'react';
import { getDefaultProps } from '../lib/get-translations';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import PostingLoader from '../components/posting-loader';
import { useLocalStorage } from 'usehooks-ts';
import { PostFormValues, DEFAULT_FORM_VALUE } from '../feature/post-editor/lib/utils';
import { DEFAULT_PREFERENCES, Preferences } from '../lib/utils';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getCommunity, getSubscriptions } from '@transaction/lib/bridge';

export const getServerSideProps: GetServerSideProps = getDefaultProps;

const TAB_TITLE = 'Create a post - Hive';

function Submit() {
  const searchParams = useSearchParams();
  const { t } = useTranslation('common_blog');
  const { user } = useUser();
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferences] = useLocalStorage<Preferences>(
    `user-preferences-${user.username}`,
    DEFAULT_PREFERENCES
  );
  const category = searchParams?.get('category') ?? DEFAULT_FORM_VALUE.category;
  const { data: communityData } = useQuery(
    ['community', category],
    () => getCommunity(category, user.username),
    {
      enabled: Boolean(category)
    }
  );

  const { data: mySubsData } = useQuery(
    ['subscriptions', user.username],
    () => getSubscriptions(user.username),
    {
      enabled: !!user.username
    }
  );

  const communitiesList = {
    mySubs: mySubsData
      ? mySubsData?.map((sub) => ({
          tag: sub[0],
          name: sub[1]
        }))
      : [],
    other:
      !!communityData && !mySubsData?.some((sub) => sub[0] === category)
        ? { name: communityData.title, tag: category }
        : undefined
  };

  const defaultValues = {
    ...DEFAULT_FORM_VALUE,
    category,
    maxAcceptedPayout: preferences.blog_rewards === '0%' ? 0 : 1000000,
    payoutType: preferences.blog_rewards
  };
  const [storedPost, storePost] = useLocalStorage<PostFormValues>(
    `postData-new-${user.username}`,
    defaultValues
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    storePost({
      ...storedPost,
      tags:
        !!communityData?.is_nsfw && !storedPost.tags.includes('nsfw')
          ? `nsfw ${storedPost.tags}`
          : storedPost.tags
    });
  }, [!!communityData?.is_nsfw]);

  return (
    <>
      <Head>
        <title>{TAB_TITLE}</title>
      </Head>
      <div className="px-4 py-8">
        {isClient && user?.username ? (
          <PostForm
            communitiesList={communitiesList}
            username={user.username}
            entryValues={storedPost}
            defaultValues={defaultValues}
            setIsSubmitting={setIsSubmitting}
          />
        ) : (
          <div
            className="block bg-green-50 px-4 py-6 text-sm font-light shadow-sm dark:bg-slate-800"
            data-testid="log-in-to-make-post-message"
          >
            {t('submit_page.log_in_to_post')}
          </div>
        )}
      </div>
      <PostingLoader isSubmitting={isSubmitting} />
    </>
  );
}

export default Submit;
