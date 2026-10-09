"use client";

import { useQuery } from "@tanstack/react-query";
import { getCommunity } from "@transaction/lib/bridge-api";
import { isCommunity } from "@ui/lib/utils";

/**
 * Community the editor posts into: the `category` URL param, falling back to
 * the stored draft's category. Disabled unless one of them is a community.
 */
export function useEditorCommunity(categoryParam: string | undefined, storedCategory: string, observer: string) {
  return useQuery({
    queryKey: ["community", categoryParam, observer],
    queryFn: () => getCommunity(categoryParam ?? storedCategory, observer),
    enabled: isCommunity(categoryParam) || isCommunity(storedCategory),
    refetchOnWindowFocus: false,
  });
}
