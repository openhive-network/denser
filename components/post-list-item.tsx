import Link from 'next/link';
import { fmt, cn, getPostSummary } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { dateToRelative } from '@/lib/parse-date';
import accountReputation from '@/lib/account-reputation';
import { proxifyImageSrc } from '@/lib/proxify-images';
import { AlertDialogDemo } from './alert-window';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface IBeneficiary {
  account: string;
  weight: number;
}

const PostListItem = ({ post, sort }: any) => {
  return (
    <li data-testid="post-list-item" className={sort === 'muted' ? 'opacity-50 hover:opacity-100' : ''}>
      <Card
        className={cn(
          'my-4 hover:bg-accent hover:text-accent-foreground  dark:bg-background/95 dark:text-white dark:hover:bg-accent dark:hover:text-accent-foreground'
        )}
      >
        <CardHeader>
          <div className="flex items-center">
            <img
              className="mr-3 h-[40px] w-[40px] rounded-3xl"
              height="40"
              width="40"
              src={`https://images.hive.blog/u/${post.author}/avatar/small`}
              alt={`${post.author} profile picture`}
              loading="lazy"
            />
            <div className="flex flex-col text-slate-500 dark:text-slate-400">
              <div>
                <p>
                  <Link
                    href={`@${post.author}`}
                    className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent"
                    data-testid="post-author"
                  >
                    @{post.author}
                  </Link>{' '}
                  ({accountReputation(post.author_reputation)})
                  {post.blacklists && post.blacklists[0] ? (
                    <span className="text-red-600" title={post.blacklists[0]}>
                      ({post.blacklists.length})
                    </span>
                  ) : null}
                </p>
                {post.author_title ? (
                  <Badge variant="outline" className="ml-1 border-red-600 text-red-600">
                    {post.author_title}
                  </Badge>
                ) : null}
              </div>
              <p className="flex items-center gap-2">
                {post.percent_hbd === 0 ? <Icons.hive className="h-4 w-4" /> : null}
              </p>
              <p className="text-sm">
                in{` `}
                {post.community ? (
                  <Link
                    href={`/${sort}/${post.community}`}
                    className="hover:cursor-pointer hover:text-red-600"
                  >
                    {post.community_title}
                  </Link>
                ) : (
                  <Link
                    href={`/${sort}/${post.category}`}
                    className="hover:cursor-pointer hover:text-red-600"
                  >
                    #{post.category}
                  </Link>
                )}
                <span className="mx-1">•</span>
                {dateToRelative(post.created)} ago
              </p>
            </div>
          </div>
          {post.json_metadata.image && post.json_metadata.image[0] ? (
            <Link href={`${post.url}`} data-testid="post-image">
              <div className="relative flex h-full max-h-[200px] min-h-fit w-fit items-center overflow-hidden bg-gray-100 lg:min-w-[320px] lg:max-w-[320px]">
                <img
                  className="h-ful w-full"
                  src={proxifyImageSrc(post.json_metadata.image[0], 320, 200)}
                  alt="Post image"
                  loading="lazy"
                />
              </div>
            </Link>
          ) : null}
        </CardHeader>
        <CardContent>
          <CardTitle data-testid="post-title">
            <Link href={`${post.url}`}>{post.title}</Link>
            {post.stats.is_pinned ? <Badge className="ml-1 bg-red-600 text-white">Pinned</Badge> : null}
          </CardTitle>
          <CardDescription>{getPostSummary(post.json_metadata, post.body)}</CardDescription>
        </CardContent>
        <CardFooter>
          <div className="flex h-5 items-center space-x-4 text-sm">
            <div className="flex items-center gap-2">
              <Icons.arrowUpCircle className="h-4 w-4 hover:text-red-600 sm:mr-1" />
              <Icons.arrowDownCircle className="h-4 w-4 hover:text-gray-600 sm:mr-1" />
            </div>

            <HoverCard>
              <HoverCardTrigger asChild>
                <div
                  className={`flex items-center ${
                    Number(post.max_accepted_payout.slice(0, 1)) === 0 ? 'text-gray-600 line-through' : ''
                  }`}
                  data-testid="post-payout"
                >
                  <Icons.dollar className="h-4 w-4 text-red-600 sm:mr-1" />
                  {post.payout.toFixed(2)}
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="flex w-80 flex-col">
                <span>Pending payout amount: ${post.payout.toFixed(2)}</span>
                <>
                  {post.beneficiaries.map((beneficiary: IBeneficiary, index: number) => (
                    <Link
                      href={`/@${beneficiary.account}`}
                      className="hover:cursor-pointer hover:text-red-600"
                      key={index}
                    >
                      {beneficiary.account}: {fmt(parseFloat(String(beneficiary.weight)) / 100)}%
                    </Link>
                  ))}
                </>
                <span>Payout in {dateToRelative(post.payout_at)}</span>
                {post.max_accepted_payout ? (
                  <span>Max accepted payout: ${fmt(post.max_accepted_payout.split(' ')[0])}</span>
                ) : null}
              </HoverCardContent>
            </HoverCard>

            <Separator orientation="vertical" />
            <div className="flex items-center" data-testid="post-total-votes">
              <Icons.star className="h-4 w-4 sm:mr-1" />
              {post.stats.total_votes}
            </div>
            <Separator orientation="vertical" />
            <div className="flex items-center" data-testid="post-children">
              <Icons.comment className="h-4 w-4 cursor-pointer hover:text-red-600 sm:mr-1" />
              {post.children}
            </div>
            <Separator orientation="vertical" />
            <div className="flex items-center">
              <AlertDialogDemo>
                <Icons.forward className="h-4 w-4 cursor-pointer hover:text-red-600" />
              </AlertDialogDemo>
            </div>
          </div>
        </CardFooter>
      </Card>
    </li>
  );
};

export default PostListItem;
