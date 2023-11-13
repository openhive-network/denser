/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'
import { useForm } from "react-hook-form";
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'next-i18next';
import { Separator } from "@hive/ui/components/separator";
import { getLogger } from "@hive/ui/lib/logging";
import { hasCompatibleKeychain } from "@/auth/lib/hive-keychain";
import { username } from "@/auth/pages/api/login";

const loginFormSchema = z.object({
  username,
  password: z.string(),
  useKeychain: z.boolean(),
  useHiveauth: z.boolean(),
  remember: z.boolean(),
});

export type LoginFormSchema = z.infer<typeof loginFormSchema>;

const loginFormDefaultValues = {
  username: '',
  password: '',
  useKeychain: false,
  useHiveauth: false,
  remember: false,
}

export function LoginForm({
  errorMessage,
  onSubmit,
}: {
  errorMessage: string
  onSubmit: (data: LoginFormSchema) => void
}) {
  const logger = getLogger('app');
  logger.debug('Starting LoginForm');

  const { t } = useTranslation('common_auth');
  const [isKeychainSupported, setIsKeychainSupported] = useState(false)

  useEffect(() => {
    setIsKeychainSupported(hasCompatibleKeychain());
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormSchema>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: loginFormDefaultValues
  });

  return (
    <div className="flex h-screen flex-col justify-start pt-16 sm:h-fit md:justify-center md:pt-0">
      <div className="mx-auto flex w-[440px] max-w-md flex-col items-center">
        <h2 className="w-full pb-6 text-3xl text-gray-800">
          Login
        </h2>
        <form method="post" className="w-full">

          <div className="relative mb-5">
            <input
              type="text"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 pl-11 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500"
              placeholder="Enter your username"
              {...register("username")}
              aria-invalid={errors.username ? "true" : "false"}
            />
            <span className="absolute top-0 h-10 w-10 rounded-bl-lg rounded-tl-lg bg-gray-400 text-gray-600">
              <div className="flex h-full w-full items-center justify-center">
                {" "}
                @
              </div>
            </span>
            {errors.username?.message && (
              <p className="text-red-500 text-sm" role="alert">{t(errors.username.message)}</p>
            )}
          </div>

          <div>
            <input
              type="password"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500"
              placeholder="Password or WIF"
              {...register("password")}
            />
            {errors.password?.message && (
              <p className="text-red-500 text-sm" role="alert">{errors.password.message}</p>
            )}
          </div>

          <div className="my-6 flex w-full flex-col">

            <div className="flex items-center py-1">
              <input
                type="checkbox"
                value=""
                className="h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
                {...register("useKeychain")}
                disabled={!isKeychainSupported}
                />
              <label
                htmlFor="useKeychain"
                className="ml-2 flex text-sm font-medium text-gray-900"
              >
                <img
                  className="mr-1 h-4 w-4"
                  src="/images/hivekeychain.png"
                  alt="Hive Keychain logo"
                />
                Use Keychain
              </label>
            </div>

            <div className="flex items-center py-1">
              <input
                type="checkbox"
                value=""
                className="h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
                {...register("useHiveauth")}
                />
              <label
                htmlFor="useHiveauth"
                className="ml-2 flex text-sm font-medium text-gray-900"
              >
                <img
                  className="mr-1 h-4 w-4"
                  src="/images/hiveauth.png"
                  alt="Hiveauth logo"
                />
                Use HiveAuth
              </label>
            </div>

            <div className="flex items-center py-1">
              <input
                type="checkbox"
                value=""
                className=" h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
                {...register("remember")}
              />
              <label
                htmlFor="remember"
                className="ml-2 text-sm font-medium text-gray-900 bamboo"
              >
                Keep me logged in
              </label>
            </div>

          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="w-fit rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-red-700 focus:outline-none  disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
              onClick={handleSubmit(onSubmit)}
            >
              Login
            </button>
            <button
              type="reset"
              className="w-fit rounded-lg bg-transparent px-5 py-2.5 text-center text-sm font-semibold text-gray-500 hover:cursor-pointer hover:text-red-600 focus:outline-none"
            >
              Reset
            </button>
          </div>

          <div>
            <p className="text-red-500 text-sm" role="alert">{errorMessage || '\u00A0'}</p>
          </div>

          <div className="hiveauth-info">
            <div id="hiveauth-instructions" className="hiveauth-instructions hidden" />
            <a
              href="#"
              id="hiveauth-qr-link"
              className="hiveauth-qr keychainify-checked hidden"
              target="_blank"
              rel="noreferrer noopener"
            >
              <canvas id="hiveauth-qr" />
            </a>
          </div>

          <div className="mt-4 flex w-full items-center">
            <Separator orientation="horizontal" className="w-1/3" />
            <span className="w-1/3 text-center text-sm">
              more login methods
            </span>
            <Separator orientation="horizontal" className="w-1/3" />
          </div>
          <div className="flex justify-center">
            <button
              className="mt-4 flex w-fit justify-center rounded-lg bg-gray-400 px-5 py-2.5 hover:bg-gray-500 focus:outline-none "
              data-testid="hivesigner-button"
            >
              <img src="/images/hivesigner.svg" alt="Hivesigner logo" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
