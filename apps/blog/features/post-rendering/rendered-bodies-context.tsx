'use client';

import { createContext, useContext, ReactNode } from 'react';

/** Server-rendered HTML of one post or comment body, keyed by `author/permlink`. */
export interface RenderedBody {
  /** the markdown `html` was rendered from: a newer body (an edit) is rendered on the client */
  body: string;
  mainPost: boolean;
  html: string;
}

export type RenderedBodies = Record<string, RenderedBody>;

const RenderedBodiesContext = createContext<RenderedBodies>({});

/**
 * Provides the bodies the server rendered, so hydration reuses their HTML instead of loading
 * the renderer and rendering them again.
 */
export const RenderedBodiesProvider = ({ value, children }: { value: RenderedBodies; children: ReactNode }) => (
  <RenderedBodiesContext.Provider value={value}>{children}</RenderedBodiesContext.Provider>
);

/** The server-rendered HTML of this exact body, if there is one. */
export function useServerRenderedBody(
  author: string,
  permlink: string | undefined,
  body: string,
  mainPost: boolean
): string | undefined {
  const rendered = useContext(RenderedBodiesContext)[`${author}/${permlink}`];
  return rendered && rendered.body === body && rendered.mainPost === mainPost ? rendered.html : undefined;
}
