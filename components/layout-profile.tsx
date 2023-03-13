import Image from 'next/image';
import ProfileInfo from '@/components/profile-info';
import { Button } from '@/components/ui/button';
import { Award, BellRing, Cast, MessageSquare, Newspaper, Settings, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function LayoutProfile({ children }) {
  const router = useRouter()
  const { username } = router.query
  return (
    <div>
      <div className="min-h-80 h-80 max-h-80 w-full">
        <Image
          src="/banner.png"
          alt="Banner image"
          className="h-auto max-h-full min-h-full w-auto min-w-full max-w-full"
          height="320"
          width="960"
          priority
        />
      </div>
      <div className="flex flex-col pb-8 md:flex-row md:pb-4 ">
        <ProfileInfo />
        <main style={{ width: 'calc(100% - 20rem)'}}>
          <div className="flex justify-between py-8">
            <ul className="grid grid-cols-2 gap-4 lg:flex lg:gap-8">
              <li>
                <Button
                  variant="ghost"
                  className="hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white"
                >
                  <Newspaper className="mr-2" />
                  Feed
                </Button>
              </li>
              <li>
                <Link href={`/profile/${username}/posts`}>
                  <Button
                    variant="ghost"
                    className="hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white"
                  >
                    <MessageSquare className="mr-2" />
                    Posts
                  </Button>
                </Link>
              </li>
              <li>
                <Link href={`/profile/${username}/replies`}>
                  <Button
                    variant="ghost"
                    className="hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white"
                  >
                    <Cast className="mr-2" />
                    Replies
                  </Button>
                </Link>
              </li>
              <li>
                <Link href={`/profile/${username}/communities`}>
                  <Button
                    variant="ghost"
                    className="hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white"
                  >
                    <Award className="mr-2" />
                    Social
                  </Button>
                </Link>
              </li>
              <li>
                <Link href={`/profile/${username}/notifications`}>
                  <Button
                    variant="ghost"
                    className="hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white"
                  >
                    <BellRing className="mr-2" />
                    Notifications
                  </Button>
                </Link>
              </li>
            </ul>
            <ul className="grid grid-cols-2 gap-2 lg:flex lg:gap-4">
              <li>
                <Link
                  href={`https://wallet.hive.blog/${username}/transfers`}
                >
                  <Button
                    variant="ghost"
                    className="hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white"
                  >
                    <Wallet className="mr-2" />
                    Wallet
                  </Button>
                </Link>
              </li>
              <li>
                <Link href={`/profile/${username}/settings`}>
                  <Button
                    variant="ghost"
                    className="hover:bg-red-100 hover:text-red-600 dark:text-red-100 dark:hover:bg-red-800 dark:hover:text-white"
                  >
                    <Settings className="mr-2" />
                    Settings
                  </Button>
                </Link>
              </li>
            </ul>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
