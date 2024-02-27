import {
  Award,
  Banknote,
  BellRing,
  Cloud,
  LogOut,
  Mails,
  MessageSquare,
  Newspaper,
  Settings,
  User,
  Wallet
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@ui/components/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/components/avatar';
import Link from 'next/link';
import { useAppStore } from '@/blog/store/app';
import { useQuery } from '@tanstack/react-query';
import { getAccountFull } from '@transaction/lib/hive';
import env from '@beam-australia/react-env';

const ProfileDropdownMenu = () => {
  const currentProfile = useAppStore((state) => state.currentProfile);
  const setCurrentProfile = useAppStore((state) => state.setCurrentProfile);
  const walletHost = env('WALLET_ENDPOINT');

  const {
    isLoading: currentProfileDataIsLoading,
    error: currenProfileDataError,
    data: currentProfileData
  } = useQuery(['currentProfile'], () => getAccountFull('gtg'), {
    onSuccess: (data) => {
      setCurrentProfile(data);
    }
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="rounded-md" data-testid="profile-menu">
          {currentProfile && (
            <AvatarImage src={`https://images.hive.blog/u/${currentProfile?.name || ''}/avatar/small`} />
          )}
          <AvatarFallback>{currentProfile?.name.slice(0, 2).toUpperCase() || ''}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" data-testid="profile-menu-content">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <Link href={`/@${currentProfile?.name}`}>Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Newspaper className="mr-2 h-4 w-4" />
            <Link href={`/@${currentProfile?.name}/posts`}>Posts</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <MessageSquare className="mr-2 h-4 w-4" />
            <Link href={`/@${currentProfile?.name}/comments`}>Comments</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Banknote className="mr-2 h-4 w-4" />
            <Link href={`/@${currentProfile?.name}/payout`}>Payouts</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Mails className="mr-2 h-4 w-4" />
            <Link href={`/@${currentProfile?.name}/replies`}>Replies</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Award className="mr-2 h-4 w-4" />
            <Link href={`/@${currentProfile?.name}/communities`}>Social</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <BellRing className="mr-2 h-4 w-4" />
            <Link href={`/@${currentProfile?.name}/notifications`}>Notifications</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <Link href={`/@${currentProfile?.name}/settings`}>Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Wallet className="mr-2 h-4 w-4" />
          <Link href={`${walletHost}/@${currentProfile?.name}/transfers`}>Wallet</Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Cloud className="mr-2 h-4 w-4" />
          <span>API</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <LogOut className="mr-2 h-4 w-4" />
          <Link href={`/`}>Log out</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdownMenu;
