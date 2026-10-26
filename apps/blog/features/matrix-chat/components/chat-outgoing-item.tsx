import { Button } from '@ui/components/button';
import { useTranslation } from '@/blog/i18n/client';
import type { ChatSession } from '@/blog/features/matrix-chat/lib/chat-view-types';
import type { OutgoingMessage } from '@/blog/features/matrix-chat/lib/outbox';
import { ChatMessageFrame } from '@/blog/features/matrix-chat/components/chat-message-frame';

interface ChatOutgoingItemProps {
  session: ChatSession;
  message: OutgoingMessage;
  retry: (message: OutgoingMessage) => void;
}

/** A message the composer is sending, or failed to: headed like a sent one, with its state under it */
export function ChatOutgoingItem({ session, message, retry }: ChatOutgoingItemProps) {
  const { t } = useTranslation('common_blog');
  const sender = session.ownSender(message.roomId);
  return (
    <li className="flex gap-2 px-2 py-1.5" data-testid="chat-outgoing" data-status={message.status}>
      <ChatMessageFrame
        session={session}
        senderId={session.userId}
        senderName={sender.name}
        avatarMxc={sender.avatarMxc}
        timestamp={message.createdAt}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        {message.status === 'failed' ? (
          <p className="flex items-center gap-2 text-xs text-destructive" role="alert">
            {t('chat_widget.send_failed')}
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => retry(message)}>
              {t('chat_widget.retry')}
            </Button>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{t('chat_widget.sending')}</p>
        )}
      </ChatMessageFrame>
    </li>
  );
}
