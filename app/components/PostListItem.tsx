import { ArrowUpIcon, ArrowDownIcon, ChevronUpIcon, ChatBubbleIcon, Share2Icon } from '@radix-ui/react-icons';

export default function PostListItem({ post }: any) {
	return (
		<div className="flex gap-7">
			<div className="h-full max-h-[200px] min-h-[200px] w-full min-w-[320px] max-w-[320px] bg-red-600" />
			<div key={post.id} className="mb-10">
				<h2 className="text-lg font-semibold leading-5 text-gray-800">{post.title}</h2>
				<p className="mt-2 mb-7 text-base font-normal leading-6 text-gray-500">{post.bodyLine}</p>
				<ul className="flex">
					<li className="mr-4 flex items-center">
						<ArrowUpIcon className="h-[18px] w-[18px] text-gray-800" />
						<ArrowDownIcon className="h-[18px] w-[18px] text-gray-800" />
						<span className="ml-2 text-sm font-medium leading-5 text-gray-500">${post.payout}</span>
					</li>
					<li className="mr-4 flex items-center">
						<ChevronUpIcon className="h-[18px] w-[18px] text-gray-800" />
						<span className="ml-2 text-sm font-medium leading-5 text-gray-500">{post.votes}</span>
					</li>
					<li className="mr-4 flex items-center">
						<ChatBubbleIcon className="h-[18px] w-[18px] text-gray-800" />
						<span className="ml-2 text-sm font-medium leading-5 text-gray-500">{post.children}</span>
					</li>
					<li className="flex items-center">
						<Share2Icon className="h-[18px] w-[18px] text-gray-800" />
					</li>
				</ul>
				<div className="mt-7 flex">
					<img src={post.image} className="mr-3 h-10 w-10 rounded-full" />
					<div className="flex flex-col">
						<p>@{post.author}</p>
						<p>16 hours agoM</p>
					</div>
				</div>
			</div>
		</div>
	);
}
