'use client';

import { createContext, useContext, ReactNode } from 'react';

const DeletedPostNoticeContext = createContext<ReactNode>(null);

/** Provides what the post's not-found boundary shows when its author deleted it; `null` for any other post. */
export const DeletedPostNoticeProvider = ({ notice, children }: { notice: ReactNode; children: ReactNode }) => (
  <DeletedPostNoticeContext.Provider value={notice}>{children}</DeletedPostNoticeContext.Provider>
);

/** The deleted post's notice, else `notFound`: a missing post's page. */
export function DeletedPostOrNotFound({ notFound }: { notFound: ReactNode }) {
  const notice = useContext(DeletedPostNoticeContext);
  return <>{notice ?? notFound}</>;
}
