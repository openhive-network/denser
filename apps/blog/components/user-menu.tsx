import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@ui/components/dropdown-menu';
import { ReactNode } from 'react';
import ModeToggle from './mode-toggle';
import { User } from '../pages/api/user';
import Link from 'next/link';
import { Icons } from '@ui/components/icons';
import { Button } from '@ui/components';
import { useLocalStorage } from './hooks/use-local-storage';
import HiveAuthUtils from '../lib/hive-auth-utils';
import { useSignOut } from './hooks/use-sign-out';
import { getLogger } from '@ui/lib/logging';
import LangToggle from './lang-toggle';

const logger = getLogger('app');

const UserMenu = ({ children, user }: { children: ReactNode; user: User }) => {
  const [, setHiveAuthData] = useLocalStorage('hiveAuthData', HiveAuthUtils.initialHiveAuthData);
  const [, setHiveKeys] = useLocalStorage('hiveKeys', {});
  const signOut = useSignOut();
  const onLogout = async () => {
    setHiveKeys({});
    setHiveAuthData(HiveAuthUtils.initialHiveAuthData);
    HiveAuthUtils.logout();
    try {
      await signOut.mutateAsync();
    } catch (error) {
      logger.error('Error in logout', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 ">
        <DropdownMenuLabel className="flex w-full items-center justify-between">
          <span>{user.username}</span>
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
              <Icons.user className="mr-2" />
              <span className="w-full">Profile</span>
            </DropdownMenuItem>
          </Link>
          <Link href={`/@${user.username}/notifications`}>
            <DropdownMenuItem className="cursor-pointer">
              <Icons.clock className="mr-2" />
              <span className="w-full">Notifications</span>
            </DropdownMenuItem>
          </Link>
          <Link href={`/@${user.username}/comments`}>
            <DropdownMenuItem className="cursor-pointer">
              <Icons.comment className="mr-2" />
              <span className="w-full">Comments</span>
            </DropdownMenuItem>
          </Link>
          <Link href={`/@${user.username}/replies`}>
            <DropdownMenuItem className="cursor-pointer">
              <Icons.undo className="mr-2" />
              <span className="w-full">Replies</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem className="cursor-pointer">
            <ModeToggle>
              <Button
                variant="ghost"
                size="sm"
                className="flex h-6 w-full p-0 text-start font-normal"
                data-testid="theme-mode"
              >
                <div className="h-6 w-8">
                  <Icons.sun className="absolute rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Icons.moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </div>
                <span className="w-full">Toggle theme</span>
              </Button>
            </ModeToggle>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <LangToggle logged={true} />
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Link
              target="_blank"
              href={`http://localhost:4000/@${user.username}/transfers`}
              className="flex w-full items-center"
            >
              <Icons.wallet className="mr-2" />
              <span className="w-full">Wallet</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Link
              href=""
              onClick={async (e) => {
                e.preventDefault();
                await onLogout();
              }}
              className="flex w-full items-center"
            >
              <Icons.doorOpen className="mr-2" />
              <span className="w-full">Logout</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
export default UserMenu;
