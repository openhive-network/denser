import { getAccount } from "@ui/lib/hive";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
interface Community {
  about: string;
  admins?: string[];
  avatar_url: string;
  created_at: string;
  description: string;
  flag_text: string;
  id: number;
  is_nsfw: boolean;
  lang: string;
  name: string;
  num_authors: number;
  num_pending: number;
  subscribers: number;
  sum_pending: number;
  settings?: object;
  title: string;
  type_id: number;
}

const CommunityListItem = ({ community }: { community: Community }) => {
  const { data, isLoading, isError } = useQuery(
    ["accountData", community.name],
    () => getAccount(community.name)
  );
  if (isLoading) {
    return null;
  }
  return (
    <li
      className="font-semibold gap-2 hover:bg-slate-900 hover:text-red-500"
      title={community.title}
    >
      <Link
        href={`/trending/${community.name}`}
        className="h-full p-1 flex gap-2 items-center justify-center xl:justify-start"
      >
        {" "}
        <div
          className="h-[36px] w-[36px] rounded-3xl bg-cover bg-no-repeat"
          style={{
            backgroundImage: `url(https://images.hive.blog/u/${data?.name}/avatar)`,
          }}
        />
        <span className="hidden xl:block">{community.title}</span>
      </Link>
    </li>
  );
};
export default CommunityListItem;
