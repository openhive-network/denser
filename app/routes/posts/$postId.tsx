import { MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => {
	return {
		title: 'Post Detail Page',
	};
};
export default function PostDetailsPage() {
	return (
		<div>
			Post Detail
		</div>
	);
}