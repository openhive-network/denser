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
  const [state, setState] = useState(() => filter)
  return (
      <Select
        defaultValue="hot"
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
