import * as React from "react"
import Link from "next/link"

import { siteConfig } from "@/config/site"
import { MainNav } from "@/components/main-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-b-slate-200 bg-white dark:border-b-slate-700 dark:bg-slate-900">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <MainNav items={siteConfig.mainNav} />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <p className="hidden md:flex text-base font-normal text-slate-500 dark:text-slate-400">
              Don’t have an account?
              <Link
                href={siteConfig.links.twitter}
                target="_blank"
                rel="noreferrer"
                className="ml-1 font-semibold text-slate-900 dark:text-white underline underline-offset-4"
              >
                Sign up
              </Link>
            </p>
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}
