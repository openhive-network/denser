import { useState } from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function CommunitiesSelectFilter({filter, handleChangeFilter}) {
  const [state, setState] = useState(() => filter)
  return (
    <Select
      defaultValue="rank"
      value={state}
      onValueChange={(e) => {
        handleChangeFilter(e)
        setState(e)
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a filter" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="rank">Rank</SelectItem>
          <SelectItem value="subs">Subscribers</SelectItem>
          <SelectItem value="new">New</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
