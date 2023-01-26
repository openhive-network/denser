import * as React from "react"

import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function CommunitiesSidebar() {
  return (
    <div className="flex flex-col w-72 px-8">
      <div className="relative text-gray-600 focus-within:text-gray-400 mb-8">
        <span className="absolute inset-y-0 left-0 flex items-center pl-2">
          <Icons.search className="h-5 w-5" />
        </span>
        <Input
          type="search"
          id="search"
          placeholder="Search communities"
          autoComplete="off"
          className="pl-10"
        />
      </div>
      <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
        Trending Communities
      </h2>
      <ul className="space-y-1">
        <li>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            View all
          </Button>
        </li>
        <li>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            LeoFinance
          </Button>
        </li>
        <li>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            Photography Lovers
          </Button>
        </li>
        <li>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            Pinmapple
          </Button>
        </li>
      </ul>
    </div>
  )
}
