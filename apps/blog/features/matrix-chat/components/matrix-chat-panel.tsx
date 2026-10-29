'use client';

import { useEffect, useState } from 'react';
import { Button } from '@ui/components/button';
import { useTranslation } from '@/blog/i18n/client';
import type { ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';
import type { ChatSessionStatus } from '@/blog/features/matrix-chat/hooks/use-matrix-chat-session';
import { pendingInRoom } from '@/blog/features/matrix-chat/lib/outbox';
import { useChatRoom } from '@/blog/features/matrix-chat/hooks/use-chat-room';
import { useChatSessionVersion } from '@/blog/features/matrix-chat/hooks/use-chat-session-version';
import { useOutbox } from '@/blog/features/matrix-chat/hooks/use-outbox';
import { ChatRoomList } from '@/blog/features/matrix-chat/components/chat-room-list';
import { ChatTimeline } from '@/blog/features/matrix-chat/components/chat-timeline';
import { ChatComposer } from '@/blog/features/matrix-chat/components/chat-composer';
import { ChatPlaceholder } from '@/blog/features/matrix-chat/components/chat-placeholder';

interface MatrixChatPanelProps {
  status: ChatSessionStatus;
  session: ChatSession | null;
  retry: () => void;
  /** Whether the drawer is open: the shown room is marked read only then */
  open: boolean;
  /** Element, for everything the drawer does not do */
  appUrl: string;
}

interface ChatRoomProps {
  session: ChatSession;
  roomId: string;
  open: boolean;
  appUrl: string;
  outbox: ReturnType<typeof useOutbox>;
}

function ChatRoom({ session, roomId, open, appUrl, outbox }: ChatRoomProps) {
  const { messages, pagination, loadOlder } = useChatRoom(session, roomId);
  const latestId = messages.at(-1)?.eventId;

  useEffect(() => {
    if (!open || !latestId) return;
    const markReadWhenVisible = () => {
      if (document.visibilityState === 'visible') session.markRead(roomId);
    };
    markReadWhenVisible();
    document.addEventListener('visibilitychange', markReadWhenVisible);
    return () => document.removeEventListener('visibilitychange', markReadWhenVisible);
  }, [session, roomId, open, latestId]);

  const shownIds = new Set(messages.map((message) => message.eventId));
  return (
    <>
      <ChatTimeline
        session={session}
        messages={messages}
        pending={pendingInRoom(outbox.outbox, roomId, shownIds)}
        pagination={pagination}
        loadOlder={loadOlder}
        retry={outbox.retry}
        appUrl={appUrl}
      />
      <ChatComposer onSend={(text) => outbox.send(roomId, text)} />
    </>
  );
}

function SignedInChat({ session, open, appUrl }: { session: ChatSession; open: boolean; appUrl: string }) {
  const { t } = useTranslation('common_blog');
  useChatSessionVersion(session);
  const outbox = useOutbox(session);
  const rooms = session.rooms();
  const [chosenRoomId, setChosenRoomId] = useState<string | null>(null);
  const roomId = rooms.find((room) => room.roomId === chosenRoomId)?.roomId ?? session.defaultRoomId() ?? rooms[0]?.roomId;
  const room = rooms.find((candidate) => candidate.roomId === roomId);

  if (!room) return <p className="p-4 text-sm text-muted-foreground">{t('chat_widget.no_rooms')}</p>;
  return (
    <>
      <ChatRoomList rooms={rooms} selectedRoomId={room.roomId} onSelect={setChosenRoomId} />
      {room.encrypted ? (
        <div className="p-4">
          <ChatPlaceholder text={t('chat_widget.encrypted_room')} appUrl={appUrl} />
        </div>
      ) : (
        <ChatRoom key={room.roomId} session={session} roomId={room.roomId} open={open} appUrl={appUrl} outbox={outbox} />
      )}
    </>
  );
}

/** The native chat client in the drawer: its sign-in state, then the rooms and the shown room. */
export default function MatrixChatPanel({ status, session, retry, open, appUrl }: MatrixChatPanelProps) {
  const { t } = useTranslation('common_blog');
  if (session) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground" data-testid="matrix-chat-panel">
        <SignedInChat session={session} open={open} appUrl={appUrl} />
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="flex flex-1 flex-col items-start gap-2 p-4 text-sm" role="alert">
        <p>{t('chat_widget.sign_in_failed')}</p>
        <Button size="sm" variant="outline" onClick={retry}>
          {t('chat_widget.retry')}
        </Button>
        {appUrl ? (
          <a href={appUrl} target="_blank" rel="noopener noreferrer" className="text-destructive underline">
            {t('chat_widget.open_full_chat')}
          </a>
        ) : null}
      </div>
    );
  }
  return (
    <p className="flex-1 p-4 text-sm text-muted-foreground" role="status">
      {t('chat_widget.connecting')}
    </p>
  );
}
