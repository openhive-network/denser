import Link from 'next/link';

const SubscriptionListItem = ({ community }: { community: any }) => {
  return (
    <li>
      <Link href={`/trending/${community[0]}`} className="mr-2 text-red-600 hover:underline">
        {community[1]}
      </Link>
      <span className="font-light">{community[2].toUpperCase()}</span>
    </li>
  );
};

export default SubscriptionListItem;
