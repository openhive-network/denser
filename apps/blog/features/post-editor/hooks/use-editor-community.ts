"use client";

import { useQuery } from "@tanstack/react-query";
import { getCommunity } from "@transaction/lib/bridge-api";
import { isCommunity } from "@ui/lib/utils";

/**
 * The community the editor posts into, named by `category`. Disabled unless
 * `category` is a community.
 */
export function useEditorCommunity(category: string, observer: string) {
  return useQuery({
    queryKey: ["community", category, observer],
    queryFn: () => getCommunity(category, observer),
    enabled: isCommunity(category),
    refetchOnWindowFocus: false,
  });
}
