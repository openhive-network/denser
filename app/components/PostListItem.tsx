import { Icons } from "~/components/ui/Icons"

export default function PostListItem({ post }: any) {
	return (
		<div className="flex gap-7">
			<div className="h-full max-h-[200px] min-h-[200px] w-full min-w-[320px] max-w-[320px] bg-red-600" />
			<div key={post.id} className="mb-10">
				<h2 className="text-lg font-semibold leading-5 text-gray-800">{post.title}</h2>
				<p className="mt-2 mb-7 text-base font-normal leading-6 text-gray-500">{post.bodyLine}</p>
				<ul className="flex">
					<li className="mr-4 flex items-center">
						<Icons.arrowBigUp className="h-5 w-5" />
						<Icons.arrowBigDown className="h-5 w-5" />
						<span className="ml-2 text-sm font-medium leading-5 text-gray-500">${post.payout}</span>
					</li>
					<li className="mr-4 flex items-center">
						<Icons.chevronDown className="h-5 w-5" />
						<span className="ml-2 text-sm font-medium leading-5 text-gray-500">{post.votes}</span>
					</li>
					<li className="mr-4 flex items-center">
						<Icons.comment className="h-5 w-5" />
						<span className="ml-2 text-sm font-medium leading-5 text-gray-500">{post.children}</span>
					</li>
					<li className="flex items-center">
						<Icons.share className="h-5 w-5" />
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
