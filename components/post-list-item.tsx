import { Icons } from "@/components/icons"

export default function PostListItem({ post }: any) {
  return (
    <div className="flex gap-7">
      <div className="h-full max-h-[200px] min-h-[200px] w-full min-w-[320px] max-w-[320px] overflow-hidden bg-gray-100 relative">
        <img src="https://images.unsplash.com/photo-1674674313266-4d67bb33f4b8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1336&q=80" className="max-h-full max-w-full" alt="" />
        <div className="h-16 flex justify-center items-center absolute inset-x-0 bottom-0 bg-gradient-to-r from-slate-400 text-white dark:text-white">
          {post.community_title}
        </div>
      </div>
      <div key={post.id} className="mb-10">
        <h2 className="text-lg font-semibold leading-5 text-slate-900 dark:text-white">{post.title}</h2>
        <p className="mt-2 mb-7 text-base font-normal leading-6 text-slate-500 dark:text-slate-400">{post.bodyLine}</p>
        <ul className="flex">
          <li className="mr-4 flex items-center">
            <Icons.arrowBigUp className="h-5 w-5" />
            <Icons.arrowBigDown className="h-5 w-5" />
            <span className="ml-2 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">${post.payout}</span>
          </li>
          <li className="mr-4 flex items-center">
            <Icons.chevronDown className="h-5 w-5" />
            <span className="ml-2 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">{post.votes}</span>
          </li>
          <li className="mr-4 flex items-center">
            <Icons.comment className="h-5 w-5" />
            <span className="ml-2 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">{post.children}</span>
          </li>
          <li className="flex items-center">
            <Icons.share className="h-5 w-5" />
          </li>
        </ul>
        <div className="mt-7 flex">
          <img src={post.image} className="mr-3 h-10 w-10 rounded-full" alt=""/>
          <div className="flex flex-col text-slate-500 dark:text-slate-400">
            <p>@{post.author}</p>
            <p>16 hours agoM</p>
          </div>
        </div>
      </div>
    </div>
  );
}
