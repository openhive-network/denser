import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, Outlet, useLoaderData } from '@remix-run/react';

import { requireUserId } from '~/utils/session.server';
import { getPostListItems } from '~/models/post.server';

export async function loader({ request }: LoaderArgs) {
	const userId = await requireUserId(request);
	const postListItems = await getPostListItems({ userId });
	return json({ postListItems });
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
					<button type="submit">
						Logout
					</button>
				</Form>
			</header>

			<main className="flex flex-col w-auto gap-4">
				<Link to="new">
					+ New Post
				</Link>

				<div>
					{data.postListItems.length === 0 ? (
						<p className="p-4">No posts yet</p>
					) : (
						<ol>
							{data.postListItems.map((post) => (
								<li key={post.id}>
									<Link
										to={post.id}>
										<p>🎅 {post.author}</p>
										<p>📝 {post.title}</p>
										<hr />
									</Link>
								</li>
							))}
						</ol>
					)}
				</div>

				<div className="flex">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
