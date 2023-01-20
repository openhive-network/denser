import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, Outlet, useLoaderData } from '@remix-run/react';

import { requireUserId } from '~/utils/session.server';
import { getPostListItems } from '~/models/post.server';
import PostListItem from '~/components/PostListItem';
import { extractBodySummary } from '~/utils/extractContent';

export async function loader({ request }: LoaderArgs) {
	const userId = await requireUserId(request);
	const postListItems = await getPostListItems({ userId });
	const newPosts = [];
	for (const postListItem of postListItems) {
		newPosts.push({ ...postListItem, bodyLine: await extractBodySummary(postListItem.body) });
	}
	return json({ newPosts });
}

export default function PostsPage() {
	const data = useLoaderData<typeof loader>();

	return (
		<div className="flex p-2">
			<header className="w-20">
				<h1>
					<Link to=".">Posts</Link>
				</h1>
				<Form action="/logout" method="post">
					<button type="submit">Logout</button>
				</Form>
			</header>

			<main className="flex w-[920px] flex-col gap-4">
				<Link to="new">+ New Post</Link>

				<div>
					{data.newPosts.length === 0 ? (
						<p className="p-4">No posts yet</p>
					) : (
						<ul>
							{data.newPosts.map((post) => (
								<li key={`${post.id}123`}>
									<PostListItem post={post} />
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="flex">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
