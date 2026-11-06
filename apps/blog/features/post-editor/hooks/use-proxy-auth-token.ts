"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLogger } from "@ui/lib/logging";
import { configuredImagesEndpoint } from "@ui/config/public-vars";
import { useUserClient } from "@smart-signer/lib/auth/use-user-client";
import { useSignerContext } from "@smart-signer/components/signer-provider";
import type { LoadSigner } from "@smart-signer/lib/use-lazy-signer";
import { collectExternalImageUrls, needsProxyAuth } from "@/blog/features/post-editor/lib/proxy-auth";

const logger = getLogger("app");

// The image proxy issues a token for 30 minutes
const TOKEN_REUSE_MS = 25 * 60 * 1000;

// Per account for the page's lifetime, so another edit session reuses the token instead of asking for a signature
const tokenCache = new Map<string, { token: string; obtainedAt: number }>();

function freshCachedToken(username: string): string | undefined {
  const cached = tokenCache.get(username);
  return cached && Date.now() - cached.obtainedAt < TOKEN_REUSE_MS ? cached.token : undefined;
}

/** Signs the proxy's challenge and exchanges it for a token; undefined when declined or refused. */
async function requestProxyAuthToken(loadSigner: LoadSigner, username: string): Promise<string | undefined> {
  try {
    const signer = await loadSigner();
    const timestamp = Date.now();
    const imageOwner = signer.authorityUsername || signer.username;
    const message = `Authorize image proxy preview for ${imageOwner} at ${new Date(timestamp).toISOString()}`;
    const sig = await signer.signChallenge({ message, password: "" });
    const baseUrl = configuredImagesEndpoint.replace(/\/+$/, "");
    const resp = await fetch(`${baseUrl}/proxy-auth/${imageOwner}/${sig}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timestamp }),
    });
    if (!resp.ok) {
      logger.error("Failed to obtain proxy auth token: %s", resp.status);
      return undefined;
    }
    const data = await resp.json();
    tokenCache.set(username, { token: data.token, obtainedAt: Date.now() });
    return data.token;
  } catch (error) {
    // The preview then shows the images the proxy serves without a token
    logger.error("Error obtaining proxy auth token: %o", error);
    return undefined;
  }
}

/**
 * The token that lets the editor preview proxy external images the published post does not
 * have. Asks for a signature only for such an image, at most once per edit session when
 * declined, and reuses an account's token across sessions.
 *
 * `settleProxyAuth` resolves once no token request is pending; it never rejects.
 */
export function useProxyAuthToken({ content, publishedBody }: { content?: string; publishedBody?: string }) {
  const { user } = useUserClient();
  const { loadSigner } = useSignerContext();
  const username = user.isLoggedIn ? user.username : "";
  const [proxyAuthToken, setProxyAuthToken] = useState(() => freshCachedToken(username));
  const pendingRef = useRef<Promise<void> | undefined>(undefined);
  const declinedRef = useRef(false);

  const publishedImages = useMemo(
    () => new Set(publishedBody ? collectExternalImageUrls(publishedBody, configuredImagesEndpoint) : []),
    [publishedBody]
  );

  useEffect(() => {
    if (!username || !content || pendingRef.current || declinedRef.current) return;
    if (!needsProxyAuth(content, configuredImagesEndpoint, publishedImages)) return;
    const cached = freshCachedToken(username);
    if (cached) {
      setProxyAuthToken(cached);
      return;
    }
    pendingRef.current = requestProxyAuthToken(loadSigner, username)
      .then((token) => {
        if (token) setProxyAuthToken(token);
        else declinedRef.current = true;
      })
      .finally(() => {
        pendingRef.current = undefined;
      });
  }, [content, username, publishedImages, loadSigner]);

  const settleProxyAuth = useCallback(() => pendingRef.current ?? Promise.resolve(), []);

  return { proxyAuthToken, settleProxyAuth };
}
