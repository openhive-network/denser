import { Popover, PopoverContent, PopoverTrigger } from '@ui/components/popover';
import UserInfoData from './user-info-data';

export default function UserInfoPopover({ username }: { username: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span className="flex w-fit cursor-pointer items-center">{username}</span>
      </PopoverTrigger>
      <PopoverContent className="w-fit">
        <UserInfoData username={username} />
      </PopoverContent>
    </Popover>
  );
}
