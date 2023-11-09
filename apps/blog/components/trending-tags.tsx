import { useQuery } from "@tanstack/react-query";
import { getTrendingTags } from "../lib/hive";
import { Card, CardContent } from "@ui/components/card";
import Link from "next/link";

const TrendingTags = () => {
  const { data, isLoading } = useQuery(["trendingTags"], () =>
    getTrendingTags("")
  );
  if (isLoading) {
    return <>Loading</>;
  }

  return (
    <Card className="my-4 py-3 xl:pt-0 h-fit w-full flex-col dark:bg-background/95 dark:text-white overflow-hidden hidden lg:flex">
      <CardContent className="p-0">
        <span className="font-bold gap-2 text-center py-3 bg-slate-950 text-white hidden xl:block">
          Trending Tags
        </span>
        <ul className="text-sm flex flex-col">
          {data?.map((e) => (
            <li key={e} className="w-full flex">
              <Link
                title={e}
                href={`/trending/${e}`}
                className="px-2 py-1 font-semibold gap-2 w-full h-full hover:bg-slate-900 hover:text-red-500"
              >
                #{e}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
export default TrendingTags;
