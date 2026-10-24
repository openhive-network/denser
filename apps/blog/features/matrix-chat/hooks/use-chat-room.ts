import { useMemo, useState } from 'react';
import type { ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';
import { createBackPaginator, INITIAL_BACK_PAGINATION } from '@/blog/features/matrix-chat/lib/back-pagination';
import { useChatSessionVersion } from '@/blog/features/matrix-chat/hooks/use-chat-session-version';

/** The messages of a room, kept live, and loading of older ones. Mount it per room. */
export function useChatRoom(session: ChatSession, roomId: string) {
  useChatSessionVersion(session);
  const [pagination, setPagination] = useState(INITIAL_BACK_PAGINATION);
  const paginator = useMemo(
    () => createBackPaginator(() => session.paginateBack(roomId), setPagination),
    [session, roomId]
  );
  return { messages: session.messages(roomId), pagination, loadOlder: paginator.load };
}
