import { useQuery } from "@tanstack/react-query"

import {
  getAccountFull,
  getAccounts,
  getDynamicGlobalProperties,
} from "@/lib/hive"

export function useGetDynamicGlobalProperties() {
  return useQuery(["dynamicGlobalData"], () => getDynamicGlobalProperties())
}

export function useGetAccountFull(username: string, enabled) {
  return useQuery(["profileData", username], () => getAccountFull(username), enabled)
}

export function useGetAccounts(username: string, enabled) {
  return useQuery(["accountData", username], () => getAccounts([username]), enabled)
}
