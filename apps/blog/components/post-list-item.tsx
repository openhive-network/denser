import Link from "next/link";
import {
  cn,
  extractPictureFromPostBody,
  extractUrlsFromJsonString,
  extractYouTubeVideoIds,
  getPostSummary,
} from "@/blog/lib/utils";
import { Icons } from "@hive/ui/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@hive/ui/components/card";
import { Separator } from "@hive/ui/components/separator";
import { Badge } from "@hive/ui/components/badge";
import parseDate, { dateToRelative } from "@hive/ui/lib/parse-date";
import accountReputation from "@/blog/lib/account-reputation";
import { AlertDialogDemo } from "./alert-window";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@hive/ui/components/tooltip";
import DetailsCardHover from "./details-card-hover";
import DialogLogin from "@/blog/components/dialog-login";
import { useRouter } from "next/router";
import { proxifyImageUrl } from "@hive/ui/lib/old-profixy";
import { customEndsWith } from "@/blog/lib/ends-with";
import { useState } from "react";
import { Entry } from "@/blog/lib/bridge";

const PostListItem = ({
  post,
  sort,
  isCommunityPage,
}: {
  post: Entry;
  sort: string | undefined | null;
  isCommunityPage: boolean | undefined;
}) => {
  const [reveal, setReveal] = useState(
    post.json_metadata?.tags && post.json_metadata?.tags.includes("nsfw")
  );
  const router = useRouter();

  function revealPost() {
    setReveal((reveal) => !reveal);
  }
  const youtube_id = extractYouTubeVideoIds(
    extractUrlsFromJsonString(post.body)
  );
  const pictures_extracted = extractPictureFromPostBody(
    extractUrlsFromJsonString(post.body)
  );
  return (
    <li
      data-testid="post-list-item"
      className={sort === "muted" ? "opacity-50 hover:opacity-100" : ""}
    >
      <Card
        className={cn(
          "my-4 px-2 hover:bg-accent  hover:text-accent-foreground dark:bg-background/95 dark:text-white dark:hover:bg-accent dark:hover:text-accent-foreground"
        )}
      >
        {post.original_entry ? (
          <div className="mt-2 rounded-sm bg-slate-100 px-2 py-1 text-sm dark:bg-slate-900">
            <p className="flex items-center gap-1 text-xs md:text-sm">
              <Icons.crossPost className="h-4 w-4 text-slate-500 dark:text-slate-400" />{" "}
              <Link
                className="text-slate-500 hover:cursor-pointer hover:text-red-600 dark:text-slate-400"
                href={`/@${post.author}`}
              >
                {post.author}
              </Link>{" "}
              cross-posted{" "}
              <Link
                href={`/${post.original_entry.community}/@${post.original_entry.author}/${post.original_entry.permlink}`}
                className="text-red-600 hover:cursor-pointer"
              >
                @{post.original_entry.author}/{post.original_entry.permlink}
              </Link>
            </p>
          </div>
        ) : null}
        {post.reblogged_by ? (
          <div className="flex items-center gap-2 py-1 text-sm text-gray-400">
            <Icons.forward className="h-4 w-4" />
            <span>
              <Link
                href={`/@${post.reblogged_by[0]}`}
                className="cursor-pointer hover:text-red-600"
              >
                {post.reblogged_by[0]}
              </Link>{" "}
              reblogged
            </span>
          </div>
        ) : null}
        <CardHeader className="px-0 py-1">
          <div className="md:text-md flex items-center text-xs text-slate-500 dark:text-slate-400">
            <Link href={`/@${post.author}`} data-testid="post-card-avatar">
              <div
                className="mr-3 h-[24px] w-[24px] rounded-3xl bg-cover bg-no-repeat"
                style={{
                  backgroundImage: `url(https://images.hive.blog/u/${post.author}/avatar/small)`,
                }}
              />
            </Link>
            <div className="flex items-center">
              <Link
                href={`/@${post.author}`}
                className="font-medium text-black hover:cursor-pointer hover:text-red-600 dark:text-white dark:hover:text-red-600"
                data-testid="post-author"
              >
                {post.author}
              </Link>{" "}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    ({accountReputation(post.author_reputation)})
                  </TooltipTrigger>
                  <TooltipContent>Reputation</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {post.blacklists && post.blacklists[0] ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="text-red-600">
                        ({post.blacklists.length})
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{post.blacklists[0]}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
              {post.author_title ? (
                <Badge
                  variant="outline"
                  className="ml-1 border-red-600 text-slate-500"
                >
                  {post.author_title}
                </Badge>
              ) : null}
              {(router.query.param
                ? router.query.param[1]?.startsWith("hive-")
                : false) &&
              post.author_role &&
              post.author_role !== "guest" ? (
                <span className="text-xs md:text-sm">
                  &nbsp;{post.author_role.toUpperCase()}&nbsp;
                </span>
              ) : null}
              <span className="flex items-center text-xs md:text-sm">
                {!isCommunityPage ? (
                  <>
                    &nbsp;in&nbsp;
                    {post.community ? (
                      <Link
                        href={`/trending/${post.community}`}
                        className="hover:cursor-pointer hover:text-red-600"
                        data-testid="post-card-community"
                      >
                        {post.community_title}
                      </Link>
                    ) : (
                      <Link
                        href={`/trending/${post.category}`}
                        className="hover:cursor-pointer hover:text-red-600"
                        data-testid="post-card-category"
                      >
                        #{post.category}
                      </Link>
                    )}
                    <span className="mx-1">•</span>
                  </>
                ) : null}
                <Link
                  href={`/${post.category}/@${post.author}/${post.permlink}`}
                  className="hover:cursor-pointer hover:text-red-600"
                  data-testid="post-card-timestamp"
                >
                  <span title={String(parseDate(post.created))}>
                    {dateToRelative(post.created)} ago
                  </span>
                </Link>
                {post.percent_hbd === 0 ? (
                  <span className="ml-1 flex items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Link href={`${post.url}`}>
                            <Icons.hive className="h-4 w-4" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Powered Up 100%</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                ) : null}
                {post.stats && post.stats.is_pinned && isCommunityPage ? (
                  <Badge className="ml-1 bg-red-600 text-white hover:bg-red-600">
                    <Link href={`${post.url}`} data-testid="post-pinned-tag">
                      Pinned
                    </Link>
                  </Badge>
                ) : null}
              </span>
            </div>
          </div>
        </CardHeader>
        <div className="flex flex-col md:flex-row">
          <div>
            {!reveal && post.blacklists.length < 1 ? (
              <>
                {post.original_entry ? (
                  <Link href={`${post.url}`} data-testid="post-image">
                    <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                      <picture className="articles__feature-img h-ful w-full">
                        <source
                          srcSet={proxifyImageUrl(
                            post.original_entry.json_metadata.image[0],
                            "256x512"
                          ).replace(/ /g, "%20")}
                          media="(min-width: 1000px)"
                        />
                        <img
                          srcSet={post.original_entry.json_metadata.image[0]}
                          alt="Post image"
                          loading="lazy"
                        />
                      </picture>
                    </div>
                  </Link>
                ) : post.json_metadata.image && post.json_metadata.image[0] ? (
                  <Link href={`${post.url}`} data-testid="post-image">
                    <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                      <picture className="articles__feature-img h-ful w-full">
                        <source
                          srcSet={proxifyImageUrl(
                            post.json_metadata.image[0],
                            "256x512"
                          ).replace(/ /g, "%20")}
                          media="(min-width: 1000px)"
                        />
                        <img
                          srcSet={post.json_metadata.image[0]}
                          alt="Post image"
                          loading="lazy"
                        />
                      </picture>
                    </div>
                  </Link>
                ) : post.json_metadata.images &&
                  post.json_metadata.images[0] ? (
                  <Link href={`${post.url}`} data-testid="post-image">
                    <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                      <picture className="articles__feature-img h-ful w-full">
                        <source
                          srcSet={proxifyImageUrl(
                            post.json_metadata.images[0],
                            "256x512"
                          ).replace(/ /g, "%20")}
                          media="(min-width: 1000px)"
                        />
                        <img
                          srcSet={post.json_metadata.images[0]}
                          alt="Post image"
                          loading="lazy"
                        />
                      </picture>
                    </div>
                  </Link>
                ) : post.json_metadata.flow?.pictures &&
                  post.json_metadata.flow?.pictures[0] ? (
                  <Link href={`${post.url}`} data-testid="post-image">
                    <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                      <picture className="articles__feature-img h-ful w-full">
                        <source
                          srcSet={proxifyImageUrl(
                            post.json_metadata.flow.pictures[0].url,
                            "256x512"
                          ).replace(/ /g, "%20")}
                          media="(min-width: 1000px)"
                        />
                        <img
                          srcSet={post.json_metadata.flow.pictures[0].url}
                          alt="Post image"
                          loading="lazy"
                        />
                      </picture>
                    </div>
                  </Link>
                ) : post.json_metadata.links &&
                  post.json_metadata.links[0] &&
                  customEndsWith(
                    post.json_metadata.links[0].slice(
                      0,
                      post.json_metadata.links[0].length - 1
                    ),
                    ["png", "webp", "jpeg", "jpg"]
                  ) ? (
                  <Link href={`${post.url}`} data-testid="post-image">
                    <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                      <picture className="articles__feature-img h-ful w-full">
                        <source
                          srcSet={proxifyImageUrl(
                            post.json_metadata.links[0].slice(
                              0,
                              post.json_metadata.links[0].length - 1
                            ),
                            "256x512"
                          ).replace(/ /g, "%20")}
                          media="(min-width: 1000px)"
                        />
                        <img
                          srcSet={post.json_metadata.links[0].slice(
                            0,
                            post.json_metadata.links[0].length - 1
                          )}
                          alt="Post image"
                          loading="lazy"
                        />
                      </picture>
                    </div>
                  </Link>
                ) : youtube_id[0] ? (
                  <Link href={`${post.url}`} data-testid="post-image">
                    <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                      <picture className="articles__feature-img h-full w-full">
                        <source
                          srcSet={`https://img.youtube.com/vi/${youtube_id[0]}/0.jpg`}
                          media="(min-width: 1000px)"
                        />

                        <img
                          className="w-full"
                          srcSet={`https://img.youtube.com/vi/${youtube_id[0]}/0.jpg`}
                          alt="Post image"
                          loading="lazy"
                        />
                      </picture>
                    </div>
                  </Link>
                ) : pictures_extracted[0] ? (
                  <Link href={`/${post.url}`} data-testid="post-image">
                    <div className="relative mr-3.5 flex h-full max-h-fit min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                      <picture className="articles__feature-img h-ful w-full">
                        <source
                          srcSet={proxifyImageUrl(
                            pictures_extracted[0],
                            "256x512"
                          ).replace(/ /g, "%20")}
                          media="(min-width: 1000px)"
                        />
                        <img
                          srcSet={pictures_extracted[0]}
                          alt="Post image"
                          loading="lazy"
                        />
                      </picture>
                    </div>
                  </Link>
                ) : (
                  <Link href={`/${post.url}`} data-testid="post-image">
                    <div className="relative mr-3.5 flex max-h-[300px] md:h-full md:min-h-fit items-center overflow-hidden bg-transparent md:max-h-[80px] md:w-fit md:min-w-[130px] md:max-w-[130px]">
                      <img
                        className="w-full bg-cover bg-no-repeat"
                        src={`https://images.hive.blog/u/${post.author}/avatar/large`}
                      />
                    </div>
                  </Link>
                )}
              </>
            ) : null}
          </div>
          <div className="md:overflow-hidden">
            <CardContent>
              {!reveal ? (
                <>
                  <CardTitle data-testid="post-title" className="text-md">
                    <Link
                      href={`/${post.category}/@${post.author}/${post.permlink}`}
                    >
                      {post.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="block w-auto md:overflow-hidden md:overflow-ellipsis md:whitespace-nowrap">
                    <Link
                      href={`/${post.category}/@${post.author}/${post.permlink}`}
                    >
                      {getPostSummary(post.json_metadata, post.body)}
                    </Link>
                  </CardDescription>
                  <Separator orientation="horizontal" className="my-1" />
                </>
              ) : (
                <>
                  <p>
                    <Badge
                      variant="outline"
                      className="mx-1 border-red-600 text-red-600"
                    >
                      nsfw
                    </Badge>
                    <span
                      className="cursor-pointer text-red-600"
                      onClick={revealPost}
                    >
                      Reveal this post
                    </span>{" "}
                    or{" "}
                    <Link
                      href="https://signup.hive.io/"
                      className="cursor-pointer text-red-600"
                    >
                      create an account
                    </Link>{" "}
                    to save your preferences.
                  </p>
                </>
              )}
            </CardContent>
            <CardFooter className="pb-2">
              <div
                className="flex h-5 items-center space-x-2 text-sm"
                data-testid="post-card-footer"
              >
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger data-testid="upvote-button">
                        <DialogLogin>
                          <Icons.arrowUpCircle className="h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1" />
                        </DialogLogin>
                      </TooltipTrigger>
                      <TooltipContent data-testid="upvote-button-tooltip">
                        Upvote
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger data-testid="downvote-button">
                        <DialogLogin>
                          <Icons.arrowDownCircle className="h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1" />
                        </DialogLogin>
                      </TooltipTrigger>
                      <TooltipContent data-testid="downvote-button-tooltip">
                        Downvote
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <DetailsCardHover
                  post={post}
                  decline={Number(post.max_accepted_payout.slice(0, 1)) === 0}
                >
                  <div
                    className={`flex items-center hover:cursor-pointer hover:text-red-600 ${
                      Number(post.max_accepted_payout.slice(0, 1)) === 0
                        ? "text-gray-600 line-through"
                        : ""
                    }`}
                    data-testid="post-payout"
                  >
                    ${post.payout.toFixed(2)}
                  </div>
                </DetailsCardHover>

                <Separator orientation="vertical" />
                <div className="flex items-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        className="flex items-center"
                        data-testid="post-total-votes"
                      >
                        <Icons.chevronUp className="h-4 w-4 sm:mr-1" />
                        {post.stats && post.stats.total_votes}
                      </TooltipTrigger>
                      <TooltipContent data-testid="post-card-votes-tooltip">
                        <p>
                          {post.stats && post.stats.total_votes > 0
                            ? post.stats.total_votes
                            : "no"}
                          {post.stats && post.stats.total_votes > 1
                            ? " votes"
                            : " vote"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Separator orientation="vertical" />
                <div className="flex items-center" data-testid="post-children">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center">
                        <Link
                          href={`/${post.category}/@${post.author}/${post.permlink}/#comments`}
                          className="flex cursor-pointer items-center"
                        >
                          {post.children > 1 ? (
                            <Icons.messagesSquare className="h-4 w-4 sm:mr-1" />
                          ) : (
                            <Icons.comment className="h-4 w-4 sm:mr-1" />
                          )}
                        </Link>
                        <Link
                          href={`/${post.category}/@${post.author}/${post.permlink}/#comments`}
                          className="flex cursor-pointer items-center hover:text-red-600 pl-1"
                        >
                          {post.children}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent data-testid="post-card-responses">
                        <p>{` ${
                          post.children === 0
                            ? "No responses"
                            : post.children === 1
                            ? post.children + " response"
                            : post.children + " responses"
                        }. Click to respond`}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Separator orientation="vertical" />
                {!post.title.includes("RE: ") ? (
                  <div
                    className="flex items-center"
                    data-testid="post-card-reblog"
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertDialogDemo>
                            <Icons.forward className="h-4 w-4 cursor-pointer" />
                          </AlertDialogDemo>
                        </TooltipTrigger>
                        <TooltipContent data-testid="post-card-reblog-tooltip">
                          <p>
                            Reblog @{post.author}/{post.permlink}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : null}
              </div>
            </CardFooter>
          </div>
        </div>
      </Card>
    </li>
  );
};

export default PostListItem;
