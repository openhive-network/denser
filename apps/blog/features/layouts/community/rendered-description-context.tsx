'use client';

import { createContext, useContext, ReactNode } from 'react';

/** A community description the server rendered (see renderBody's `communityDescription`). */
export interface RenderedCommunityDescription {
  /** the description `html` was rendered from: another one (an edit) is rendered on the client */
  description: string;
  html: string;
}

const RenderedDescriptionContext = createContext<RenderedCommunityDescription | null>(null);

/**
 * Provides the community description the server rendered, so the page shows it without loading
 * the renderer.
 */
export const RenderedCommunityDescriptionProvider = ({
  value,
  children
}: {
  value: RenderedCommunityDescription | null;
  children: ReactNode;
}) => <RenderedDescriptionContext.Provider value={value}>{children}</RenderedDescriptionContext.Provider>;

/** The server-rendered HTML of exactly this description, if there is one. */
export function useServerRenderedDescription(description: string): string | undefined {
  const rendered = useContext(RenderedDescriptionContext);
  return rendered?.description === description ? rendered.html : undefined;
}
