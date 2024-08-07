'use client';
import { Separator } from '@ui/components/separator';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SubNavigation({ username }: { username: string }) {
  const pathname = usePathname();
  return (
    <div className="flex h-5 items-center justify-center space-x-4 text-sm">
      <Separator />
      <Link
        href={`/${username}/posts`}
        className={`cursor-pointer hover:text-destructive hover:underline ${
          pathname === `/${username}/posts` ? 'text-destructive' : ''
        }`}
      >
        Posts
      </Link>
      <Separator orientation="vertical" />
      <Link
        href={`/${username}/comments`}
        className={`cursor-pointer hover:text-destructive hover:underline ${
          pathname === `/${username}/comments` ? 'text-destructive' : ''
        }`}
      >
        Comments
      </Link>
      <Separator orientation="vertical" />
      <Link
        href={`/${username}/payouts`}
        className={`cursor-pointer hover:text-destructive hover:underline ${
          pathname === `/${username}/payouts` ? 'text-destructive' : ''
        }`}
      >
        Payouts
      </Link>
      <Separator />
    </div>
  );
}
