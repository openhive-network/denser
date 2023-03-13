import Link from 'next/link';

export function SubscriptionListItem({community}) {
  return (
    <li>
      <Link href={community[0]} className="mr-2 text-red-600 hover:underline">
        {community[1]}
      </Link>
      <span className="font-light">{community[2].toUpperCase()}</span>
    </li>
  )
}
