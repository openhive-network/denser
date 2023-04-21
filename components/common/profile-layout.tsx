import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Award, BellRing, Cast, MessageSquare, Newspaper, Settings, Wallet } from 'lucide-react';

import ProfileInfo from '@/components/profile-info';
import { Button } from '@/components/ui/button';
import { useSiteParams } from '@/components/hooks/use-site-params';
import Loading from '@/components/loading';

interface IProfileLayout {
  children: React.ReactNode;
}

const ProfileLayout = ({ children }: IProfileLayout) => {
  const [coverImage, setCoverImage] = useState('');
  const router = useRouter();
  const { username } = useSiteParams();
  return username ? (
    <div>
      <div className="min-h-80 h-80 max-h-80 w-full">
        {coverImage !== '' ? (
          <div
            style={{
              background: `url('${coverImage}') center center no-repeat`,
              backgroundSize: 'cover'
            }}
            className={`h-auto max-h-full min-h-full w-auto min-w-full max-w-full`}
          />
        ) : (
          <div className={`h-auto max-h-full min-h-full w-auto min-w-full max-w-full bg-gray-600 bg-cover`} />
        )}
      </div>
      <div className="flex flex-col pb-8 md:flex-row md:pb-4 ">
        <ProfileInfo handleCoverImage={setCoverImage} />
        <main className="w-full px-4">
          <div className="flex justify-between py-8" data-testid="profile-navigation">
            <ul className="grid grid-cols-2 gap-4 lg:flex lg:gap-8">
              <li>
                <Link
                  href={`/@${username}`}
                  className={` dark:text-red-100dark:hover:text-white hover:text-red-600 ${
                    router.asPath === `/@${username}` ? ' text-red-600  dark:text-red-600' : ''
                  }`}
                >
                  Feed
                </Link>
              </li>
              <li>
                <Link
                  href={`/@${username}/posts`}
                  className={` hover:text-red-600 dark:text-red-100  dark:hover:text-white ${
                    router.asPath === `/@${username}/posts` ||
                    router.asPath === `/@${username}/comments` ||
                    router.asPath === `/@${username}/payout`
                      ? ' text-red-600  dark:text-red-600'
                      : ''
                  }`}
                >
                  Posts
                </Link>
              </li>
              <li>
                <Link
                  href={`/@${username}/replies`}
                  className={`hover:text-red-600 dark:text-red-100  dark:hover:text-white ${
                    router.asPath === `/@${username}/replies` ? ' text-red-600 dark:text-red-600' : ''
                  }`}
                >
                  Replies
                </Link>
              </li>
              <li>
                <Link
                  href={`/@${username}/communities`}
                  className={` hover:text-red-600 dark:text-red-100 dark:hover:text-white ${
                    router.asPath === `/@${username}/communities` ? ' d text-red-600 dark:text-red-600' : ''
                  }`}
                >
                  Social
                </Link>
              </li>
              <li>
                <Link
                  href={`/@${username}/notifications`}
                  className={` hover:text-red-600 dark:text-red-100 dark:hover:text-white ${
                    router.asPath === `/@${username}/notifications` ? 'text-red-600 dark:text-red-600' : ''
                  }`}
                >
                  Notifications
                </Link>
              </li>
            </ul>
            <ul className="grid grid-cols-2 gap-2 lg:flex lg:gap-4">
              <li>
                <Link
                  href={`https://wallet.hive.blog/@${username}/transfers`}
                  className="hover:text-red-600 dark:text-red-100  dark:hover:text-white"
                >
                  Wallet
                </Link>
              </li>
              <li>
                <Link
                  href={`/@${username}/settings`}
                  className={` hover:text-red-600 dark:text-red-100  dark:hover:text-white ${
                    router.asPath === `/@${username}/settings` ? ' text-red-600 dark:text-red-600' : ''
                  }`}
                >
                  Settings
                </Link>
              </li>
            </ul>
          </div>
          {children}
        </main>
      </div>
    </div>
  ) : (
    <Loading loading={true} />
  );
};

export default ProfileLayout;
