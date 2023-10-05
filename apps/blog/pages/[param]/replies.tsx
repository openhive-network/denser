import ProfileLayout from "@/blog/components/common/profile-layout";
import { useSiteParams } from "@hive/ui/components/hooks/use-site-params";
import { getAccountPosts, DATA_LIMIT as PER_PAGE } from "@/blog/lib/bridge";
import { useInfiniteQuery } from "@tanstack/react-query";
import RepliesList from "@/blog/components/replies-list";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { PostSkeleton } from "../[...param]";

export default function UserReplies() {
  const { username } = useSiteParams();
  const { ref, inView } = useInView();

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery(
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
              permlink: lastPage[lastPage.length - 1].permlink,
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

  return (
    <ProfileLayout>
      {!isLoading && data ? (
        <div className="flex flex-col">
          {data.pages.map((page, index) => {
            return page && page.length > 0 ? (
              <RepliesList data={page} key={`replies-${index}`} />
            ) : (
              <div
                key="empty"
                className="px-4 py-6 mt-12 bg-green-100 dark:bg-slate-700 text-sm"
              >
                @{username} hasn&apos;t had any replies yet.
              </div>
            );
          })}
          <div>
            <button
              ref={ref}
              onClick={() => fetchNextPage()}
              disabled={!hasNextPage || isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <PostSkeleton />
              ) : hasNextPage ? (
                "Load Newer"
              ) : data.pages[0] && data.pages[0].length > 0 ? (
                "Nothing more to load"
              ) : null}
            </button>
          </div>
        </div>
      ) : null}
    </ProfileLayout>
  );
}
