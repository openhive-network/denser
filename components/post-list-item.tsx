import { Icons } from "@/components/icons"
import dynamic from 'next/dynamic';

const PostTime = dynamic(() => import('./post-time'), {
  ssr: false
})

const PostPayout = dynamic(() => import('./post-payout'), {
  ssr: false
})

const PostVotes = dynamic(() => import('./post-votes'), {
  ssr: false
})

const PostComments = dynamic(() => import('./post-comments'), {
  ssr: false
})


export default function PostListItem({ post }: any) {
  return (
    <div className="my-4 flex flex-col items-center gap-7 lg:max-h-[200px] lg:flex-row lg:items-start">
      <div className="relative h-full max-h-[200px] min-h-[200px] w-full overflow-hidden bg-gray-100 lg:min-w-[320px] lg:max-w-[320px]">
        {post.json_metadata.image ? (
          <img
            src={post.json_metadata.image[0]}
            className="max-h-full max-w-full"
            alt=""
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-center bg-gradient-to-r from-slate-400 text-white dark:text-white">
          {post.community_title}
        </div>
      </div>
      <div key={post.id} className="mb-10 w-full lg:w-auto">
        <h2 className="text-lg font-semibold leading-5 text-slate-900 dark:text-white">
          {post.title}
        </h2>
        {/*TODO: Work on bodyLine - sanitized first 150 characters from body*/}
        <p className="mt-2 mb-7 text-base font-normal leading-6 text-slate-500 dark:text-slate-400">
          {post?.bodyLine}
        </p>
        <ul className="flex">
          <li className="mr-4 flex items-center space-x-1">
            <Icons.arrowUpCircle className="h-5 w-5" />
            <Icons.arrowDownCircle className="h-5 w-5" />
            <span className="text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
              <PostPayout amount={post.payout} />
            </span>
          </li>
          <li className="mr-4 flex items-center">
            <Icons.chevronUp className="h-5 w-5" />
            <span className="ml-2 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
              {/*{post.stats.total_votes}*/}
              <PostVotes votes={post.stats.total_votes} />
            </span>
          </li>
          <li className="mr-4 flex items-center">
            <Icons.comment className="h-5 w-5" />
            <span className="ml-2 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
              <PostComments>{post.children}</PostComments>
            </span>
          </li>
          <li className="flex items-center">
            <Icons.forward className="h-5 w-5" />
          </li>
        </ul>
        <div className="mt-7 flex">
          <img
            src="https://qph.cf2.quoracdn.net/main-qimg-134e3bf89fff27bf56bdbd04e7dbaedf-lq"
            className="mr-3 h-10 w-10 rounded-full"
            alt=""
          />
          <div className="flex flex-col text-slate-500 dark:text-slate-400">
            <p>
              @{post.author} ({post.author_reputation.toFixed(0)})
            </p>
            <PostTime time={post.created} />
          </div>
        </div>
      </div>
    </div>
  )
}
