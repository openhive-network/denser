import { ClassValue, clsx } from "clsx"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime.js"
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
