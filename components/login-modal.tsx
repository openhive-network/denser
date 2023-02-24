"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Sign In</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-h-[600px] sm:max-w-[460px]">
        <div className="flex min-h-screen flex-col justify-start pt-16 sm:min-h-fit md:justify-center md:pt-4">
          <div className="mx-auto flex w-[360px] max-w-md flex-col items-center">
            <div className="mb-4 flex">
              <Image
                src="/hive-logo.svg"
                alt="Hive logo"
                className="w-14"
                height={56}
                width={56}
              />
            </div>
            <h2 className="text-center text-3xl font-semibold text-gray-800 dark:text-white">
              Log in to your account
            </h2>
            <p className="mt-2 mb-8 text-center text-base font-normal leading-6 text-gray-500">
              Welcome back! Please enter your details.
            </p>

            <form className="w-full">
              <div className="mb-5">
                <Label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-medium text-gray-600"
                >
                  Username
                </Label>
                <Input
                  type="text"
                  id="firstName"
                  className="block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500"
                  placeholder="Enter your username"
                  required
                />
              </div>
              <div>
                <Label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-gray-600"
                >
                  Password
                </Label>
                <Input
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
                  <Input
                    id="hiveAuth"
                    name="hiveAuth"
                    type="checkbox"
                    value=""
                    className="focus:ring-3focus:ring-red-300 h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
                    required
                  />
                  <Label
                    htmlFor="hiveAuth"
                    className="ml-2 flex text-sm font-medium text-gray-900 dark:text-white"
                  >
                    <Image
                      src="/hiveauth.png"
                      alt="Hiveauth logo"
                      className="mr-1 h-4 w-4"
                      width={24}
                      height={24}
                    />
                    Use HiveAuth
                  </Label>
                </div>
                <div className="flex items-center">
                  <Input
                    id="remember"
                    type="checkbox"
                    value=""
                    className="focus:ring-3focus:ring-red-300 h-4 w-4 rounded-lg border border-gray-300 focus:outline-none"
                    required
                  />
                  <Label
                    htmlFor="remember"
                    className="ml-2 text-sm font-medium text-gray-900 dark:text-white"
                  >
                    Remember me
                  </Label>
                </div>
              </div>
              <DialogFooter className="sm:justify-starts flex w-full flex-col sm:flex-col sm:space-x-0">
                <Button
                  type="submit"
                  className="w-full rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 dark:bg-red-600 dark:text-white dark:hover:bg-red-900"
                >
                  Log in
                </Button>
                <Button className="mt-4 flex w-full justify-center rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-center text-sm font-semibold text-gray-900 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300">
                  Log in with
                  <Image
                    src="/hivesigner-logo.svg"
                    alt="Hivesigner logo"
                    width={22}
                    height={22}
                    className="mx-2"
                  />
                  hivesigner
                </Button>
              </DialogFooter>
            </form>
            <div className="mt-8 flex md:hidden">
              <p className="text-base font-normal text-gray-500">
                Don’t have an account?
                <span className="ml-1 font-semibold text-red-600">Sign up</span>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
