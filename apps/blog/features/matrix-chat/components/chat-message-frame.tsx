import type { ReactNode } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import type { ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';
import { formatMessageTime } from '@/blog/features/matrix-chat/lib/chat-time';
import { useAvatarUrl } from '@/blog/features/matrix-chat/hooks/use-avatar-url';

function SenderAvatar({ session, mxc, name }: { session: ChatSession; mxc: string | null; name: string }) {
  const url = useAvatarUrl(session, mxc);
  if (url) {
    // An object URL of the homeserver's thumbnail, which next/image cannot load
    return <img src={url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase text-muted-foreground"
    >
      {name.replace(/^@/, '').charAt(0)}
    </span>
  );
}

interface ChatMessageFrameProps {
  session: ChatSession;
  senderId: string;
  senderName: string;
  avatarMxc: string | null;
  timestamp: number;
  children: ReactNode;
}

/** A message's avatar and header (who sent it, and when, in the blog's language), then `children` */
export function ChatMessageFrame({ session, senderId, senderName, avatarMxc, timestamp, children }: ChatMessageFrameProps) {
  const { i18n } = useTranslation('common_blog');
  return (
    <>
      <SenderAvatar session={session} mxc={avatarMxc} name={senderName} />
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-semibold" title={senderId}>
            {senderName}
          </span>
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={new Date(timestamp).toISOString()}>
            {formatMessageTime(timestamp, i18n.language)}
          </time>
        </div>
        {children}
      </div>
    </>
  );
}
