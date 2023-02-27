'use client'
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SubNavigation({ username }) {
  const pathname = usePathname();
  return (
    <div className="flex h-5 items-center justify-center space-x-4 text-sm">
      <Separator />
      <Link
        href={`/${username}/posts`}
        className={`cursor-pointer hover:text-red-600 hover:underline ${
          pathname === `/${username}/posts` ? "text-red-600" : ""
        }`}
      >
        Posts
      </Link>
      <Separator orientation="vertical" />
      <Link
        href={`/${username}/comments`}
        className={`cursor-pointer hover:text-red-600 hover:underline ${
          pathname === `/${username}/comments` ? "text-red-600" : ""
        }`}
      >
        Comments
      </Link>
      <Separator orientation="vertical" />
      <Link
        href={`/${username}/payouts`}
        className={`cursor-pointer hover:text-red-600 hover:underline ${
          pathname === `/${username}/payouts` ? "text-red-600" : ""
        }`}
      >
        Payouts
      </Link>
      <Separator />
    </div>
  )
}
