import Link from 'next/link';
import { cn, getPostSummary } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import parseDate, { dateToRelative } from '@/lib/parse-date';
import accountReputation from '@/lib/account-reputation';
import { proxifyImageSrc } from '@/lib/proxify-images';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { AlertDialogDemo } from './alert-window';
const PostListItem = ({ post, sort }: any) => {
  return (
    <li data-testid="post-list-item">
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
                  <Link href={`/${sort}/${post.community}`} className="hover:text-red-600">
                    {post.community_title}
                  </Link>
                ) : (
                  <Link href={`/${sort}/${post.category}`} className="hover:text-red-600">
                    {post.category}
                  </Link>
                )}
                <span className="mx-1">•</span>
                {dateToRelative(post.created)}
              </p>
            </div>
          </div>
          {post.json_metadata.image ? (
            <Link href={`${post.url}`} data-testid="post-image">
              <div className="relative flex h-full max-h-[200px] min-h-[200px] w-full items-center overflow-hidden bg-gray-100 lg:min-w-[320px] lg:max-w-[320px]">
                <img
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
            <div className="flex items-center">
              <Icons.arrowUpCircle className="mr-1 h-4 w-4 hover:text-red-600" />
              <Icons.arrowDownCircle className="4 mr-1 h-4 hover:text-gray-600" />
            </div>
            <div className="flex items-center" data-testid="post-payout">
              <Icons.dollar className="mr-1 h-4 w-4 text-red-600" />
              {post.payout.toFixed(2)}
            </div>
            <Separator orientation="vertical" />
            <div className="flex items-center" data-testid="post-total-votes">
              <Icons.star className="mr-1 h-4 w-4" />
              {post.stats.total_votes}
            </div>
            <Separator orientation="vertical" />
            <div className="flex items-center" data-testid="post-children">
              <Icons.comment className="mr-1 h-4 w-4 cursor-pointer hover:text-red-600" />
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
  // return (
  //   <li className="my-4 flex flex-col" data-testid="post-list-item">
  //     {post.reblogged_by !== undefined && post.reblogged_by.length > 0 ? (
  //       <div className="flex">
  //         <Icons.forward className="h-5 w-5" /> {post.reblogged_by[0]} reblogged
  //       </div>
  //     ) : null}
  //     <div
  //       className={`my-4 flex flex-col items-center gap-7 lg:max-h-[200px] lg:flex-row lg:items-start ${
  //         post.reblogged_by !== undefined && post.reblogged_by.length > 0 ? 'mt-0' : ''
  //       }`}
  //     >
  //       <div className="flex">
  //         {post.json_metadata.image ? (
  //           <Link href={`${post.url}`}>
  //             <div className="relative flex h-full max-h-[200px] min-h-[200px] w-full items-center overflow-hidden bg-gray-100 lg:min-w-[320px] lg:max-w-[320px]">
  //               <img src={post.json_metadata.image[0]} alt="Post image" />
  //               <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-center bg-gradient-to-r from-slate-400 text-white dark:text-white">
  //                 {post.community_title}
  //               </div>
  //             </div>
  //           </Link>
  //         ) : post.json_metadata.images ? (
  //           <Link href={`${post.url}`}>
  //             <div className="relative flex h-full max-h-[200px] min-h-[200px] w-full items-center overflow-hidden bg-gray-100 lg:min-w-[320px] lg:max-w-[320px]">
  //               <img src={post.json_metadata.images[0]} alt="Post image" />
  //               <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-center bg-gradient-to-r from-slate-400 text-white dark:text-white">
  //                 {post.community_title}
  //               </div>
  //             </div>
  //           </Link>
  //         ) : post.json_metadata?.flow?.pictures[0] ? (
  //           <Link href={`${post.url}`}>
  //             <div className="relative flex h-full max-h-[200px] min-h-[200px] w-full items-center overflow-hidden bg-gray-100 lg:min-w-[320px] lg:max-w-[320px]">
  //               <img src={post.json_metadata.flow.pictures[0].url} alt="Post image" />
  //               <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-center bg-gradient-to-r from-slate-400 text-white dark:text-white">
  //                 {post.community_title}
  //               </div>
  //             </div>
  //           </Link>
  //         ) : null}
  //       </div>
  //       <div className="flex flex-col overflow-hidden">
  //         <div key={post.id} className="mb-10 w-full whitespace-nowrap">
  //           <Link href={`${post.url}`}>
  //             <h2 className="whitespace-normal text-lg font-semibold leading-5 text-slate-900 dark:text-white">
  //               {post.title}
  //               {post.stats.is_pinned ? (
  //                 <span className="rounded-md bg-red-600 p-1 text-xs text-white">Pinned</span>
  //               ) : null}
  //             </h2>
  //           </Link>
  //           <p className="mb-7 mt-2 overflow-hidden text-ellipsis text-base font-normal leading-6 text-slate-500 dark:text-slate-400">
  //             {getPostSummary(post.json_metadata, post.body)}
  //           </p>
  //           <ul className="flex">
  //             <li className="mr-4 flex items-center space-x-1">
  //               <Icons.arrowUpCircle className="h-5 w-5" />
  //               <Icons.arrowDownCircle className="h-5 w-5" />
  //               <span className="text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
  //                 {post.payout}
  //               </span>
  //             </li>
  //             <li className="mr-4 flex items-center">
  //               <Icons.chevronUp className="h-5 w-5" />
  //               <span className="ml-2 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
  //                 {post.stats.total_votes}
  //               </span>
  //             </li>
  //             <li className="mr-4 flex items-center">
  //               <Icons.comment className="h-5 w-5" />
  //               <span className="ml-2 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
  //                 {post.children}
  //               </span>
  //             </li>
  //             <li className="flex items-center">
  //               <Icons.forward className="h-5 w-5" />
  //             </li>
  //           </ul>
  //           <div className="mt-7 flex items-center">
  //             <img
  //               className="mr-3 h-[40px] w-[40px] rounded-3xl"
  //               height="40"
  //               width="40"
  //               src={`https://images.hive.blog/u/${post.author}/avatar`}
  //               alt={`${post.author} profile picture`}
  //             />
  //             <div className="flex flex-col text-slate-500 dark:text-slate-400">
  //               <p>
  //                 <Link
  //                   href={`@${post.author}`}
  //                   className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent"
  //                   data-testid="post-author"
  //                 >
  //                   @{post.author}
  //                 </Link>{' '}
  //                 ({post.author_reputation.toFixed(0)})
  //               </p>
  //               <p className="flex items-center gap-2">
  //                 {post.created}
  //                 {post.percent_hbd === 0 ? <Icons.hive className="h-4 w-4" /> : null}
  //               </p>
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   </li>
  // );
};

export default PostListItem;
