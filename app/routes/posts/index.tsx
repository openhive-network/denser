import { MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => {
	return {
		title: 'Post Index Page',
	};
};
export default function PostIndexPage() {
	return (
		<p>
			Post Index
		</p>
	);
}
