import ProfileLayout from "@/blog/components/common/profile-layout";
import { useSiteParams } from "@hive/ui/components/hooks/use-site-params";
import { getAccountPosts, DATA_LIMIT as PER_PAGE, } from "@/blog/lib/bridge";
import { useInfiniteQuery } from "@tanstack/react-query";
import RepliesList from "@/blog/components/replies-list";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { PostSkeleton } from "../[...param]";

export default function UserReplies() {
  const { username } = useSiteParams();
  const { ref, inView } = useInView();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery(
    ["accountReplies", username, "replies"],
    async ({
      pageParam,
    }: {
      pageParam?: { author: string; permlink: string };
    }) => {
      return await getAccountPosts(
        "replies",
        username,
        "hive.blog",
        pageParam?.author,
        pageParam?.permlink
      );
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.length === PER_PAGE) {
          return {
            author: lastPage[lastPage.length - 1].author,
            permlink: lastPage[lastPage.length - 1].permlink
          };
        }
      },

      enabled: !!username,
    }
  );

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  const lastPageData = data?.pages[data?.pages.length - 1];

  if (isLoading) return <p>Loading...</p>;

  return (
    <ProfileLayout>
      {!isLoading && data ? (
        <div className="flex flex-col">
          {data.pages.map((page, index) => {
            return page ? (
              <RepliesList data={page} key={`replies-${index}`} />
            ) : null;
          })}
          <div>
            <button
              ref={ref}
              onClick={() => fetchNextPage()}
              disabled={!hasNextPage || isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <PostSkeleton />
              ) : data.pages.length > 1 &&
                lastPageData &&
                lastPageData.length > 0 ? (
                "Load Newer"
              ) : null}
            </button>
          </div>
        </div>
      ) : null}
    </ProfileLayout>
  );
}
