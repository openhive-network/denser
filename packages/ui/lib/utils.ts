import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Big from "big.js";
import { FullAccount } from "@ui/store/app-types";
import { DynamicGlobalProperties } from "./hive";
import { convertStringToBig } from "./helpers";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const blockGap = (head_block: number, last_block: number) => {
  if (!last_block || last_block < 1) return "forever";
  const secs = (head_block - last_block) * 3;
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (secs < 60) return "just now";
  if (secs < 120) return "recently";
  if (mins < 120) return mins + " mins ago";
  if (hrs < 48) return hrs + " hrs ago";
  if (days < 14) return days + " days ago";
  if (weeks < 4) return weeks + " weeks ago";
  if (months < 24) return months + " months ago";
  return years + " years ago";
};
export function getRoundedAbbreveration(
  numToRefactor: Big,
  toComma = 2,
  multiplicators = ["K", "M", "T", "P", "E", "Z", "Y", "R", "Q"]
) {
  if (numToRefactor.lt(1000)) return numToRefactor.toFixed(toComma);
  let mulIndex = 0;
  for (let t = numToRefactor; t.div(1000).gte(1); mulIndex++) {
    t = t.div(1000);
  }

  return (
    numToRefactor.div(new Big(1000).pow(mulIndex)).toFixed(toComma) +
    multiplicators[mulIndex - 1]
  );
}
export const numberWithCommas = (x: string) =>
  x.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export function vestingHive(
  accountData: FullAccount,
  dynamicData: DynamicGlobalProperties
) {
  const vests = convertStringToBig(accountData.vesting_shares);
  const total_vests = convertStringToBig(dynamicData.total_vesting_shares);
  const total_vest_hive = convertStringToBig(
    dynamicData.total_vesting_fund_hive
  );
  const vesting_hivef = total_vest_hive.times(vests).div(total_vests);
  return vesting_hivef;
}
export function delegatedHive(
  accountData: FullAccount,
  dynamicData: DynamicGlobalProperties
) {
  const delegated_vests = convertStringToBig(
    accountData.delegated_vesting_shares
  );
  const received_vests = convertStringToBig(
    accountData.received_vesting_shares
  );
  const vests = delegated_vests.minus(received_vests);
  const total_vests = convertStringToBig(dynamicData.total_vesting_shares);
  const total_vest_hive = convertStringToBig(
    dynamicData.total_vesting_fund_hive
  );
  const vesting_hivef = total_vest_hive.times(vests.div(total_vests));
  return vesting_hivef;
}
