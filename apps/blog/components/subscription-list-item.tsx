import { Badge } from "@hive/ui";
import Link from "next/link";

const SubscriptionListItem = ({ community }: { community: string[] }) => {
  return (
    <li data-testid="author-community-subscribed-list-item">
      <Link
        href={`/trending/${community[0]}`}
        className="mr-2 text-red-600 hover:underline"
        data-testid="author-community-subscribed-link"
      >
        {community[1]}
      </Link>
      <span className="font-light text-sm opacity-60" data-testid="author-role-community">
        {community[2].toUpperCase()}
      </span>
      {community[3] ? (
        <Badge variant="outline" className="ml-1 border-red-600 text-slate-500" data-testid="author-affiliation-tag">
          {community[3]}
        </Badge>
      ) : null}
    </li>
  );
};

export default SubscriptionListItem;
