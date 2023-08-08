import * as React from "react";
import clsx from "clsx";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@hive/ui/components/select";
import { Icons } from "@hive/ui/components/icons";
import { GetProposalsParams } from "../lib/hive";

export interface FilterProposalsProps {
  filterStatus: GetProposalsParams["status"];
  onChangeFilterStatus: (value: FilterProposalsProps["filterStatus"]) => void;
  orderValue: GetProposalsParams["order"];
  onChangeSortOrder: (value: FilterProposalsProps["orderValue"]) => void;
  orderDirection: GetProposalsParams["order_direction"];
  onOrderDirection: (value: FilterProposalsProps["orderDirection"]) => void;
}
export function ProposalsFilter({
  onChangeFilterStatus,
  filterStatus,
  onChangeSortOrder,
  orderValue,
  orderDirection,
  onOrderDirection,
}: FilterProposalsProps) {
  const handleDirectionToggle = () =>
    onOrderDirection(
      orderDirection === "descending" ? "ascending" : "descending"
    );

  return (
    <div className="flex flex-col justify-between gap-2 sm:my-1 sm:flex-row">
      <h1 className="text-xl font-semibold sm:self-center md:text-2xl xl:text-3xl">
        Proposals
      </h1>
      <div className="flex justify-between">
        <div className="flex gap-2 text-xs font-medium">
          <div>
            <span>STATUS</span>
            <Select
              defaultValue=""
              value={filterStatus}
              onValueChange={onChangeFilterStatus}
            >
              <SelectTrigger className="h-[35px] w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Status</SelectLabel>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="votable">Votable</SelectItem>
                </SelectGroup>
                <SelectSeparator />
              </SelectContent>
            </Select>
          </div>
          <div>
            <span>ORDER BY</span>
            <Select
              defaultValue=""
              value={orderValue}
              onValueChange={onChangeSortOrder}
            >
              <SelectTrigger className="h-[35px] w-[120px]">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Order By</SelectLabel>
                  <SelectItem value="by_creator">Creator</SelectItem>
                  <SelectItem value="by_start_date">Start Data</SelectItem>
                  <SelectItem value="by_end_date">End Data</SelectItem>
                  <SelectItem value="by_total_votes">Total Votes</SelectItem>
                </SelectGroup>
                <SelectSeparator />
              </SelectContent>
            </Select>
          </div>
        </div>
        <button
          onClick={handleDirectionToggle}
          className={clsx("flex self-end transition-transform", {
            "rotate-180": orderDirection === "ascending",
          })}
        >
          <Icons.arrowBigDown className="m-1 h-8 w-8 text-red-500 transition-transform" />
        </button>
      </div>
    </div>
  );
}
