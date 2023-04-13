import { useQuery } from "@tanstack/react-query"

import {
  getAccountFull,
  getAccounts,
  getDynamicGlobalProperties, getFollowCount, getFollowers
} from "@/lib/hive";

export function useGetDynamicGlobalProperties() {
  return useQuery(["dynamicGlobalData"], () => getDynamicGlobalProperties())
}

export function useGetAccountFull(username: string, enabled) {
  return useQuery(["profileData", username], () => getAccountFull(username), {
    enabled: !!enabled,
  })
}

export function useGetAccounts(username: string, enabled) {
  return useQuery(["accountData", username], () => getAccounts([username]), {
    enabled: !!enabled,
  })
}

export function useGetFollow(username: string, enabled) {
  return useQuery(["followCountData", username], () => getFollowCount(username), {
    enabled: !!enabled,
  })
}
