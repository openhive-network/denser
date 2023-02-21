'use client'
import * as React from "react"

import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useQuery } from 'react-query';
import { getCommunities } from '@/lib/bridge';

export default function CommunitiesSidebar() {
  const { isLoading, error, data } = useQuery({
    queryKey: ['communitiesData'],
    queryFn: () => getCommunities(),
  })

  return (
    <div className="hidden w-72 flex-col px-8 md:flex">
      <div className="relative mb-8 text-gray-600 focus-within:text-gray-400">
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
        {data?.slice(0, 10).map(community => (
          <li key={community.id}>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              {community.title}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
