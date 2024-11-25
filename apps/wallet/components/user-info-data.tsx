import { Avatar, AvatarFallback, AvatarImage } from '@ui/components';
import useAccountData from './hooks/use-account-data';
import Link from 'next/link';
import { FileKey, UserSquare } from 'lucide-react';
import CopyToKeyboard from './copy-to-keyboard';
import { cutPublicKey } from '../lib/utils';
import { Authority } from '@hiveio/dhive/lib/chain/account';

export default function UserInfoData({ username }: { username: string }) {
  const authorityData = useAccountData(username);
  console.log(authorityData);

  return (
    <div>
      <Link href={`/@${username}/authorities`} className="flex items-center gap-2">
        <Avatar className="flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-full">
          <AvatarImage
            className="h-full w-full object-cover"
            src={authorityData?.avatar}
            alt="Profile picture"
          />
          <AvatarFallback>
            <img
              className="h-full w-full object-cover"
              src="https://images.hive.blog/DQmb2HNSGKN3pakguJ4ChCRjgkVuDN9WniFRPmrxoJ4sjR4"
              alt="default img"
            />
          </AvatarFallback>
        </Avatar>
        <span>{username}</span>
      </Link>
      <div>
        {authorityData ? (
          <div className="grid gap-1">
            <Group data={authorityData.posting} title="Posting authority" />
            <Group data={authorityData.active} title="Posting active" />
            <Group data={authorityData.owner} title="Posting owner " />
          </div>
        ) : null}
      </div>
    </div>
  );
}

const Group = ({ data, title }: { data: Authority; title: string }) => {
  return (
    <>
      <div className="col-span-3 grid grid-cols-subgrid items-center pl-2 text-xs hover:bg-foreground/20 sm:text-base">
        <div className="w-5 text-nowrap">{title}</div>
        <div className="flex min-w-56 justify-end">
          <span className="w-fit">Threshold:</span>
        </div>
        <div className="w-5">{data.weight_threshold}</div>
      </div>
      <div className="col-span-3 grid grid-cols-subgrid items-center pl-2 text-xs hover:bg-foreground/20 sm:text-base">
        <div>
          <FileKey className="w-5" />
        </div>
        {data.key_auths.map((e) => {
          const label = e[0].toString();
          const weight = e[1];
          return (
            <>
              <CopyToKeyboard value={label} displayValue={cutPublicKey(label)} />
              <div className="w-5">{weight}</div>
            </>
          );
        })}
        {data.key_auths.length !== 0
          ? data.account_auths.map((e) => {
              const label = e[0];
              const weight = e[1];
              return (
                <>
                  <UserSquare className="w-5" />
                  <Link href={`/@${label}/authorities`}>{label}</Link>
                  <div className="w-5">{weight}</div>
                </>
              );
            })
          : null}
      </div>
    </>
  );
};
