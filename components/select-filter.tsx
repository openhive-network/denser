import { useState } from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SelectFilter({filter, handleChangeFilter}) {
  return (
      <Select
        defaultValue="hot"
        value={filter}
        onValueChange={(e) => {
          handleChangeFilter(e)
        }}
      >
        <SelectTrigger className="w-[180px]" data-testid="posts-filter">
          <SelectValue placeholder="Select a filter" />
        </SelectTrigger>
        <SelectContent data-testid="posts-filter-list">
          <SelectGroup>
            <SelectItem value="trending">Trending</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="created">New</SelectItem>
            <SelectItem value="payout">Payout</SelectItem>
            <SelectItem value="promoted">Promoted</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
  )
}
