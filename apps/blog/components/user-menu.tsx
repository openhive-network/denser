import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@ui/components/dropdown-menu';
import { ReactNode } from 'react';
import { LangToggle } from './lang-toggle';
import { ModeToggle } from './mode-toggle';
import { User } from '../pages/api/user';
import Link from 'next/link';
import { Icons } from '@ui/components/icons';
import { Button } from '@ui/components';
import { useLocalStorage } from './hooks/use-local-storage';
import HiveAuthUtils from '../lib/hive-auth-utils';
import { fetchJson } from '../lib/fetch-json';
import { useUser } from './hooks/use-user';
import { siteConfig } from '@ui/config/site';

export function UserMenu({ children, user }: { children: ReactNode; user: User }) {
  const [, setHiveAuthData] = useLocalStorage('hiveAuthData', HiveAuthUtils.initialHiveAuthData);
  const { mutateUser } = useUser({
    redirectTo: '',
    redirectIfFound: true
  });
  const onLogout = async () => {
    setHiveAuthData(HiveAuthUtils.initialHiveAuthData);
    HiveAuthUtils.logout();
    await mutateUser(await fetchJson('/api/logout', { method: 'POST' }), false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 ">
        <DropdownMenuLabel className="flex w-full items-center gap-2">
          {user.username}
          <div className="flex items-center space-x-2">
            <Icons.hive className="h-4 w-4" />
            <div className="flex flex-col text-sm font-semibold">
              <span>Hive</span>
              <span className="text-red-600">Blog</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href={`/@${user.username}`}>
            <DropdownMenuItem className="cursor-pointer">
              <Icons.check className="mr-2" />
              Profile
            </DropdownMenuItem>
          </Link>
          <Link href={`/@${user.username}/notifications`}>
            <DropdownMenuItem className="cursor-pointer">
              <Icons.arrowBigDown className="mr-2" />
              Notifications
            </DropdownMenuItem>
          </Link>
          <Link href={`/@${user.username}/comments`}>
            <DropdownMenuItem className="cursor-pointer">
              <Icons.arrowRight className="mr-2" />
              Comments
            </DropdownMenuItem>
          </Link>
          <Link href={`/@${user.username}/replies`}>
            <DropdownMenuItem className="cursor-pointer">
              <Icons.calendarActive className="mr-2" />
              Replies
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem className="cursor-pointer">
            <ModeToggle>
              <Button variant="ghost" size="sm" className="p-0 font-normal" data-testid="theme-mode">
                <div className="h-6 w-8">
                  <Icons.sun className="absolute rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Icons.moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </div>
                <span>Toggle theme</span>
              </Button>
            </ModeToggle>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <LangToggle />
          </DropdownMenuItem>
          <Link href={`/@${user.username}`}>
            <DropdownMenuItem className="cursor-pointer">
              <Icons.twitter className="mr-2" />
              Wallet
            </DropdownMenuItem>
          </Link>
          <Link href={`/@${user.username}`}>
            <DropdownMenuItem className="cursor-pointer">
              <Icons.sun className="mr-2" />
              <Button
                variant="ghost"
                className="m-0 h-fit p-0 font-normal hover:text-red-500"
                data-testid="login-btn"
                onClick={async (e) => {
                  e.preventDefault();
                  await onLogout();
                }}
              >
                Logout
              </Button>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
