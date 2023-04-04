import { SMTAsset } from "@hiveio/dhive"
import Big from "big.js"
import { ClassValue, clsx } from "clsx"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime.js"
import remarkableStripper from './remarkableStripper';
import sanitize from "sanitize-html"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

dayjs.extend(relativeTime)
export const dateToRelative = (d: string): string => {
  const isTimeZoned =
    d.indexOf(".") !== -1 || d.indexOf("+") !== -1 ? d : `${d}.000Z`
  const dm = dayjs(new Date(isTimeZoned))
  const dd = dm.fromNow()

  return dd
    .replace("a few seconds", "~1s")
    .replace(" seconds", "s")
    .replace(" minutes", "m")
    .replace("a minute", "1m")
    .replace(" hours", "h")
    .replace("an hour", "1h")
    .replace(" days", "d")
    .replace("a day", "1d")
    .replace(" months", "M")
    .replace("a month", "1M")
    .replace(" years", "y")
    .replace("a year", "1y")
}

export const dateToShow = (d: string): string => {
  const isTimeZoned =
    d.indexOf(".") !== -1 || d.indexOf("+") !== -1 ? d : `${d}.000Z`
  console.log("isTimeZoned", isTimeZoned)
  const dm = dayjs(new Date(isTimeZoned)).format("MMMM YYYY")
  return dm.toString()
}

// refactor

export const vestsToRshares = (
  vests: number,
  votingPower: number,
  votePerc: number
): number => {
  const vestingShares = vests * 1e6
  const power = (votingPower * votePerc) / 1e4 / 50 + 1
  return (power * vestingShares) / 1e4
}

export const isCommunity = (s: string) => s.match(/^hive-\d+/) !== null

export enum Symbol {
  HIVE = "HIVE",
  HBD = "HBD",
  VESTS = "VESTS",
  SPK = "SPK",
}

export enum NaiMap {
  "@@000000021" = "HIVE",
  "@@000000013" = "HBD",
  "@@000000037" = "VESTS",
}

export interface Asset {
  amount: number
  symbol: Symbol
}

export const parseAsset = (sval: string | SMTAsset): Asset => {
  if (typeof sval === "string") {
    const sp = sval.split(" ")
    return {
      amount: parseFloat(sp[0]),
      symbol: Symbol[sp[1]],
    }
  } else {
    return {
      amount: parseFloat(sval.amount.toString()) / Math.pow(10, sval.precision),
      symbol: NaiMap[sval.nai],
    }
  }
}

const isHumanReadable = (input: number): boolean => {
  return Math.abs(input) > 0 && Math.abs(input) <= 100
}

export const accountReputation = (input: string | number): number => {
  if (typeof input === "number" && isHumanReadable(input)) {
    return Math.floor(input)
  }

  if (typeof input === "string") {
    input = Number(input)

    if (isHumanReadable(input)) {
      return Math.floor(input)
    }
  }

  if (input === 0) {
    return 25
  }

  let neg = false

  if (input < 0) neg = true

  let reputationLevel = Math.log10(Math.abs(input))
  reputationLevel = Math.max(reputationLevel - 9, 0)

  if (reputationLevel < 0) reputationLevel = 0

  if (neg) reputationLevel *= -1

  reputationLevel = reputationLevel * 9 + 25

  return Math.floor(reputationLevel)
}

export const getHivePower = (
  totalHive,
  totalVests,
  vesting_shares,
  delegated_vesting_shares,
  received_vesting_shares
) => {
  const hive = new Big(vesting_shares)
    .minus(new Big(delegated_vesting_shares))
    .plus(new Big(received_vesting_shares))
  const hiveDividedByVests = new Big(totalVests).div(new Big(totalHive))
  return hive.div(hiveDividedByVests).toFixed(0)
}

export const numberWithCommas = (x) =>
  String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ",")

export function extractBodySummary(body, stripQuotes = false) {
  let desc = body

  if (stripQuotes) desc = desc.replace(/(^(\n|\r|\s)*)>([\s\S]*?).*\s*/g, "")
  desc = remarkableStripper.render(desc) // render markdown to html
  desc = sanitize(desc, { allowedTags: [] }) // remove all html, leaving text
  desc = htmlDecode(desc)

  // Strip any raw URLs from preview text
  desc = desc.replace(/https?:\/\/[^\s]+/g, "")

  // Grab only the first line (not working as expected. does rendering/sanitizing strip newlines?)
  // eslint-disable-next-line prefer-destructuring
  desc = desc.trim().split("\n")[0]

  if (desc.length > 200) {
    desc = desc.substring(0, 200).trim()

    // Truncate, remove the last (likely partial) word (along with random punctuation), and add ellipses
    desc = desc
      .substring(0, 180)
      .trim()
      .replace(/[,!?]?\s+[^\s]+$/, "…")
  }

  return desc
}

export function getPostSummary(jsonMetadata, body, stripQuotes = false) {
  const shortDescription = jsonMetadata?.description

  if (!shortDescription) {
    return extractBodySummary(body, stripQuotes)
  }

  return shortDescription
}

export const htmlDecode = (txt) =>
  txt.replace(/&[a-z]+;/g, (ch) => {
    const char = htmlCharMap[ch.substring(1, ch.length - 1)]
    return char ? char : ch
  })

const htmlCharMap = {
  amp: "&",
  quot: '"',
  lsquo: "‘",
  rsquo: "’",
  sbquo: "‚",
  ldquo: "“",
  rdquo: "”",
  bdquo: "„",
  hearts: "♥",
  trade: "™",
  hellip: "…",
  pound: "£",
  copy: "",
}
