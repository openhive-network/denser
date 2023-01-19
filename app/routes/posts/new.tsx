import { MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => {
	return {
		title: 'New Post Page',
	};
};

export default function NewPostPage() {
	return (
		<div>New post</div>
	);
}
