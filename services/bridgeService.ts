import { useQuery } from "@tanstack/react-query"

import {
  getAccountNotifications,
  getAccountPosts,
  getPostsRanked,
  getSubscriptions,
} from "@/lib/bridge"

export function useGetPostsRanked(sort: string) {
  return useQuery(["postsData", sort], () => getPostsRanked(sort))
}

export function useGetSubscriptions(username: string) {
  return useQuery(["listAllSubscription", username], () =>
    getSubscriptions(username)
  )
}

export function useAccountNotifications(username: string) {
  return useQuery(["accountNotification", username], () =>
    getAccountNotifications(username)
  )
}

export function useGetAccountPosts(sort: string, username: string) {
  return useQuery(["accountReplies", username], () =>
    getAccountPosts(sort, username, "hive.blog")
  )
}
