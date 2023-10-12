/* eslint-disable @next/next/no-img-element */
import { useForm } from "react-hook-form";
import { Separator } from "@hive/ui/components/separator";
import { getLogger } from "@hive/ui/lib/logging";

export type LoginFormData = {
  username: string;
  password: string;
  hiveAuth: boolean,
  remember: boolean,
};

const loginFormDefaultValues = {
  username: '',
  password: '',
  hiveAuth: false,
  remember: false,
}

export function LoginForm({
  errorMessage,
  onSubmit,
}: {
  errorMessage: string
  onSubmit: (data: LoginFormData) => void
}) {
  const logger = getLogger('app');
  logger.info('Starting LoginForm');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
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
              {...register("username", { required: true })}
              aria-invalid={errors.username ? "true" : "false"}
            />
            <span className="absolute top-0 h-10 w-10 rounded-bl-lg rounded-tl-lg bg-gray-400 text-gray-600">
              <div className="flex h-full w-full items-center justify-center">
                {" "}
                @
              </div>
            </span>
            {errors.username && errors.username.type === "required" && (
              <p className="text-red-500 text-sm" role="alert">Username is required</p>
            )}
          </div>

          <div>
            <input
              type="password"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500"
              placeholder="Password or WIF"
              {...register("password")}
            />
            <p className="text-sm text-gray-400">
              This operation requires your Posting key or Master password.
            </p>
          </div>

          <div className="my-6 flex w-full flex-col">
            <div className="flex items-center py-1">
              <input
                type="checkbox"
                value=""
                className="h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
                {...register("hiveAuth")}
                />
              <label
                htmlFor="hiveAuth"
                className="ml-2 flex text-sm font-medium text-gray-900"
              >
                <img
                  className="mr-1 h-4 w-4"
                  src="/hiveauth.png"
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
                className="ml-2 text-sm font-medium text-gray-900"
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
              <img src="/hivesigner.svg" alt="Hivesigner logo" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
