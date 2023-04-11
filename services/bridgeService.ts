import { useQuery } from "@tanstack/react-query"

import {
  getAccountNotifications,
  getAccountPosts,
  getCommunities,
  getCommunity,
  getPost,
  getPostsRanked,
  getSubscriptions,
} from "@/lib/bridge"

export function useGetPostsRanked(sort: string, tag = "") {
  return useQuery(["postsData", sort, tag], () => getPostsRanked(sort, tag))
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

export function useGetAccountPosts(sort: string, username: string, enabled) {
  return useQuery(
    ["accountReplies", username, sort],
    () => getAccountPosts(sort, username, "hive.blog"),
    { enabled: !!enabled }
  )
}

export function useGetCommunities(sort = "rank", query = null) {
  return useQuery(["communitiesList", sort, query], () =>
    getCommunities(sort, query)
  )
}

export function useGetCommunity(name, observer = "hive.blog", enabled) {
  return useQuery(
    ["community", name, observer],
    () => getCommunity(name, observer),
    { enabled: !!enabled }
  )
}

export function useGetPost(author, permlink, observer = "calcifero") {
  return useQuery(["getPost"], () => getPost(author, permlink, observer))
}
