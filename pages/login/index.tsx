import * as React from "react"

import { Icons } from "@/components/icons"
import { Layout } from "@/components/layout"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  return (
    <Layout>
      <div className="flex my-32 flex-col justify-start md:justify-center pt-16 md:pt-0">
        <div className="mx-auto flex w-[360px] max-w-md flex-col items-center">
          <div className="flex md:hidden mb-4">
            <Icons.hive className="w-14" />
          </div>
          <h2 className="text-center text-3xl font-semibold text-slate-900 dark:text-white">
            Log in to your account
          </h2>
          <p className="mt-2 mb-8 text-center text-base font-normal leading-6 text-slate-500 dark:text-slate-400">
            Welcome back! Please enter your details.
          </p>

          <div className="w-full">
            <div className="grid w-full max-w-sm items-center gap-1.5 mb-5">
              <Label htmlFor="username">Username</Label>
              <Input
                type="text"
                id="username"
                placeholder="Enter your username"
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="password">Email</Label>
              <Input
                type="password"
                id="password"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="my-6 flex w-full flex-col">
            <div className="items-top flex space-x-2 my-1">
              <Checkbox id="hiveAuth" />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="hiveAuth"
                  className="flex text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  <Icons.hiveauth className="mr-1 h-4 w-4" />
                  Use HiveAuth
                </label>
              </div>
            </div>

            <div className="items-top flex space-x-2 my-1">
              <Checkbox id="remember" />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me
                </label>
              </div>
            </div>
          </div>
          <Button type="submit" className="w-full flex">
            Log in
          </Button>
          <Button variant="outline" className="w-full flex my-4">
            Log in with <Icons.hivesigner className="h-5 mx-2" /> hivesigner
          </Button>

          <div className="flex md:hidden mt-6">
            <p className="text-base font-normal text-slate-500 dark:text-slate-400">
              Don’t have an account?
              <span className="ml-1 font-semibold text-slate-900 dark:text-white">
                Sign up
              </span>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
