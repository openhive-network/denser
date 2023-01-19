import type { MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => {
	return {
		title: 'Login',
	};
};

export default function LoginPage() {
	return (
		<div className="flex min-h-full flex-col justify-center">
			<div className="mx-auto w-full max-w-md px-8">
				Login Page
			</div>
		</div>
	);
}
