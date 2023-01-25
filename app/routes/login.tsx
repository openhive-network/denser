import type { MetaFunction } from '@remix-run/node';
import { useEffect, useRef, useState } from 'react';
import { Form } from '@remix-run/react';

export const meta: MetaFunction = () => {
	return {
		title: 'Login',
	};
};

export default function LoginPage() {
	return (
		<>
			<nav className="mx-auto py-7 max-w-4xl flex items-center justify-between">
				<div className="flex">
					<img src="/images/hive-logo.png" />
					<span className="whitespace-nowrap text-center text-3xl font-semibold text-gray-800">HIVE blog</span>
				</div>
				<div className="flex">
					<span className="text-base font-normal text-gray-500">Don’t have an account?</span>
					<span className="text-base font-semibold text-red-600 ml-1">Sign up</span>
				</div>
			</nav>
			<div className="flex min-h-full flex-col justify-center">
				<div className="mx-auto flex w-[360px] max-w-md flex-col items-center">
					<h2 className="text-center text-3xl font-semibold text-gray-800">Log in to your account</h2>
					<p className="mt-2 mb-8 text-center text-base font-normal leading-6 text-gray-500">
						Welcome back! Please enter your details.
					</p>

					<Form method="post" className="w-full">
						<div className="mb-5">
							<label htmlFor="firstName" className="mb-2 block text-sm font-medium text-gray-600">
								Username
							</label>
							<input
								type="text"
								id="firstName"
								className="block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500"
								placeholder="Enter your username"
								required
							/>
						</div>
						<div>
							<label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-600">
								Password
							</label>
							<input
								type="text"
								id="password"
								name="password"
								className="block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500"
								placeholder="Enter your password"
								required
							/>
						</div>
						<div className="my-6 flex w-full flex-col">
							<div className="flex items-center">
								<input
									id="hiveAuth"
									name="hiveAuth"
									type="checkbox"
									value=""
									className="focus:ring-3focus:ring-red-300 h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
									required
								/>
								<label htmlFor="hiveAuth" className="ml-2 flex text-sm font-medium text-gray-900">
									<img className="mr-1 h-4 w-4" src="/images/hiveauth.png" />
									Use HiveAuth
								</label>
							</div>
							<div className="flex items-center">
								<input
									id="remember"
									type="checkbox"
									value=""
									className="focus:ring-3focus:ring-red-300 h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
									required
								/>
								<label htmlFor="remember" className="ml-2 text-sm font-medium text-gray-900">
									Remember me
								</label>
							</div>
						</div>
						<button
							type="submit"
							className="w-full rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300">
							Log in
						</button>
						<button className="mt-4 w-full rounded-lg border border-gray-200 px-5 py-2.5 text-center text-sm font-semibold text-gray-900 hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-300">
							Log in with hivesigner
						</button>
					</Form>
				</div>
			</div>
		</>
	);
}
