'use client'
import Link from 'next/link';

export function SubscriptionListItem({community}) {
  return (
    <li>
      <Link href={community.link} className="mr-2 text-red-600 hover:underline">
        {community.name}
      </Link>
      <span className="font-light">{community.role}</span>
    </li>
  )
}
