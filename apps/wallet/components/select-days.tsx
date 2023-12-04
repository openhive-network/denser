import * as React from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '@ui/components';

export function SelectDays() {
  return (
    <Select>
      <SelectTrigger className="my-2 w-[180px]">
        <SelectValue defaultValue="7" placeholder="Last 7 days" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="14">Last 14 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="60">Last 60 days</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
