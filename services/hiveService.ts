import { useQuery } from "@tanstack/react-query"

import {
  getAccountFull,
  getAccounts,
  getDynamicGlobalProperties,
} from "@/lib/hive"

export function useGetDynamicGlobalProperties() {
  return useQuery(["dynamicGlobalData"], () => getDynamicGlobalProperties())
}

export function useGetAccountFull(username: string) {
  return useQuery(["profileData", username], () => getAccountFull(username))
}

export function useGetAccounts(username: string) {
  return useQuery(["accountData", username], () => getAccounts([username]))
}
