import { useEffect, useState } from 'react';
import type { ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';

/** The thumbnail of an `mxc://` avatar as an object URL, null until loaded or for none */
export function useAvatarUrl(session: ChatSession, mxc: string | null): string | null {
  const [loaded, setLoaded] = useState<{ mxc: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!mxc) return;
    let current = true;
    session.avatarUrl(mxc).then((url) => {
      if (current) setLoaded({ mxc, url });
    });
    return () => {
      current = false;
    };
  }, [session, mxc]);
  return loaded && loaded.mxc === mxc ? loaded.url : null;
}
